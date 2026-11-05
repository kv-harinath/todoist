import { useState } from 'react'
import { dueDateStatus, formatDueDate } from '../utils/dates.js'
import { useCompleteTask, useDeleteTask, useReopenTask, useUpdateTask } from '../hooks/useTasks.js'
import TaskEditPanel from './TaskEditPanel.jsx'
import QuickAdd from './QuickAdd.jsx'

// Todoist allows sub-tasks up to 4 levels deep (depth 0 = top level).
const MAX_DEPTH = 3

export default function TaskItem({ task, dragHandlers, childrenOf, depth = 0 }) {
  const subtasks = (childrenOf && childrenOf.get(task.id)) || []
  const [editing, setEditing] = useState(false)
  const [addingSubtask, setAddingSubtask] = useState(false)
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
              {task.due_time ? ` ${task.due_time.slice(0, 5)}` : ''}
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
        {depth < MAX_DEPTH && (
          <button type="button" className="icon-button" onClick={() => setAddingSubtask((v) => !v)}>
            Sub-task
          </button>
        )}
        <button type="button" className="icon-button" onClick={() => setEditing(true)}>
          Edit
        </button>
        <button type="button" className="icon-button" onClick={handleDelete}>
          Delete
        </button>
      </div>
      {(subtasks.length > 0 || addingSubtask) && (
        <div className="subtasks" style={{ flexBasis: '100%', paddingLeft: '1.5rem' }} draggable={false}>
          {subtasks.length > 0 && (
            <ul className="task-list">
              {subtasks.map((child) => (
                <TaskItem key={child.id} task={child} childrenOf={childrenOf} depth={depth + 1} />
              ))}
            </ul>
          )}
          {addingSubtask && (
            <QuickAdd
              projectId={task.project_id}
              sectionId={task.section_id}
              parentTaskId={task.id}
              placeholder="Add a sub-task..."
              showHint={false}
              onCreated={() => setAddingSubtask(false)}
            />
          )}
        </div>
      )}
    </li>
  )
}
