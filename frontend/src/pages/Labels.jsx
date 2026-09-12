import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useLabels, useCreateLabel, useUpdateLabel, useDeleteLabel } from '../hooks/useLabels.js'

const COLORS = ['#db4c3f', '#eb8909', '#246fe0', '#2f9e44', '#a34dff', '#808080']

export default function LabelsPage() {
  const { data: labels, isLoading } = useLabels()
  const createLabel = useCreateLabel()
  const updateLabel = useUpdateLabel()
  const deleteLabel = useDeleteLabel()
  const [name, setName] = useState('')
  const [color, setColor] = useState(COLORS[0])

  function handleCreate(event) {
    event.preventDefault()
    if (!name.trim()) return
    createLabel.mutate({ name: name.trim(), color })
    setName('')
  }

  function handleDelete(label) {
    if (window.confirm(`Delete label "${label.name}"?`)) {
      deleteLabel.mutate(label.id)
    }
  }

  function handleRename(label) {
    const newName = window.prompt('Rename label', label.name)
    if (newName && newName.trim() && newName.trim() !== label.name) {
      updateLabel.mutate({ id: label.id, data: { name: newName.trim() } })
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

      <form onSubmit={handleCreate} style={{ display: 'flex', gap: '0.5rem', margin: '1rem 0' }}>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New label name"
          style={{
            flex: 1,
            padding: '0.5rem 0.7rem',
            border: '1px solid var(--border)',
            borderRadius: 6,
            background: 'var(--bg-elevated)',
            color: 'var(--text)',
          }}
        />
        {COLORS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setColor(c)}
            className="dot"
            style={{
              background: c,
              width: 22,
              height: 22,
              border: c === color ? '2px solid var(--text)' : '2px solid transparent',
              cursor: 'pointer',
            }}
          />
        ))}
        <button type="submit" className="button-primary">
          Add
        </button>
      </form>

      {isLoading && <div className="empty-state">Loading...</div>}
      {labels && labels.length === 0 && <div className="empty-state">No labels yet.</div>}
      <ul className="task-list">
        {(labels || []).map((label) => (
          <li key={label.id} className="task-row" style={{ cursor: 'default' }}>
            <span className="dot" style={{ background: label.color, marginTop: '0.35rem' }} />
            <div className="task-main">
              <Link to={`/labels/${label.id}`}>{label.name}</Link>
            </div>
            <div className="task-actions" style={{ opacity: 1 }}>
              <button type="button" className="icon-button" onClick={() => handleRename(label)}>
                Rename
              </button>
              <button type="button" className="icon-button" onClick={() => handleDelete(label)}>
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
