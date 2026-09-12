import { useState } from 'react'

const COLORS = ['#db4c3f', '#eb8909', '#246fe0', '#2f9e44', '#a34dff', '#808080']

export default function ProjectFormModal({ initial, title, onSave, onClose }) {
  const [name, setName] = useState(initial?.name || '')
  const [color, setColor] = useState(initial?.color || COLORS[0])

  function handleSubmit(event) {
    event.preventDefault()
    if (!name.trim()) return
    onSave({ name: name.trim(), color })
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <form className="modal-box" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <h2>{title}</h2>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Project name"
          autoFocus
        />
        <div style={{ display: 'flex', gap: '0.4rem' }}>
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
        </div>
        <div className="modal-actions">
          <button type="button" className="button-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="button-primary">
            Save
          </button>
        </div>
      </form>
    </div>
  )
}
