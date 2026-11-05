// "Quick add" natural-language parser, modelled on Todoist's Quick Add
// (public marketing/help pages describe natural-language dates,
// recurring dates, #project, @label and priority tokens).
//
// Recognized as whole tokens anywhere in the text and removed from the
// task content once parsed:
//   #Project   /Section   @label   (names end at whitespace)
//   p1 .. p4            priority
//   today | tomorrow | [next] mon..sun | in N days | YYYY-MM-DD | "Mar 5" / "5 Mar"
//   at 3pm | at 15:30   due time
//   every day | weekday | week | month | N days/weeks/months | other week | mon  ("every!" = after completion)
//
// Returns { content, dueDate, dueTime, priority, projectName, sectionName,
// labelNames, recurrenceRule }. Unset fields are null (labelNames is []); the caller
// resolves project/label names to ids.

import { toDateString } from './dates.js'

const WEEKDAYS = {
  sun: 0, sunday: 0,
  mon: 1, monday: 1,
  tue: 2, tues: 2, tuesday: 2,
  wed: 3, wednesday: 3,
  thu: 4, thur: 4, thurs: 4, thursday: 4,
  fri: 5, friday: 5,
  sat: 6, saturday: 6,
}
const WEEKDAY_NAMES = Object.keys(WEEKDAYS).join('|')

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
const MONTH_PATTERN = '(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*'

function nextWeekday(from, targetDow, forceNextWeek) {
  const result = new Date(from)
  let diff = (targetDow - result.getDay() + 7) % 7
  if (diff === 0 && forceNextWeek) diff = 7
  result.setDate(result.getDate() + diff)
  return result
}

function take(text, regex) {
  const match = text.match(regex)
  if (!match) return [null, text]
  return [match, text.replace(match[0], ' ')]
}

function pad(n) {
  return String(n).padStart(2, '0')
}

export function parseQuickAdd(rawText, now = new Date()) {
  let text = ` ${rawText} `
  let dueDate = null
  let dueTime = null
  let priority = null
  let projectName = null
  let sectionName = null
  const labelNames = []
  let recurrenceRule = null
  let match

  ;[match, text] = take(text, /\s#(\S+)/)
  if (match) projectName = match[1]

  ;[match, text] = take(text, /\s\/(\S+)/)
  if (match) sectionName = match[1]

  for (;;) {
    ;[match, text] = take(text, /\s@(\S+)/)
    if (!match) break
    labelNames.push(match[1])
  }

  ;[match, text] = take(text, /\sp([1-4])(?=\s)/i)
  if (match) priority = parseInt(match[1], 10)

  ;[match, text] = take(text, /\sat\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?(?=\s)/i)
  if (match) {
    let hour = parseInt(match[1], 10)
    const minute = match[2] ? parseInt(match[2], 10) : 0
    const meridiem = match[3]?.toLowerCase()
    if (meridiem === 'pm' && hour < 12) hour += 12
    if (meridiem === 'am' && hour === 12) hour = 0
    if (hour <= 23 && minute <= 59) dueTime = `${pad(hour)}:${pad(minute)}`
  }

  // Recurrence first: "every mon" also implies the next Monday as the first due date.
  // Groups: 1 "!" (after completion), 2 N, 3 "other", 4 unit, 5 simple unit, 6 "other " (weekday), 7 weekday
  ;[match, text] = take(
    text,
    new RegExp(
      `\\severy(!)?\\s+(?:(?:(\\d+)|(other))\\s+(day|week|month)s?|(day|weekday|week|month)|(other\\s+)?(${WEEKDAY_NAMES}))(?=\\s)`,
      'i',
    ),
  )
  if (match) {
    const after = match[1] ? '!' : ''
    if (match[4]) {
      const unit = match[4].toLowerCase()
      recurrenceRule = match[3] ? `every${after} other ${unit}` : `every${after} ${match[2]} ${unit}s`
    } else if (match[5]) {
      recurrenceRule = `every${after} ${match[5].toLowerCase()}`
    } else {
      const day = match[7].toLowerCase()
      recurrenceRule = `every ${match[6] ? 'other ' : ''}${day}`
      dueDate = toDateString(nextWeekday(now, WEEKDAYS[day], false))
    }
  }

  if (!dueDate) {
    if ((([match, text] = take(text, /\stoday(?=\s)/i)), match)) {
      dueDate = toDateString(now)
    } else if ((([match, text] = take(text, /\stomorrow(?=\s)/i)), match)) {
      const d = new Date(now)
      d.setDate(d.getDate() + 1)
      dueDate = toDateString(d)
    } else if ((([match, text] = take(text, /\sin\s+(\d+)\s+days?(?=\s)/i)), match)) {
      const d = new Date(now)
      d.setDate(d.getDate() + parseInt(match[1], 10))
      dueDate = toDateString(d)
    } else if ((([match, text] = take(text, /\s(\d{4}-\d{2}-\d{2})(?=\s)/)), match)) {
      dueDate = match[1]
    } else if ((([match, text] = take(text, new RegExp(`\\s${MONTH_PATTERN}\\s+(\\d{1,2})(?=\\s)`, 'i'))), match)) {
      dueDate = monthDay(now, match[1], match[2])
    } else if ((([match, text] = take(text, new RegExp(`\\s(\\d{1,2})\\s+${MONTH_PATTERN}(?=\\s)`, 'i'))), match)) {
      dueDate = monthDay(now, match[2], match[1])
    } else if ((([match, text] = take(text, new RegExp(`\\s(next\\s+)?(${WEEKDAY_NAMES})(?=\\s)`, 'i'))), match)) {
      dueDate = toDateString(nextWeekday(now, WEEKDAYS[match[2].toLowerCase()], Boolean(match[1])))
    }
  }

  // A recurring task with no explicit date starts today.
  if (recurrenceRule && !dueDate) dueDate = toDateString(now)

  const content = text.replace(/\s+/g, ' ').trim()
  return { content, dueDate, dueTime, priority, projectName, sectionName, labelNames, recurrenceRule }
}

function monthDay(now, monthToken, dayToken) {
  const month = MONTHS.indexOf(monthToken.toLowerCase().slice(0, 3))
  const day = parseInt(dayToken, 10)
  let candidate = new Date(now.getFullYear(), month, day)
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  if (candidate < startOfToday) candidate = new Date(now.getFullYear() + 1, month, day)
  return toDateString(candidate)
}
