import { useEffect, useState } from 'react'
import { useStats, useUpdateGoals } from '../hooks/useStats.js'

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function ProgressBar({ value, max }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
  return (
    <div
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      style={{ background: 'var(--hover)', borderRadius: 999, height: 8, overflow: 'hidden' }}
    >
      <div style={{ width: `${pct}%`, height: '100%', background: 'var(--accent)' }} />
    </div>
  )
}

function GoalsForm({ stats }) {
  const updateGoals = useUpdateGoals()
  const [daily, setDaily] = useState(stats.daily_goal)
  const [weekly, setWeekly] = useState(stats.weekly_goal)

  useEffect(() => {
    setDaily(stats.daily_goal)
    setWeekly(stats.weekly_goal)
  }, [stats.daily_goal, stats.weekly_goal])

  function toggleDayOff(day) {
    const next = stats.days_off.includes(day) ? stats.days_off.filter((d) => d !== day) : [...stats.days_off, day]
    updateGoals.mutate({ days_off: next })
  }

  function handleSave(event) {
    event.preventDefault()
    updateGoals.mutate({ daily_goal: Number(daily), weekly_goal: Number(weekly) })
  }

  return (
    <form onSubmit={handleSave} className="edit-panel" style={{ marginTop: '1rem' }}>
      <strong>Goals</strong>
      <div className="edit-panel-row">
        <label>
          Daily goal{' '}
          <input type="number" min="0" max="500" value={daily} onChange={(e) => setDaily(e.target.value)} />
        </label>
        <label>
          Weekly goal{' '}
          <input type="number" min="0" max="3500" value={weekly} onChange={(e) => setWeekly(e.target.value)} />
        </label>
        <button type="submit" className="button-primary" disabled={updateGoals.isPending}>
          Save goals
        </button>
      </div>
      <div className="edit-panel-row" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
        <span>Days off:</span>
        {DAY_LABELS.map((label, day) => (
          <label key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <input
              type="checkbox"
              style={{ width: 'auto' }}
              checked={stats.days_off.includes(day)}
              onChange={() => toggleDayOff(day)}
            />
            {label}
          </label>
        ))}
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginLeft: 'auto' }}>
          <input
            type="checkbox"
            style={{ width: 'auto' }}
            checked={stats.vacation_mode}
            onChange={(e) => updateGoals.mutate({ vacation_mode: e.target.checked })}
          />
          Vacation mode (keeps streaks)
        </label>
      </div>
    </form>
  )
}

export default function StatsPage() {
  const { data: stats, isLoading, isError } = useStats()
  const maxDay = stats ? Math.max(1, ...stats.last_7_days.map((d) => d.count)) : 1

  return (
    <div className="main-content">
      <div className="page-header">
        <h1>Stats</h1>
      </div>
      <p className="page-subtitle">
        Daily and weekly goals, streaks, and a Karma score (1 point per task, +5 per daily goal met, +25 per weekly
        goal met). Completion history is kept even for recurring tasks.
      </p>
      {isLoading && <div className="empty-state">Loading...</div>}
      {isError && <div className="empty-state">Could not load stats.</div>}
      {stats && (
        <>
          <div className="stats-grid">
            <div className="stat-tile">
              <div className="value">{stats.completed_today}</div>
              <div className="label">Completed today</div>
              <ProgressBar value={stats.completed_today} max={stats.daily_goal} />
              <div className="label">Daily goal: {stats.daily_goal}</div>
            </div>
            <div className="stat-tile">
              <div className="value">{stats.completed_this_week}</div>
              <div className="label">Completed this week</div>
              <ProgressBar value={stats.completed_this_week} max={stats.weekly_goal} />
              <div className="label">Weekly goal: {stats.weekly_goal}</div>
            </div>
            <div className="stat-tile">
              <div className="value">{stats.streak}</div>
              <div className="label">Day streak</div>
            </div>
            <div className="stat-tile">
              <div className="value">{stats.daily_goal_streak}</div>
              <div className="label">Daily goal streak (days)</div>
            </div>
            <div className="stat-tile">
              <div className="value">{stats.weekly_goal_streak}</div>
              <div className="label">Weekly goal streak (weeks)</div>
            </div>
            <div className="stat-tile">
              <div className="value">{stats.karma}</div>
              <div className="label">
                Karma - {stats.karma_level}
                {stats.karma_next_level_at ? ` (next level at ${stats.karma_next_level_at})` : ' (max level)'}
              </div>
            </div>
          </div>

          <h2 style={{ marginTop: '1.5rem' }}>Last 7 days</h2>
          <div
            style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end', height: 110 }}
            aria-label="Completions per day"
          >
            {stats.last_7_days.map((day) => (
              <div key={day.date} style={{ flex: 1, textAlign: 'center', fontSize: '0.75rem' }}>
                <div
                  title={`${day.date}: ${day.count}`}
                  style={{
                    height: `${(day.count / maxDay) * 80}px`,
                    minHeight: 2,
                    background:
                      day.count >= stats.daily_goal && stats.daily_goal > 0 ? 'var(--success)' : 'var(--accent)',
                    borderRadius: 4,
                  }}
                />
                <div>{day.count}</div>
                <div style={{ color: 'var(--text-muted)' }}>{day.date.slice(5)}</div>
              </div>
            ))}
          </div>

          <GoalsForm stats={stats} />
        </>
      )}
    </div>
  )
}
