import { useEffect, useRef, useState } from 'react'
import TaskItem from './TaskItem.jsx'
import { useReorderTask } from '../hooks/useTasks.js'

// Reordering uses plain HTML5 drag-and-drop (draggable + drag events)
// rather than a DnD library, to keep dependencies minimal (plan
// section 3 lists "drag-and-drop reordering" but doesn't mandate a
// specific implementation). Only meaningful where task order isn't
// already implied by something else (due date, filter query), so
// callers opt in with `reorderable` - Inbox and Project views use it,
// Today/Upcoming/Filters don't.
// Sub-tasks (parent_task_id set) render nested under their parent when
// the parent is in the same list; otherwise they show as top-level rows.
function rootTasks(tasks) {
  const ids = new Set((tasks || []).map((t) => t.id))
  return (tasks || []).filter((t) => !t.parent_task_id || !ids.has(t.parent_task_id))
}

export default function TaskList({ tasks, reorderable = false, emptyMessage = 'Nothing here.' }) {
  const roots = rootTasks(tasks)
  const [order, setOrder] = useState(roots)
  const dragIndex = useRef(null)
  const reorderTask = useReorderTask()

  // Re-sync local order whenever the query data changes (new task,
  // completion filtering it out, refetch, ...) - but never mid-drag,
  // so we don't yank the list out from under an in-progress reorder.
  useEffect(() => {
    if (dragIndex.current === null) {
      setOrder(rootTasks(tasks))
    }
  }, [tasks])

  if (!tasks || tasks.length === 0) {
    return <div className="empty-state">{emptyMessage}</div>
  }

  function handleDragStart(index) {
    dragIndex.current = index
  }

  function handleDragOver(index, event) {
    event.preventDefault()
    if (dragIndex.current === null || dragIndex.current === index) return
    const next = [...order]
    const [moved] = next.splice(dragIndex.current, 1)
    next.splice(index, 0, moved)
    dragIndex.current = index
    setOrder(next)
  }

  function handleDrop() {
    dragIndex.current = null
    order.forEach((task, index) => {
      if (task.sort_order !== index) {
        reorderTask.mutate({ id: task.id, sortOrder: index })
      }
    })
  }

  const childrenByParent = new Map()
  for (const task of tasks) {
    if (!task.parent_task_id) continue
    const list = childrenByParent.get(task.parent_task_id) || []
    list.push(task)
    childrenByParent.set(task.parent_task_id, list)
  }

  return (
    <ul className="task-list">
      {order.map((task, index) => (
        <TaskItem
          key={task.id}
          task={task}
          childrenOf={childrenByParent}
          dragHandlers={
            reorderable
              ? {
                  draggable: true,
                  onDragStart: () => handleDragStart(index),
                  onDragOver: (e) => handleDragOver(index, e),
                  onDrop: handleDrop,
                }
              : {}
          }
        />
      ))}
    </ul>
  )
}
