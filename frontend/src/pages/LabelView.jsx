import { useParams } from 'react-router-dom'
import { useLabels } from '../hooks/useLabels.js'
import { useLabelTasks } from '../hooks/useTasks.js'
import TaskList from '../components/TaskList.jsx'

export default function LabelViewPage() {
  const { id } = useParams()
  const { data: labels } = useLabels()
  const { data: tasks, isLoading } = useLabelTasks(id)
  const label = (labels || []).find((l) => l.id === id)

  return (
    <div className="main-content">
      <div className="page-header">
        <h1>
          <span className="dot" style={{ background: label?.color, marginRight: '0.4rem' }} />
          {label?.name || 'Label'}
        </h1>
      </div>
      {isLoading && <div className="empty-state">Loading...</div>}
      {tasks && <TaskList tasks={tasks} emptyMessage="No tasks with this label." />}
    </div>
  )
}
