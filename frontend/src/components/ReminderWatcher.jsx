import { useEffect, useRef } from 'react'
import { useDismissReminder, useDueReminders } from '../hooks/useReminders.js'

// Polls for due reminders (every 30s via useDueReminders) and shows an
// in-app toast; also raises a browser Notification once per reminder if
// the user has granted permission. Dismissing marks it done server-side.
export default function ReminderWatcher() {
  const { data: due } = useDueReminders()
  const dismiss = useDismissReminder()
  const notified = useRef(new Set())

  useEffect(() => {
    if (typeof Notification === 'undefined') return
    for (const reminder of due || []) {
      if (notified.current.has(reminder.id)) continue
      notified.current.add(reminder.id)
      if (Notification.permission === 'granted') {
        new Notification('Task reminder', { body: reminder.task_content || 'A task is due' })
      }
    }
  }, [due])

  if (!due || due.length === 0) return null

  return (
    <div className="reminder-toasts" role="status" aria-live="polite">
      {due.map((reminder) => (
        <div key={reminder.id} className="reminder-toast">
          <span>Reminder: {reminder.task_content}</span>
          <button type="button" className="icon-button" onClick={() => dismiss.mutate(reminder.id)}>
            Dismiss
          </button>
        </div>
      ))}
    </div>
  )
}
