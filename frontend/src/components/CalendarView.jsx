import { useState } from 'react'
import { toDateString } from '../utils/dates.js'
import { useUpdateTask } from '../hooks/useTasks.js'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// Month calendar of tasks by due date (Todoist's "Calendar" project
// layout). Tasks can be dragged to another day to reschedule them.
export default function CalendarView({ tasks }) {
  const [cursor, setCursor] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const updateTask = useUpdateTask()

  const gridStart = new Date(cursor)
  gridStart.setDate(1 - cursor.getDay())
  const days = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart)
    d.setDate(gridStart.getDate() + i)
    return d
  })

  const byDate = new Map()
  for (const task of tasks) {
    if (!task.due_date) continue
    const list = byDate.get(task.due_date) || []
    list.push(task)
    byDate.set(task.due_date, list)
  }
  const unscheduled = tasks.filter((t) => !t.due_date)
  const todayKey = toDateString(new Date())

  function shiftMonth(delta) {
    setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + delta, 1))
  }

  function handleDrop(event, dateKey) {
    event.preventDefault()
    const id = event.dataTransfer.getData('text/plain')
    if (id) updateTask.mutate({ id, data: { due_date: dateKey } })
  }

  return (
    <div>
      <div className="calendar-nav">
        <button type="button" className="button-secondary" onClick={() => shiftMonth(-1)} aria-label="Previous month">
          &lt;
        </button>
        <strong>{cursor.toLocaleString('default', { month: 'long', year: 'numeric' })}</strong>
        <button type="button" className="button-secondary" onClick={() => shiftMonth(1)} aria-label="Next month">
          &gt;
        </button>
        <button
          type="button"
          className="button-secondary"
          onClick={() => setCursor(new Date(new Date().getFullYear(), new Date().getMonth(), 1))}
        >
          Today
        </button>
      </div>
      <div className="calendar-grid">
        {WEEKDAYS.map((d) => (
          <div key={d} className="calendar-weekday">
            {d}
          </div>
        ))}
        {days.map((day) => {
          const key = toDateString(day)
          const classes = ['calendar-day']
          if (day.getMonth() !== cursor.getMonth()) classes.push('outside')
          if (key === todayKey) classes.push('today')
          return (
            <div
              key={key}
              className={classes.join(' ')}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleDrop(e, key)}
            >
              <span className="calendar-date">{day.getDate()}</span>
              {(byDate.get(key) || []).map((task) => (
                <span
                  key={task.id}
                  className={`calendar-task p${task.priority}`}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData('text/plain', task.id)}
                  title={task.content}
                >
                  {task.content}
                </span>
              ))}
            </div>
          )
        })}
      </div>
      {unscheduled.length > 0 && (
        <p className="page-subtitle">
          {unscheduled.length} task{unscheduled.length === 1 ? '' : 's'} without a date are not shown in the
          calendar. Drag a task onto a day to schedule it, or use List view.
        </p>
      )}
    </div>
  )
}
