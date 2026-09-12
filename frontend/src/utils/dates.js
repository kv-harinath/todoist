export function todayString() {
  const now = new Date()
  return toDateString(now)
}

export function tomorrowString() {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  return toDateString(tomorrow)
}

export function toDateString(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function dueDateStatus(dueDate) {
  if (!dueDate) return 'none'
  const today = todayString()
  if (dueDate < today) return 'overdue'
  if (dueDate === today) return 'today'
  return 'future'
}

export function formatDueDate(dueDate) {
  if (!dueDate) return ''
  const [y, m, d] = dueDate.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function formatGroupLabel(dueDate) {
  const status = dueDateStatus(dueDate)
  if (status === 'today') return 'Today'
  if (status === 'overdue') return `Overdue - ${formatDueDate(dueDate)}`
  const [y, m, d] = dueDate.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })
}
