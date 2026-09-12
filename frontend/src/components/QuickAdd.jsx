import { useState } from 'react'
import { parseQuickAdd } from '../utils/quickAddParser.js'
import { useCreateTask } from '../hooks/useTasks.js'

export default function QuickAdd({ projectId = null, sectionId = null, defaultDueDate = null, placeholder = 'Add a task...' }) {
  const [text, setText] = useState('')
  const createTask = useCreateTask()

  function handleSubmit(event) {
    event.preventDefault()
    const trimmed = text.trim()
    if (!trimmed) return

    const { content, dueDate, priority } = parseQuickAdd(trimmed)
    createTask.mutate({
      content,
      project_id: projectId,
      section_id: sectionId,
      due_date: dueDate || defaultDueDate,
      priority: priority || 4,
    })
    setText('')
  }

  return (
    <div className="quick-add">
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholder}
        />
        <button type="submit" disabled={createTask.isPending}>
          Add
        </button>
      </form>
      <div className="quick-add-hint">
        Try "today", "tomorrow", "next mon", or "p1".."p4" for priority.
      </div>
    </div>
  )
}
