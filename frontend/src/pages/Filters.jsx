import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useFilters, useCreateFilter, useDeleteFilter, useUpdateFilter } from '../hooks/useFilters.js'

export default function FiltersPage() {
  const { data: filters, isLoading } = useFilters()
  const createFilter = useCreateFilter()
  const deleteFilter = useDeleteFilter()
  const updateFilter = useUpdateFilter()
  const [name, setName] = useState('')
  const [query, setQuery] = useState('')

  function handleCreate(event) {
    event.preventDefault()
    if (!name.trim() || !query.trim()) return
    createFilter.mutate({ name: name.trim(), query: query.trim(), color: '#246fe0' })
    setName('')
    setQuery('')
  }

  function handleDelete(filter) {
    if (window.confirm(`Delete filter "${filter.name}"?`)) {
      deleteFilter.mutate(filter.id)
    }
  }

  function handleRename(filter) {
    const newName = window.prompt('Rename filter', filter.name)
    if (newName && newName.trim() && newName.trim() !== filter.name) {
      updateFilter.mutate({ id: filter.id, data: { name: newName.trim() } })
    }
  }

  function handleEditQuery(filter) {
    const newQuery = window.prompt('Edit filter query', filter.query)
    if (newQuery && newQuery.trim() && newQuery.trim() !== filter.query) {
      updateFilter.mutate({ id: filter.id, data: { query: newQuery.trim() } })
    }
  }

  return (
    <div className="main-content">
      <div className="page-header">
        <h1>Filters &amp; Labels</h1>
      </div>
      <div className="view-toggle">
        <NavLink to="/filters" className={({ isActive }) => (isActive ? 'active' : '')} end>
          Filters
        </NavLink>
        <NavLink to="/labels" className={({ isActive }) => (isActive ? 'active' : '')}>
          Labels
        </NavLink>
      </div>
      <p className="page-subtitle">
        Combine with <code>&amp;</code> (and), <code>|</code> (or), <code>!</code> (not) and parentheses, e.g.{' '}
        <code>(today | overdue) &amp; p1</code>. Atoms: <code>p1</code>-<code>p4</code>, <code>today</code>,{' '}
        <code>overdue</code>, <code>no date</code>, <code>recurring</code>, <code>#Project</code> (<code>##Project</code> includes sub-projects),{' '}
        <code>%label</code>, <code>search: text</code>, <code>due before: tomorrow</code>.
      </p>

      <form onSubmit={handleCreate} style={{ display: 'flex', gap: '0.5rem', margin: '1rem 0' }}>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Filter name"
          style={{
            flex: 1,
            padding: '0.5rem 0.7rem',
            border: '1px solid var(--border)',
            borderRadius: 6,
            background: 'var(--bg-elevated)',
            color: 'var(--text)',
          }}
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. (today | overdue) & p1"
          style={{
            flex: 1,
            padding: '0.5rem 0.7rem',
            border: '1px solid var(--border)',
            borderRadius: 6,
            background: 'var(--bg-elevated)',
            color: 'var(--text)',
          }}
        />
        <button type="submit" className="button-primary">
          Save filter
        </button>
      </form>

      {isLoading && <div className="empty-state">Loading...</div>}
      {filters && filters.length === 0 && <div className="empty-state">No saved filters yet.</div>}
      <ul className="task-list">
        {(filters || []).map((filter) => (
          <li key={filter.id} className="task-row" style={{ cursor: 'default' }}>
            <span className="dot" style={{ background: filter.color, marginTop: '0.35rem' }} />
            <div className="task-main">
              <Link to={`/filters/${filter.id}`}>{filter.name}</Link>
              <div className="task-meta">
                <span className="badge">{filter.query}</span>
              </div>
              {filter.description && <div className="page-subtitle">{filter.description}</div>}
            </div>
            <div className="task-actions" style={{ opacity: 1 }}>
              <button type="button" className="icon-button" onClick={() => handleEditQuery(filter)}>
                Edit query
              </button>
              <button type="button" className="icon-button" onClick={() => handleRename(filter)}>
                Rename
              </button>
              <button type="button" className="icon-button" onClick={() => handleDelete(filter)}>
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
