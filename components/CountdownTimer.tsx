'use client'

import { useEffect, useState } from 'react'
import { isPast, isToday, isTomorrow, format, formatDistanceToNow } from 'date-fns'

interface Props {
  scheduledDate: string
  status: 'scheduled' | 'in_progress' | 'completed'
}

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function getTimeLeft(target: Date): string {
  const diff = target.getTime() - Date.now()
  if (diff <= 0) return '00:00:00'
  const totalSecs = Math.floor(diff / 1000)
  const days    = Math.floor(totalSecs / 86400)
  const hours   = Math.floor((totalSecs % 86400) / 3600)
  const minutes = Math.floor((totalSecs % 3600) / 60)
  const seconds = totalSecs % 60
  if (days > 0) return `${days}d ${pad(hours)}h ${pad(minutes)}m`
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
}

function getLabel(target: Date): string {
  if (isToday(target))    return 'Today'
  if (isTomorrow(target)) return 'Tomorrow'
  return format(target, 'dd MMM yyyy')
}

export default function CountdownTimer({ scheduledDate, status }: Props) {
  if (!scheduledDate || isNaN(new Date(scheduledDate).getTime())) {
    return <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)', marginTop: 4 }}>No date set</p>
  }
  const target = new Date(scheduledDate)
  const [timeLeft, setTimeLeft] = useState(getTimeLeft(target))

  useEffect(() => {
    if (status !== 'scheduled') return
    const id = setInterval(() => setTimeLeft(getTimeLeft(target)), 1000)
    return () => clearInterval(id)
  }, [scheduledDate, status]) // eslint-disable-line

  if (status === 'completed') {
    return (
      <span className="tabular" style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)' }}>
        Completed {formatDistanceToNow(target, { addSuffix: true })}
      </span>
    )
  }

  if (status === 'in_progress') {
    return (
      <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--text-xs)', fontWeight: 500, color: 'var(--color-warning)' }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--color-warning)', animation: 'pulse 1.5s ease-in-out infinite' }} />
        In Progress
      </span>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)' }}>
        {getLabel(target)} · {format(target, 'h:mm a')}
      </span>
      <span
        className="tabular"
        style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-primary)' }}
        aria-label={'Time until exam: ' + timeLeft}
      >
        {isPast(target) ? 'Starting soon…' : timeLeft}
      </span>
    </div>
  )
}