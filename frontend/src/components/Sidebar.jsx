import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useProjects, useCreateProject, useUpdateProject } from '../hooks/useProjects.js'
import { useTheme } from '../store/ThemeContext.jsx'
import { useAuth } from '../store/AuthContext.jsx'
import ProjectFormModal from './ProjectFormModal.jsx'
import QuickAddModal from './QuickAddModal.jsx'
import { InboxIcon, TodayIcon, UpcomingIcon, FiltersIcon, StatsIcon, PlusIcon, SunIcon, MoonIcon, LogoutIcon } from './icons.jsx'

function linkClass({ isActive }) {
  return `sidebar-link${isActive ? ' active' : ''}`
}

function initialOf(nameOrEmail) {
  const source = (nameOrEmail || '').trim()
  return source ? source[0].toUpperCase() : '?'
}

export default function Sidebar() {
  const { data: projects } = useProjects()
  const { theme, toggleTheme } = useTheme()
  const { user, logout } = useAuth()
  const createProject = useCreateProject()
  const updateProject = useUpdateProject()
  const [showNewProject, setShowNewProject] = useState(false)
  const [showQuickAdd, setShowQuickAdd] = useState(false)

  const favorites = (projects || []).filter((p) => p.is_favorite)
  const others = (projects || []).filter((p) => !p.is_favorite)

  function toggleFavorite(project) {
    updateProject.mutate({ id: project.id, data: { is_favorite: !project.is_favorite } })
  }

  return (
    <nav className="sidebar">
      <div className="sidebar-account">
        <span className="avatar">{initialOf(user?.display_name || user?.email)}</span>
        <span className="account-name">{user?.display_name || user?.email || 'Account'}</span>
        <button type="button" className="icon-button" title="Log out" onClick={logout}>
          <LogoutIcon />
        </button>
      </div>

      <button type="button" className="add-task-button" onClick={() => setShowQuickAdd(true)}>
        <PlusIcon /> Add task
      </button>

      <NavLink to="/search" className={linkClass}>
        Search
      </NavLink>
      <NavLink to="/" end className={linkClass}>
        <InboxIcon /> Inbox
      </NavLink>
      <NavLink to="/today" className={linkClass}>
        <TodayIcon /> Today
      </NavLink>
      <NavLink to="/upcoming" className={linkClass}>
        <UpcomingIcon /> Upcoming
      </NavLink>
      <NavLink to="/filters" className={linkClass}>
        <FiltersIcon /> Filters &amp; Labels
      </NavLink>
      <NavLink to="/stats" className={linkClass}>
        <StatsIcon /> Stats
      </NavLink>

      {favorites.length > 0 && (
        <div className="sidebar-section">
          <div className="sidebar-section-title">Favorites</div>
          {favorites.map((project) => (
            <NavLink key={project.id} to={`/projects/${project.id}`} className={linkClass}>
              <span className="dot" style={{ background: project.color }} />
              {project.name}
            </NavLink>
          ))}
        </div>
      )}

      <div className="sidebar-section">
        <div className="sidebar-section-title">
          My Projects
          <button type="button" className="icon-button" onClick={() => setShowNewProject(true)}>
            <PlusIcon />
          </button>
        </div>
        {others.map((project) => (
          <div key={project.id} style={{ display: 'flex', alignItems: 'center' }}>
            <NavLink to={`/projects/${project.id}`} className={linkClass} style={{ flex: 1 }}>
              <span className="dot" style={{ background: project.color }} />
              {project.name}
            </NavLink>
            <button
              type="button"
              className="icon-button"
              title="Toggle favorite"
              onClick={() => toggleFavorite(project)}
            >
              *
            </button>
          </div>
        ))}
        {others.length === 0 && favorites.length === 0 && (
          <div className="quick-add-hint" style={{ padding: '0 0.5rem' }}>
            No projects yet.
          </div>
        )}
      </div>

      <div className="theme-toggle">
        <button type="button" className="sidebar-link" onClick={toggleTheme}>
          {theme === 'light' ? <MoonIcon /> : <SunIcon />}
          {theme === 'light' ? 'Dark theme' : 'Light theme'}
        </button>
      </div>

      {showNewProject && (
        <ProjectFormModal
          title="New project"
          onClose={() => setShowNewProject(false)}
          onSave={(data) => {
            createProject.mutate(data, { onSuccess: () => setShowNewProject(false) })
          }}
        />
      )}

      {showQuickAdd && <QuickAddModal onClose={() => setShowQuickAdd(false)} />}
    </nav>
  )
}
