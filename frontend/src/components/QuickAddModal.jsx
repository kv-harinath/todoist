import { useState } from 'react'
import { parseQuickAdd } from '../utils/quickAddParser.js'
import { useCreateTask } from '../hooks/useTasks.js'

// A global "Add task" entry point reachable from any page (mirrors the
// reference app's top-of-sidebar Add task button), always adding to the
// Inbox - project-specific quick-add still lives inline on project pages.
export default function QuickAddModal({ onClose }) {
  const [text, setText] = useState('')
  const createTask = useCreateTask()

  function handleSubmit(event) {
    event.preventDefault()
    const trimmed = text.trim()
    if (!trimmed) return
    const { content, dueDate, priority } = parseQuickAdd(trimmed)
    createTask.mutate(
      { content, project_id: null, due_date: dueDate, priority: priority || 4 },
      { onSuccess: onClose },
    )
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <form className="modal-box" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <h2>Add task</h2>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder='Task name - try "tomorrow" or "p1"'
          autoFocus
        />
        <div className="quick-add-hint">Adds to Inbox. Open a project to add tasks there instead.</div>
        <div className="modal-actions">
          <button type="button" className="button-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="button-primary" disabled={createTask.isPending}>
            Add task
          </button>
        </div>
      </form>
    </div>
  )
}
