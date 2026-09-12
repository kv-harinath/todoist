import { Routes, Route, Navigate } from 'react-router-dom'
import AppLayout from './components/AppLayout.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import LoginPage from './pages/Login.jsx'
import RegisterPage from './pages/Register.jsx'
import InboxPage from './pages/Inbox.jsx'
import TodayPage from './pages/Today.jsx'
import UpcomingPage from './pages/Upcoming.jsx'
import ProjectPage from './pages/Project.jsx'
import LabelsPage from './pages/Labels.jsx'
import LabelViewPage from './pages/LabelView.jsx'
import FiltersPage from './pages/Filters.jsx'
import FilterViewPage from './pages/FilterView.jsx'
import StatsPage from './pages/Stats.jsx'
import SearchPage from './pages/Search.jsx'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<InboxPage />} />
          <Route path="/today" element={<TodayPage />} />
          <Route path="/upcoming" element={<UpcomingPage />} />
          <Route path="/projects/:id" element={<ProjectPage />} />
          <Route path="/labels" element={<LabelsPage />} />
          <Route path="/labels/:id" element={<LabelViewPage />} />
          <Route path="/filters" element={<FiltersPage />} />
          <Route path="/filters/:id" element={<FilterViewPage />} />
          <Route path="/stats" element={<StatsPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Route>
    </Routes>
  )
}
