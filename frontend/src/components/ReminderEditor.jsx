import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client.js'
import { useCreateReminder, useDeleteReminder, useTaskReminders } from '../hooks/useReminders.js'
import { enablePush, isPushEnabledHere, pushSupported } from '../utils/push.js'

// "YYYY-MM-DDTHH:mm" in local time, as <input type="datetime-local"> expects.
function localInputValue(date) {
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function channelLabel(reminder) {
  const parts = ['in-app']
  if (reminder.via_email) parts.push(reminder.email_sent_at ? 'email sent' : 'email')
  if (reminder.via_push) parts.push(reminder.push_sent_at ? 'push sent' : 'push')
  return parts.join(' + ')
}

export default function ReminderEditor({ task }) {
  const { data: reminders } = useTaskReminders(task.id)
  const { data: status } = useQuery({ queryKey: ['push-status'], queryFn: api.pushStatus })
  const createReminder = useCreateReminder()
  const deleteReminder = useDeleteReminder()
  const [viaEmail, setViaEmail] = useState(false)
  const [viaPush, setViaPush] = useState(false)
  const [error, setError] = useState('')
  const [when, setWhen] = useState(() => {
    const soon = new Date(Date.now() + 60 * 60 * 1000)
    soon.setMinutes(0, 0, 0)
    return localInputValue(soon)
  })

  async function handleAdd() {
    if (!when) return
    setError('')
    try {
      if (viaPush && !(await isPushEnabledHere())) await enablePush(status.vapid_public_key)
    } catch (err) {
      setError(err.message)
      return
    }
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission()
    }
    createReminder.mutate({
      task_id: task.id,
      remind_at: new Date(when).toISOString(),
      via_email: viaEmail,
      via_push: viaPush,
    })
  }

  return (
    <div className="reminder-list">
      <strong>Reminders</strong>
      {(reminders || []).map((reminder) => (
        <div key={reminder.id} className="reminder-item">
          <span>
            {new Date(reminder.remind_at).toLocaleString()} ({channelLabel(reminder)})
            {reminder.is_dismissed ? ' (done)' : ''}
          </span>
          <button type="button" className="icon-button" onClick={() => deleteReminder.mutate(reminder.id)}>
            Remove
          </button>
        </div>
      ))}
      <div className="edit-panel-row">
        <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
        <button type="button" className="button-secondary" onClick={handleAdd} disabled={createReminder.isPending}>
          Add reminder
        </button>
      </div>
      <div className="edit-panel-row" style={{ alignItems: 'center' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <input
            type="checkbox"
            style={{ width: 'auto' }}
            checked={viaEmail}
            disabled={!status?.email_enabled}
            onChange={(e) => setViaEmail(e.target.checked)}
          />
          Email{status && !status.email_enabled ? ' (server SMTP not configured)' : ''}
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <input
            type="checkbox"
            style={{ width: 'auto' }}
            checked={viaPush}
            disabled={!status?.push_enabled || !pushSupported()}
            onChange={(e) => setViaPush(e.target.checked)}
          />
          Push{status && !status.push_enabled ? ' (server VAPID keys not configured)' : ''}
        </label>
      </div>
      {error && <div role="alert" style={{ color: 'var(--p1)' }}>{error}</div>}
    </div>
  )
}
