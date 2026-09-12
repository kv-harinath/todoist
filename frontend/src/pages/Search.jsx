import { useState } from 'react'
import { useSearchTasks } from '../hooks/useTasks.js'
import TaskList from '../components/TaskList.jsx'

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const { data: tasks, isFetching } = useSearchTasks(query)

  return (
    <div className="main-content">
      <div className="page-header">
        <h1>Search</h1>
      </div>
      <div className="quick-add">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search tasks..."
          autoFocus
          style={{
            width: '100%',
            padding: '0.55rem 0.75rem',
            border: '1px solid var(--border)',
            borderRadius: 6,
            background: 'var(--bg-elevated)',
            color: 'var(--text)',
            fontSize: '0.95rem',
          }}
        />
      </div>
      {!query.trim() && <div className="empty-state">Start typing to search your tasks.</div>}
      {query.trim() && isFetching && <div className="empty-state">Searching...</div>}
      {query.trim() && tasks && <TaskList tasks={tasks} emptyMessage="No tasks match your search." />}
    </div>
  )
}
