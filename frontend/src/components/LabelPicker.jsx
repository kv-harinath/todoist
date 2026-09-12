import { useLabels } from '../hooks/useLabels.js'

export default function LabelPicker({ selectedIds, onChange }) {
  const { data: labels } = useLabels()

  function toggle(id) {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((existing) => existing !== id))
    } else {
      onChange([...selectedIds, id])
    }
  }

  if (!labels || labels.length === 0) {
    return <div className="quick-add-hint">No labels yet - create some on the Labels page.</div>
  }

  return (
    <div className="label-picker">
      {labels.map((label) => (
        <button
          key={label.id}
          type="button"
          className={`label-chip${selectedIds.includes(label.id) ? ' selected' : ''}`}
          style={selectedIds.includes(label.id) ? { background: label.color, borderColor: label.color } : {}}
          onClick={() => toggle(label.id)}
        >
          {label.name}
        </button>
      ))}
    </div>
  )
}
