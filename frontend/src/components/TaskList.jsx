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
export default function TaskList({ tasks, reorderable = false, emptyMessage = 'Nothing here.' }) {
  const [order, setOrder] = useState(tasks)
  const dragIndex = useRef(null)
  const reorderTask = useReorderTask()

  // Re-sync local order whenever the query data changes (new task,
  // completion filtering it out, refetch, ...) - but never mid-drag,
  // so we don't yank the list out from under an in-progress reorder.
  useEffect(() => {
    if (dragIndex.current === null) {
      setOrder(tasks)
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

  return (
    <ul className="task-list">
      {order.map((task, index) => (
        <TaskItem
          key={task.id}
          task={task}
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
