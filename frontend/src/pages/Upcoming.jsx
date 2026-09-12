import { useUpcomingTasks } from '../hooks/useTasks.js'
import QuickAdd from '../components/QuickAdd.jsx'
import TaskList from '../components/TaskList.jsx'
import { formatGroupLabel, tomorrowString } from '../utils/dates.js'

export default function UpcomingPage() {
  const { data: tasks, isLoading } = useUpcomingTasks(7)

  const groups = new Map()
  for (const task of tasks || []) {
    const key = task.due_date
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(task)
  }
  const orderedKeys = [...groups.keys()].sort()

  return (
    <div className="main-content">
      <div className="page-header">
        <h1>Upcoming</h1>
      </div>
      <p className="page-subtitle">Next 7 days</p>
      <QuickAdd placeholder="Add an upcoming task..." defaultDueDate={tomorrowString()} />
      {isLoading && <div className="empty-state">Loading...</div>}
      {tasks && tasks.length === 0 && <div className="empty-state">Nothing coming up in the next 7 days.</div>}
      {orderedKeys.map((dateKey) => (
        <div key={dateKey}>
          <div className="task-group-title">{formatGroupLabel(dateKey)}</div>
          <TaskList tasks={groups.get(dateKey)} emptyMessage="" />
        </div>
      ))}
    </div>
  )
}
