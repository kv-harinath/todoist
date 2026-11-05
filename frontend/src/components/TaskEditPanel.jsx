import { useState } from 'react'
import PrioritySelector from './PrioritySelector.jsx'
import LabelPicker from './LabelPicker.jsx'
import ReminderEditor from './ReminderEditor.jsx'

const RECURRENCE_PRESETS = [
  'every day', 'every weekday', 'every week', 'every month', 'every other day', 'every other week',
  'every! week', 'every! month', 'every mon', 'every tue', 'every wed', 'every thu', 'every fri',
]

export default function TaskEditPanel({ task, onSave, onCancel }) {
  const [content, setContent] = useState(task.content)
  const [description, setDescription] = useState(task.description || '')
  const [priority, setPriority] = useState(task.priority)
  const [dueDate, setDueDate] = useState(task.due_date || '')
  const [dueTime, setDueTime] = useState((task.due_time || '').slice(0, 5))
  const [isRecurring, setIsRecurring] = useState(task.is_recurring)
  const [recurrenceRule, setRecurrenceRule] = useState(task.recurrence_rule || 'every day')
  const [labelIds, setLabelIds] = useState((task.labels || []).map((l) => l.id))

  function handleSave(event) {
    event.preventDefault()
    if (!content.trim()) return
    onSave({
      content: content.trim(),
      description,
      priority,
      due_date: dueDate || null,
      due_time: dueDate && dueTime ? `${dueTime}:00` : null,
      is_recurring: isRecurring,
      recurrence_rule: isRecurring ? recurrenceRule : null,
      label_ids: labelIds,
    })
  }

  return (
    <form className="edit-panel" onSubmit={handleSave}>
      <input type="text" value={content} onChange={(e) => setContent(e.target.value)} autoFocus />
      <textarea
        placeholder="Description"
        rows={2}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <div className="edit-panel-row">
        <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        <input type="time" value={dueTime} onChange={(e) => setDueTime(e.target.value)} aria-label="Due time" />
        <PrioritySelector value={priority} onChange={setPriority} />
      </div>
      <div className="edit-panel-row" style={{ alignItems: 'center' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
          <input
            type="checkbox"
            checked={isRecurring}
            onChange={(e) => setIsRecurring(e.target.checked)}
            style={{ width: 'auto' }}
          />
          Recurring
        </label>
        {isRecurring && (
          <select value={recurrenceRule} onChange={(e) => setRecurrenceRule(e.target.value)}>
            {!RECURRENCE_PRESETS.includes(recurrenceRule) && <option value={recurrenceRule}>{recurrenceRule}</option>}
            <option value="every day">every day</option>
            <option value="every weekday">every weekday</option>
            <option value="every week">every week</option>
            <option value="every month">every month</option>
            <option value="every other day">every other day</option>
            <option value="every other week">every other week</option>
            <option value="every! week">every! week (after completion)</option>
            <option value="every! month">every! month (after completion)</option>
            <option value="every mon">every mon</option>
            <option value="every tue">every tue</option>
            <option value="every wed">every wed</option>
            <option value="every thu">every thu</option>
            <option value="every fri">every fri</option>
          </select>
        )}
      </div>
      <LabelPicker selectedIds={labelIds} onChange={setLabelIds} />
      <ReminderEditor task={task} />
      <div className="edit-panel-actions">
        <button type="button" className="button-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="button-primary">
          Save
        </button>
      </div>
    </form>
  )
}
