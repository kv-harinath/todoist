import { describe, expect, it } from 'vitest'
import { parseQuickAdd } from './quickAddParser.js'

// Monday 2026-10-26 (local time)
const NOW = new Date(2026, 9, 26, 9, 0, 0)

describe('parseQuickAdd', () => {
  it('extracts #project, @labels and priority', () => {
    const r = parseQuickAdd('Buy milk #Groceries @errand @home p1', NOW)
    expect(r).toMatchObject({ content: 'Buy milk', projectName: 'Groceries', priority: 1 })
    expect(r.labelNames).toEqual(['errand', 'home'])
  })

  it('parses tomorrow with a time', () => {
    const r = parseQuickAdd('Call mom tomorrow at 3pm', NOW)
    expect(r).toMatchObject({ content: 'Call mom', dueDate: '2026-10-27', dueTime: '15:00' })
  })

  it('parses 24h time and 12am', () => {
    expect(parseQuickAdd('x today at 15:30', NOW).dueTime).toBe('15:30')
    expect(parseQuickAdd('x today at 12am', NOW).dueTime).toBe('00:00')
  })

  it('parses recurrence and implied first date', () => {
    expect(parseQuickAdd('Standup every weekday', NOW)).toMatchObject({
      content: 'Standup',
      recurrenceRule: 'every weekday',
      dueDate: '2026-10-26',
    })
    expect(parseQuickAdd('Gym every fri', NOW)).toMatchObject({ recurrenceRule: 'every fri', dueDate: '2026-10-30' })
    expect(parseQuickAdd('Water plants every 3 days', NOW).recurrenceRule).toBe('every 3 days')
  })

  it('parses relative and absolute dates', () => {
    expect(parseQuickAdd('a in 3 days', NOW).dueDate).toBe('2026-10-29')
    expect(parseQuickAdd('a Nov 5', NOW).dueDate).toBe('2026-11-05')
    expect(parseQuickAdd('a 5 Jan', NOW).dueDate).toBe('2027-01-05')
    expect(parseQuickAdd('a 2026-12-01', NOW).dueDate).toBe('2026-12-01')
    expect(parseQuickAdd('a next mon', NOW).dueDate).toBe('2026-11-02')
  })

  it('leaves plain text alone', () => {
    expect(parseQuickAdd('Write report', NOW)).toMatchObject({
      content: 'Write report',
      dueDate: null,
      priority: null,
      projectName: null,
      labelNames: [],
    })
  })

  it('extracts /section', () => {
    expect(parseQuickAdd('Draft spec #Work /Backlog p2', NOW)).toMatchObject({
      content: 'Draft spec',
      projectName: 'Work',
      sectionName: 'Backlog',
      priority: 2,
    })
  })

  it('does not treat slashes inside words or dates as a section', () => {
    expect(parseQuickAdd('Review and/or merge 5/5', NOW).sectionName).toBeNull()
  })

  it('parses every other / every N weeks / after-completion recurrence', () => {
    expect(parseQuickAdd('Clean every other week', NOW).recurrenceRule).toBe('every other week')
    expect(parseQuickAdd('Report every 2 weeks', NOW).recurrenceRule).toBe('every 2 weeks')
    expect(parseQuickAdd('Water plants every! 3 days', NOW).recurrenceRule).toBe('every! 3 days')
    expect(parseQuickAdd('Sync every other mon', NOW)).toMatchObject({
      recurrenceRule: 'every other mon',
      dueDate: '2026-10-26',
    })
  })
})
