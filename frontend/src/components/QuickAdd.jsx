import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { parseQuickAdd } from '../utils/quickAddParser.js'
import { useCreateTask } from '../hooks/useTasks.js'
import { useProjects } from '../hooks/useProjects.js'
import { useLabels } from '../hooks/useLabels.js'
import { api } from '../api/client.js'

const findByName = (items, name) => (items || []).find((i) => i.name.toLowerCase() === name.toLowerCase())

export default function QuickAdd({
  projectId = null,
  sectionId = null,
  parentTaskId = null,
  defaultDueDate = null,
  placeholder = 'Add a task...',
  showHint = true,
  onCreated,
}) {
  const [text, setText] = useState('')
  const createTask = useCreateTask()
  const queryClient = useQueryClient()
  const { data: projects } = useProjects()
  const { data: labels } = useLabels()

  async function handleSubmit(event) {
    event.preventDefault()
    const trimmed = text.trim()
    if (!trimmed) return

    const parsed = parseQuickAdd(trimmed)
    let content = parsed.content
    let targetProjectId = projectId
    let targetSectionId = sectionId

    if (parsed.projectName) {
      const project = findByName(projects, parsed.projectName)
      if (project) {
        targetProjectId = project.id
        if (project.id !== projectId) targetSectionId = null
      } else {
        content = `${content} #${parsed.projectName}`.trim()
      }
    }

    if (parsed.sectionName) {
      let section = null
      if (targetProjectId) {
        try {
          section = findByName(await api.listSections(targetProjectId), parsed.sectionName)
        } catch {
          // fall through: treated as plain text below
        }
      }
      if (section) targetSectionId = section.id
      else content = `${content} /${parsed.sectionName}`.trim()
    }

    const labelIds = []
    let createdLabel = false
    for (const name of parsed.labelNames) {
      let label = findByName(labels, name)
      if (!label) {
        try {
          label = await api.createLabel({ name })
          createdLabel = true
        } catch {
          continue
        }
      }
      labelIds.push(label.id)
    }
    if (createdLabel) queryClient.invalidateQueries({ queryKey: ['labels'] })

    createTask.mutate({
      content: content || trimmed,
      project_id: targetProjectId,
      section_id: targetSectionId,
      parent_task_id: parentTaskId,
      due_date: parsed.dueDate || defaultDueDate,
      due_time: parsed.dueTime ? `${parsed.dueTime}:00` : null,
      priority: parsed.priority || 4,
      is_recurring: Boolean(parsed.recurrenceRule),
      recurrence_rule: parsed.recurrenceRule,
      label_ids: labelIds,
    }, { onSuccess: onCreated })
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
      {showHint && (
        <div className="quick-add-hint">
          Try "tomorrow at 3pm", "every mon", "in 3 days", "Mar 5", "#Project", "@label", or "p1".."p4".
        </div>
      )}
    </div>
  )
}
