import QuickAdd from './QuickAdd.jsx'

// A global "Add task" entry point reachable from any page (mirrors the
// reference app's top-of-sidebar Add task button). It uses the same
// parser as the inline quick-add, so "#Project", "@label", dates, times
// and recurrence all work here; with no #Project it adds to the Inbox.
export default function QuickAddModal({ onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <h2>Add task</h2>
        <QuickAdd placeholder='Task name - try "call mom tomorrow at 3pm #Home p1"' onCreated={onClose} />
        <div className="modal-actions">
          <button type="button" className="button-secondary" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
