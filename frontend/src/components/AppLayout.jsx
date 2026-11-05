import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar.jsx'
import ReminderWatcher from './ReminderWatcher.jsx'

export default function AppLayout() {
  return (
    <div className="app-shell">
      <Sidebar />
      <Outlet />
      <ReminderWatcher />
    </div>
  )
}
