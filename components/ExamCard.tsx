'use client'

import Link from 'next/link'
import CountdownTimer from './CountdownTimer'

export interface Exam {
  id: string
  title: string
  subject: string
  scheduled_date: string
  status: 'scheduled' | 'in_progress' | 'completed'
  total_marks: number
  obtained_marks: number | null
  created_at: string
}

const statusStyles: Record<string, { bg: string; color: string; label: string }> = {
  scheduled:   { bg: 'var(--color-primary-highlight)', color: 'var(--color-primary)',     label: 'Scheduled'   },
  in_progress: { bg: 'var(--color-orange-highlight)',  color: 'var(--color-orange)',      label: 'In Progress' },
  completed:   { bg: 'var(--color-success-highlight)', color: 'var(--color-success)',     label: 'Completed'   },
}

export default function ExamCard({ exam }: { exam: Exam }) {
  const style = statusStyles[exam.status] ?? statusStyles.scheduled
  const canStart = exam.status === 'scheduled' || exam.status === 'in_progress'
  const scorePercent = exam.status === 'completed' && exam.total_marks && exam.obtained_marks != null
    ? Math.round((exam.obtained_marks / exam.total_marks) * 100)
    : null

  return (
    <div style={{
      background: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-xl)',
      padding: 'var(--space-5)',
      boxShadow: 'var(--shadow-sm)',
      display: 'flex', flexDirection: 'column', gap: 'var(--space-3)',
      transition: 'box-shadow 0.2s ease',
    }}
      onMouseEnter={e => (e.currentTarget.style.boxShadow = 'var(--shadow-md)')}
      onMouseLeave={e => (e.currentTarget.style.boxShadow = 'var(--shadow-sm)')}
    >
      {/* Top row — title + status badge */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ flex: 1 }}>
          <p style={{
            fontFamily: "'Cabinet Grotesk', Satoshi, sans-serif",
            fontSize: 'var(--text-base)', fontWeight: 700,
            color: 'var(--color-text)', lineHeight: 1.3,
          }}>
            {exam.title}
          </p>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: 2 }}>
            {exam.subject}
          </p>
        </div>
        <span style={{
          flexShrink: 0,
          padding: '3px 10px',
          borderRadius: 'var(--radius-full)',
          fontSize: 'var(--text-xs)', fontWeight: 600,
          background: style.bg, color: style.color,
        }}>
          {style.label}
        </span>
      </div>

      {/* Date + countdown */}
      <div style={{
        padding: 'var(--space-3)',
        background: 'var(--color-surface-offset)',
        borderRadius: 'var(--radius-lg)',
      }}>
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)', marginBottom: 2 }}>
          {exam.status === 'completed' ? 'Exam date' : 'Scheduled for'}
        </p>
        <p style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text)' }}>
          {new Date(exam.scheduled_date).toLocaleDateString('en-IN', {
            day: 'numeric', month: 'long', year: 'numeric', weekday: 'short',
          })}
        </p>
        {exam.status !== 'completed' && exam.scheduled_date && (
          <CountdownTimer scheduledDate={exam.scheduled_date} status={exam.status} />
        )}
      </div>

      {/* Score (completed only) */}
      {scorePercent !== null && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: 'var(--space-3)',
          background: 'var(--color-success-highlight)',
          borderRadius: 'var(--radius-lg)',
        }}>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-success)', fontWeight: 500 }}>
            Final Score
          </p>
          <p style={{
            fontFamily: 'monospace', fontWeight: 800,
            fontSize: 'var(--text-base)', color: 'var(--color-success)',
          }}>
            {exam.obtained_marks}/{exam.total_marks} ({scorePercent}%)
          </p>
        </div>
      )}

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 8, marginTop: 'var(--space-1)' }}>
        {canStart && (
          <Link href={`/exam/${exam.id}`} style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            padding: '9px 16px',
            borderRadius: 'var(--radius-lg)',
            background: 'var(--color-primary)',
            color: 'var(--color-text-inverse)',
            fontSize: 'var(--text-sm)', fontWeight: 600,
            textDecoration: 'none',
            boxShadow: 'var(--shadow-sm)',
          }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="5 3 19 12 5 21 5 3"/>
            </svg>
            {exam.status === 'in_progress' ? 'Resume Exam' : 'Start Exam'}
          </Link>
        )}
        {exam.status === 'completed' && (
          <Link href={`/exam/${exam.id}/results`} style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            padding: '9px 16px',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--color-border)',
            background: 'none',
            color: 'var(--color-text-muted)',
            fontSize: 'var(--text-sm)', fontWeight: 500,
            textDecoration: 'none',
          }}>
            View Results
          </Link>
        )}
      </div>
    </div>
  )
}