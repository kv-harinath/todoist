import { useStats } from '../hooks/useStats.js'

export default function StatsPage() {
  const { data: stats, isLoading, isError } = useStats()

  return (
    <div className="main-content">
      <div className="page-header">
        <h1>Stats</h1>
      </div>
      <p className="page-subtitle">
        A lightweight version of Todoist's Karma - simple completion counts and a streak, rather than the
        full point system (plan section 2/9).
      </p>
      {isLoading && <div className="empty-state">Loading...</div>}
      {isError && <div className="empty-state">Could not load stats.</div>}
      {stats && (
        <div className="stats-grid">
          <div className="stat-tile">
            <div className="value">{stats.completed_today}</div>
            <div className="label">Completed today</div>
          </div>
          <div className="stat-tile">
            <div className="value">{stats.completed_this_week}</div>
            <div className="label">Completed this week</div>
          </div>
          <div className="stat-tile">
            <div className="value">{stats.streak}</div>
            <div className="label">Day streak</div>
          </div>
        </div>
      )}
    </div>
  )
}
