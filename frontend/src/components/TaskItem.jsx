import { useState } from 'react'
import { dueDateStatus, formatDueDate } from '../utils/dates.js'
import { useCompleteTask, useDeleteTask, useReopenTask, useUpdateTask } from '../hooks/useTasks.js'
import TaskEditPanel from './TaskEditPanel.jsx'

export default function TaskItem({ task, dragHandlers }) {
  const [editing, setEditing] = useState(false)
  const completeTask = useCompleteTask()
  const reopenTask = useReopenTask()
  const deleteTask = useDeleteTask()
  const updateTask = useUpdateTask()

  const dueStatus = dueDateStatus(task.due_date)

  function handleToggle() {
    if (task.is_completed) {
      reopenTask.mutate(task.id)
    } else {
      completeTask.mutate(task.id)
    }
  }

  function handleDelete() {
    if (window.confirm(`Delete "${task.content}"?`)) {
      deleteTask.mutate(task.id)
    }
  }

  function handleSave(data) {
    updateTask.mutate({ id: task.id, data }, { onSuccess: () => setEditing(false) })
  }

  if (editing) {
    return (
      <li className="task-row" style={{ cursor: 'default' }}>
        <TaskEditPanel task={task} onSave={handleSave} onCancel={() => setEditing(false)} />
      </li>
    )
  }

  return (
    <li className={`task-row${task.is_completed ? ' completed' : ''}`} {...dragHandlers}>
      <button
        type="button"
        className={`task-checkbox p${task.priority}${task.is_completed ? ' completed' : ''}`}
        onClick={handleToggle}
        aria-label={task.is_completed ? 'Reopen task' : 'Complete task'}
      />
      <div className="task-main" onClick={() => setEditing(true)}>
        <div className="task-content">{task.content}</div>
        <div className="task-meta">
          {task.due_date && (
            <span className={`badge${dueStatus === 'overdue' ? ' overdue' : ''}${dueStatus === 'today' ? ' today' : ''}`}>
              {formatDueDate(task.due_date)}
            </span>
          )}
          {task.is_recurring && <span className="badge recurring">{task.recurrence_rule}</span>}
          {(task.labels || []).map((label) => (
            <span key={label.id} className="badge" style={{ color: label.color }}>
              {label.name}
            </span>
          ))}
        </div>
      </div>
      <div className="task-actions">
        <button type="button" className="icon-button" onClick={() => setEditing(true)}>
          Edit
        </button>
        <button type="button" className="icon-button" onClick={handleDelete}>
          Delete
        </button>
      </div>
    </li>
  )
}
