import { useInboxTasks } from '../hooks/useTasks.js'
import QuickAdd from '../components/QuickAdd.jsx'
import TaskList from '../components/TaskList.jsx'

export default function InboxPage() {
  const { data: tasks, isLoading, isError } = useInboxTasks()

  return (
    <div className="main-content">
      <div className="page-header">
        <h1>Inbox</h1>
      </div>
      <QuickAdd placeholder="Add a task to Inbox..." />
      {isLoading && <div className="empty-state">Loading...</div>}
      {isError && <div className="empty-state">Could not reach the backend. Is it running?</div>}
      {tasks && <TaskList tasks={tasks} reorderable emptyMessage="Inbox is empty." />}
    </div>
  )
}
