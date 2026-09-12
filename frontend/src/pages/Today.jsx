import { useTodayTasks } from '../hooks/useTasks.js'
import QuickAdd from '../components/QuickAdd.jsx'
import TaskList from '../components/TaskList.jsx'
import { todayString } from '../utils/dates.js'

export default function TodayPage() {
  const { data: tasks, isLoading } = useTodayTasks()

  const overdue = (tasks || []).filter((t) => t.due_date && t.due_date < todayString())
  const dueToday = (tasks || []).filter((t) => t.due_date === todayString())

  return (
    <div className="main-content">
      <div className="page-header">
        <h1>Today</h1>
      </div>
      <QuickAdd placeholder="Add a task due today..." defaultDueDate={todayString()} />
      {isLoading && <div className="empty-state">Loading...</div>}
      {tasks && (
        <>
          {overdue.length > 0 && (
            <>
              <div className="task-group-title">Overdue</div>
              <TaskList tasks={overdue} emptyMessage="" />
            </>
          )}
          <div className="task-group-title">Today</div>
          <TaskList tasks={dueToday} emptyMessage="Nothing due today." />
        </>
      )}
    </div>
  )
}
