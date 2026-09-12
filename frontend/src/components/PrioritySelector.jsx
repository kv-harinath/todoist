const OPTIONS = [1, 2, 3, 4]

export default function PrioritySelector({ value, onChange }) {
  return (
    <div className="priority-selector">
      {OPTIONS.map((p) => (
        <button
          key={p}
          type="button"
          className={`priority-option p${p}${value === p ? ' selected' : ''}`}
          onClick={() => onChange(p)}
        >
          P{p}
        </button>
      ))}
    </div>
  )
}
