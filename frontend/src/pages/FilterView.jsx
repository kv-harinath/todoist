import { useParams } from 'react-router-dom'
import { useFilters } from '../hooks/useFilters.js'
import { useFilterTasks } from '../hooks/useTasks.js'
import TaskList from '../components/TaskList.jsx'

export default function FilterViewPage() {
  const { id } = useParams()
  const { data: filters } = useFilters()
  const { data: tasks, isLoading } = useFilterTasks(id)
  const filter = (filters || []).find((f) => f.id === id)

  return (
    <div className="main-content">
      <div className="page-header">
        <h1>{filter?.name || 'Filter'}</h1>
      </div>
      {filter && <p className="page-subtitle">{filter.query}</p>}
      {isLoading && <div className="empty-state">Loading...</div>}
      {tasks && <TaskList tasks={tasks} emptyMessage="No tasks match this filter." />}
    </div>
  )
}
