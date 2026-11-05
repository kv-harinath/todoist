import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useProject, useDeleteProject, useUpdateProject } from '../hooks/useProjects.js'
import { useSections, useCreateSection, useDeleteSection } from '../hooks/useSections.js'
import { useProjectTasks } from '../hooks/useTasks.js'
import QuickAdd from '../components/QuickAdd.jsx'
import TaskList from '../components/TaskList.jsx'
import CalendarView from '../components/CalendarView.jsx'
import ProjectFormModal from '../components/ProjectFormModal.jsx'

export default function ProjectPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [view, setView] = useState('list')
  const [editingProject, setEditingProject] = useState(false)
  const [newSectionName, setNewSectionName] = useState('')

  const { data: project, isLoading: loadingProject } = useProject(id)
  const { data: sections } = useSections(id)
  const { data: tasks, isLoading: loadingTasks } = useProjectTasks(id)

  const updateProject = useUpdateProject()
  const deleteProject = useDeleteProject()
  const createSection = useCreateSection(id)
  const deleteSection = useDeleteSection(id)

  if (loadingProject || !project) {
    return <div className="main-content">Loading...</div>
  }

  const incompleteTasks = (tasks || []).filter((t) => !t.is_completed)
  const bySectionId = new Map()
  bySectionId.set(null, [])
  for (const section of sections || []) bySectionId.set(section.id, [])
  for (const task of incompleteTasks) {
    const key = bySectionId.has(task.section_id) ? task.section_id : null
    bySectionId.get(key).push(task)
  }

  function handleDeleteProject() {
    if (window.confirm(`Delete project "${project.name}" and all its tasks?`)) {
      deleteProject.mutate(project.id, { onSuccess: () => navigate('/') })
    }
  }

  function handleAddSection(event) {
    event.preventDefault()
    if (!newSectionName.trim()) return
    createSection.mutate({ name: newSectionName.trim() })
    setNewSectionName('')
  }

  const groupsInOrder = [
    ...(sections || []).map((s) => [s.id, s.name]),
    [null, 'No section'],
  ]

  return (
    <div className="main-content">
      <div className="page-header">
        <h1>
          <span className="dot" style={{ background: project.color, marginRight: '0.4rem' }} />
          {project.name}
        </h1>
        <div style={{ display: 'flex', gap: '0.3rem' }}>
          <button
            type="button"
            className="icon-button"
            onClick={() => updateProject.mutate({ id: project.id, data: { is_favorite: !project.is_favorite } })}
          >
            {project.is_favorite ? 'Unfavorite' : 'Favorite'}
          </button>
          <button type="button" className="icon-button" onClick={() => setEditingProject(true)}>
            Rename
          </button>
          <button type="button" className="icon-button" onClick={handleDeleteProject}>
            Delete
          </button>
        </div>
      </div>

      <div className="view-toggle">
        <button type="button" className={view === 'list' ? 'active' : ''} onClick={() => setView('list')}>
          List
        </button>
        <button type="button" className={view === 'board' ? 'active' : ''} onClick={() => setView('board')}>
          Board
        </button>
        <button type="button" className={view === 'calendar' ? 'active' : ''} onClick={() => setView('calendar')}>
          Calendar
        </button>
      </div>

      <QuickAdd projectId={project.id} placeholder={`Add a task to ${project.name}...`} />

      {loadingTasks && <div className="empty-state">Loading tasks...</div>}

      {!loadingTasks && view === 'list' && (
        <>
          {groupsInOrder.map(([sectionId, sectionName]) => {
            const groupTasks = bySectionId.get(sectionId) || []
            if (sectionId === null && groupTasks.length === 0 && (sections || []).length > 0) return null
            return (
              <div key={sectionId || 'none'}>
                <div className="task-group-title" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  {sectionName}
                  {sectionId && (
                    <button
                      type="button"
                      className="icon-button"
                      onClick={() => {
                        if (window.confirm(`Delete section "${sectionName}"? Its tasks move to No section.`)) {
                          deleteSection.mutate(sectionId)
                        }
                      }}
                    >
                      Delete section
                    </button>
                  )}
                </div>
                <TaskList tasks={groupTasks} reorderable emptyMessage="No tasks here." />
              </div>
            )
          })}
          <form onSubmit={handleAddSection} style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              value={newSectionName}
              onChange={(e) => setNewSectionName(e.target.value)}
              placeholder="New section name"
              style={{
                flex: 1,
                padding: '0.4rem 0.6rem',
                border: '1px solid var(--border)',
                borderRadius: 6,
                background: 'var(--bg-elevated)',
                color: 'var(--text)',
              }}
            />
            <button type="submit" className="button-secondary">
              Add section
            </button>
          </form>
        </>
      )}

      {!loadingTasks && view === 'board' && (
        <div className="board-columns">
          {groupsInOrder.map(([sectionId, sectionName]) => (
            <div key={sectionId || 'none'} className="board-column">
              <h3>{sectionName}</h3>
              <TaskList tasks={bySectionId.get(sectionId) || []} emptyMessage="Empty" />
            </div>
          ))}
        </div>
      )}

      {!loadingTasks && view === 'calendar' && <CalendarView tasks={incompleteTasks} />}

      {editingProject && (
        <ProjectFormModal
          title="Rename project"
          initial={project}
          onClose={() => setEditingProject(false)}
          onSave={(data) => updateProject.mutate({ id: project.id, data }, { onSuccess: () => setEditingProject(false) })}
        />
      )}
    </div>
  )
}
