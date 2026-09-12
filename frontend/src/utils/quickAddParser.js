// Stripped-down "quick add" natural-language date/priority parser
// (plan section 8, milestone 6: "detect 'tomorrow', 'next mon' in the
// quick-add box - a stripped-down version of Todoist's parser").
//
// Recognizes, as whole words anywhere in the text, and removes them
// from the task content once parsed:
//   today | tomorrow
//   mon|monday .. sun|sunday, optionally preceded by "next"
//   p1 | p2 | p3 | p4  (priority)
//
// Returns { content, dueDate, priority } where dueDate is a
// YYYY-MM-DD string or null, and priority is 1-4 or null (caller
// decides the default, usually 4).

const WEEKDAYS = {
  sun: 0, sunday: 0,
  mon: 1, monday: 1,
  tue: 2, tues: 2, tuesday: 2,
  wed: 3, wednesday: 3,
  thu: 4, thur: 4, thurs: 4, thursday: 4,
  fri: 5, friday: 5,
  sat: 6, saturday: 6,
}

function toDateString(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function nextWeekday(from, targetDow, forceNextWeek) {
  const result = new Date(from)
  let diff = (targetDow - result.getDay() + 7) % 7
  if (diff === 0) diff = forceNextWeek ? 7 : 0
  else if (forceNextWeek) diff += 0 // "next mon" from a Tuesday just means the coming Monday
  result.setDate(result.getDate() + diff)
  return result
}

export function parseQuickAdd(rawText, now = new Date()) {
  let text = rawText
  let dueDate = null
  let priority = null

  const priorityMatch = text.match(/\bp([1-4])\b/i)
  if (priorityMatch) {
    priority = parseInt(priorityMatch[1], 10)
    text = text.replace(priorityMatch[0], ' ')
  }

  if (/\btoday\b/i.test(text)) {
    dueDate = toDateString(now)
    text = text.replace(/\btoday\b/i, ' ')
  } else if (/\btomorrow\b/i.test(text)) {
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)
    dueDate = toDateString(tomorrow)
    text = text.replace(/\btomorrow\b/i, ' ')
  } else {
    const weekdayMatch = text.match(/\b(next\s+)?(sun|sunday|mon|monday|tue|tues|tuesday|wed|wednesday|thu|thur|thurs|thursday|fri|friday|sat|saturday)\b/i)
    if (weekdayMatch) {
      const forceNextWeek = Boolean(weekdayMatch[1])
      const dow = WEEKDAYS[weekdayMatch[2].toLowerCase()]
      dueDate = toDateString(nextWeekday(now, dow, forceNextWeek))
      text = text.replace(weekdayMatch[0], ' ')
    }
  }

  const content = text.replace(/\s+/g, ' ').trim()
  return { content, dueDate, priority }
}
