'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { format, isPast, formatDistanceToNow } from 'date-fns'

// ── Types ─────────────────────────────────────────────────────────────────────
interface Exam {
  id: string
  title: string
  subject: string
  scheduled_date: string
  status: 'scheduled' | 'in_progress' | 'completed'
  total_marks: number
  obtained_marks: number | null
}
interface Profile { full_name: string | null; face_enrolled: boolean }

// ── Countdown Timer ───────────────────────────────────────────────────────────
// T2-D: precise hh:mm:ss countdown instead of approximate "in X minutes"
function Countdown({ scheduled_date }: { scheduled_date: string }) {
  const [label, setLabel] = useState('')

  useEffect(() => {
    function update() {
      const d = new Date(scheduled_date)
      if (isPast(d)) { setLabel('Ready to start'); return }
      const diff = d.getTime() - Date.now()
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      if (h > 0) {
        setLabel(`${h}h ${String(m).padStart(2,'0')}m`)
      } else {
        setLabel(`${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`)
      }
    }
    update()
    // T2-D: tick every second so countdown is live
    const t = setInterval(update, 1000)
    return () => clearInterval(t)
  }, [scheduled_date])

  return <span style={{ fontVariantNumeric: 'tabular-nums' }}>{label}</span>
}

// ── Status Badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: Exam['status'] }) {
  const cfg = {
    scheduled:   { bg: 'var(--color-primary-highlight)',  color: 'var(--color-primary)',  label: 'Scheduled'   },
    in_progress: { bg: 'var(--color-warning-highlight)',  color: 'var(--color-warning)',  label: 'In Progress' },
    completed:   { bg: 'var(--color-success-highlight)',  color: 'var(--color-success)',  label: 'Completed'   },
  }[status]
  return (
    <span style={{ padding: '3px 10px', borderRadius: 'var(--radius-full)', fontSize: 'var(--text-xs)', fontWeight: 700, background: cfg.bg, color: cfg.color }}>
      {cfg.label}
    </span>
  )
}

// ── Exam Card ─────────────────────────────────────────────────────────────────
function ExamCard({ exam, onStart, onEdit }: { exam: Exam; onStart: (id: string) => void; onEdit: (exam: Exam) => void }) {
  const pct = exam.obtained_marks != null ? Math.round((exam.obtained_marks / exam.total_marks) * 100) : null
  const ready = isPast(new Date(exam.scheduled_date))

  return (
    <div
      style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-5)', boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', transition: 'box-shadow 0.2s', cursor: 'default' }}
      onMouseEnter={e => (e.currentTarget.style.boxShadow = 'var(--shadow-md)')}
      onMouseLeave={e => (e.currentTarget.style.boxShadow = 'var(--shadow-sm)')}
    >
      {/* T2-C: subject big + primary, title small + muted — flipped from original */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div>
          <p style={{ fontSize: 'var(--text-base)', fontWeight: 800, color: 'var(--color-primary)', marginBottom: 2 }}>
            {exam.subject}
          </p>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', lineHeight: 1.4 }}>
            {exam.title}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {/* T2-B: edit pencil button — only on scheduled exams */}
          {exam.status === 'scheduled' && (
            <button
              onClick={() => onEdit(exam)}
              title="Edit scheduled date"
              style={{ width: 28, height: 28, borderRadius: 'var(--radius-md)', background: 'var(--color-surface-offset)', border: '1px solid var(--color-border)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', flexShrink: 0 }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-surface-dynamic)'; e.currentTarget.style.color = 'var(--color-text)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--color-surface-offset)'; e.currentTarget.style.color = 'var(--color-text-muted)' }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
          )}
          <StatusBadge status={exam.status} />
        </div>
      </div>

      {/* Date row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
        {format(new Date(exam.scheduled_date), 'dd MMM yyyy, hh:mm a')}
      </div>

      {/* T2-D: Scheduled → split button: [countdown | Solve It Now] or [Start Exam] when ready */}
      {exam.status === 'scheduled' && (
        !ready ? (
          <div style={{ display: 'flex', borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid var(--color-border)', marginTop: 'auto' }}>
            {/* Left: live countdown — decorative, not clickable */}
            <div style={{ flex: 1, padding: '9px 12px', background: 'var(--color-surface-offset)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', fontWeight: 600 }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
              <Countdown scheduled_date={exam.scheduled_date} />
            </div>
            {/* Divider */}
            <div style={{ width: 1, background: 'var(--color-border)' }} />
            {/* Right: Solve It Now — allows early start */}
            <button
              onClick={() => onStart(exam.id)}
              style={{ padding: '9px 14px', background: 'var(--color-surface-offset)', color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)', fontWeight: 700, border: 'none', cursor: 'pointer', transition: 'background 0.15s, color 0.15s', whiteSpace: 'nowrap' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-primary)'; e.currentTarget.style.color = '#fff' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--color-surface-offset)'; e.currentTarget.style.color = 'var(--color-text-muted)' }}
            >
              Solve It Now
            </button>
          </div>
        ) : (
          // Countdown hit zero → single full-width Start Exam button
          <button
            onClick={() => onStart(exam.id)}
            style={{ width: '100%', padding: '9px', borderRadius: 'var(--radius-lg)', background: 'var(--color-primary)', color: 'var(--color-text-inverse)', fontSize: 'var(--text-sm)', fontWeight: 600, border: 'none', cursor: 'pointer', marginTop: 'auto' }}
          >
            Start Exam
          </button>
        )
      )}

      {exam.status === 'in_progress' && (
        <button
          onClick={() => onStart(exam.id)}
          style={{ width: '100%', padding: '9px', borderRadius: 'var(--radius-lg)', background: 'var(--color-warning)', color: 'var(--color-text-inverse)', fontSize: 'var(--text-sm)', fontWeight: 600, border: 'none', cursor: 'pointer', marginTop: 'auto' }}
        >
          Resume Exam
        </button>
      )}

      {exam.status === 'completed' && (
        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {pct != null && (
            <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>Score</span>
                <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: pct >= 75 ? 'var(--color-success)' : pct >= 50 ? 'var(--color-orange)' : 'var(--color-error)', fontVariantNumeric: 'tabular-nums' }}>
                  {exam.obtained_marks}/{exam.total_marks} ({pct}%)
                </span>
              </div>
              <div style={{ height: 4, borderRadius: 'var(--radius-full)', background: 'var(--color-surface-offset)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, borderRadius: 'var(--radius-full)', background: pct >= 75 ? 'var(--color-success)' : pct >= 50 ? 'var(--color-orange)' : 'var(--color-error)', transition: 'width 0.8s ease' }} />
              </div>
            </div>
          )}
          <button
            onClick={() => onStart(exam.id)}
            style={{ width: '100%', padding: '9px', borderRadius: 'var(--radius-lg)', background: 'var(--color-surface-offset)', color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)', fontWeight: 600, border: '1px solid var(--color-border)', cursor: 'pointer' }}
          >
            View Results
          </button>
        </div>
      )}
    </div>
  )
}

// ── Settings Dropdown ─────────────────────────────────────────────────────────
function SettingsDropdown({ onSignOut }: { onSignOut: () => void }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const stored = document.documentElement.getAttribute('data-theme') as 'light' | 'dark'
    if (stored) setTheme(stored)
    else setTheme(window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
  }, [])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    document.documentElement.setAttribute('data-theme', next)
    setOpen(false)
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ width: 36, height: 36, borderRadius: 'var(--radius-lg)', background: open ? 'var(--color-surface-offset)' : 'transparent', border: '1px solid var(--color-border)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', transition: 'background 0.15s' }}
        aria-label="Settings"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3"/>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
        </svg>
      </button>
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, width: 200, background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-lg)', overflow: 'hidden', zIndex: 100, animation: 'fadeIn 0.15s ease' }}>
          <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}`}</style>
          <button onClick={() => { router.push('/profile'); setOpen(false) }} style={{ width: '100%', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text)', fontSize: 'var(--text-sm)', textAlign: 'left' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-surface-offset)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            Personal Information
          </button>
          <div style={{ height: 1, background: 'var(--color-divider)' }} />
          <button onClick={toggleTheme} style={{ width: '100%', padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text)', fontSize: 'var(--text-sm)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-surface-offset)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {theme === 'dark'
                ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
                : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
              }
              {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            </div>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)', background: 'var(--color-surface-offset)', padding: '2px 6px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
              {theme === 'dark' ? '' : ''}
            </span>
          </button>
          <div style={{ height: 1, background: 'var(--color-divider)' }} />
          <button onClick={onSignOut} style={{ width: '100%', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-error)', fontSize: 'var(--text-sm)', textAlign: 'left' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-error-highlight)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            Sign Out
          </button>
        </div>
      )}
    </div>
  )
}

// ── Enrollment Warning Banner ─────────────────────────────────────────────────
function EnrollmentBanner({ face_enrolled, router }: { face_enrolled: boolean; router: ReturnType<typeof useRouter> }) {
  if (face_enrolled) return null
  return (
    <div style={{ background: 'var(--color-warning-highlight)', border: '1px solid color-mix(in oklch, var(--color-warning) 30%, transparent)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-3) var(--space-4)', marginBottom: 'var(--space-6)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-warning)" strokeWidth="2" strokeLinecap="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-warning)', fontWeight: 600 }}>
          Complete your face enrollment to enable full proctoring.
        </p>
      </div>
      <button onClick={() => router.push('/profile')} style={{ padding: '6px 14px', borderRadius: 'var(--radius-lg)', background: 'var(--color-warning)', color: '#fff', fontSize: 'var(--text-xs)', fontWeight: 700, border: 'none', cursor: 'pointer', flexShrink: 0 }}>
        Complete Setup
      </button>
    </div>
  )
}

// ── Edit Date Modal ────────────────────────────────────────────────────────────
// T2-A + T2-B: Modal to edit the scheduled date+time of an existing exam
function EditDateModal({ exam, onClose, onSave }: { exam: Exam; onClose: () => void; onSave: (id: string, newDate: string) => Promise<void> }) {
  // Pre-fill with exam's current date in datetime-local format (YYYY-MM-DDTHH:mm)
  const toLocal = (iso: string) => {
    const d = new Date(iso)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  }
  const [value, setValue] = useState(toLocal(exam.scheduled_date))
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!value) return
    setSaving(true)
    await onSave(exam.id, new Date(value).toISOString())
    setSaving(false)
    onClose()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'oklch(0 0 0 / 0.45)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-6)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-8)', width: '100%', maxWidth: 400, boxShadow: 'var(--shadow-lg)' }}>
        <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 800, color: 'var(--color-text)', marginBottom: 4 }}>Edit Scheduled Date</h3>
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-5)' }}>
          {exam.subject} — {exam.title}
        </p>

        <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>
          New Date &amp; Time
        </label>
        <input
          type="datetime-local"
          value={value}
          onChange={e => setValue(e.target.value)}
          style={{ width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', background: 'var(--color-surface-2)', color: 'var(--color-text)', fontSize: 'var(--text-sm)', fontFamily: 'inherit', outline: 'none', marginBottom: 'var(--space-6)', colorScheme: 'light dark' } as React.CSSProperties}
          onFocus={e => { e.target.style.borderColor = 'var(--color-primary)'; e.target.style.boxShadow = '0 0 0 3px color-mix(in oklch,var(--color-primary) 15%,transparent)' }}
          onBlur={e  => { e.target.style.borderColor = 'var(--color-border)';   e.target.style.boxShadow = 'none' }}
        />

        <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
          <button onClick={onClose} style={{ flex: 1, padding: '10px', borderRadius: 'var(--radius-lg)', background: 'var(--color-surface-offset)', color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)', fontWeight: 600, border: '1px solid var(--color-border)', cursor: 'pointer' }}>
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving || !value} style={{ flex: 1, padding: '10px', borderRadius: 'var(--radius-lg)', background: 'var(--color-primary)', color: '#fff', fontSize: 'var(--text-sm)', fontWeight: 700, border: 'none', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}>
            {saving ? 'Saving…' : 'Save Date'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const router   = useRouter()
  const supabase = createClient()

  const [exams,      setExams]     = useState<Exam[]>([])
  const [profile,    setProfile]   = useState<Profile>({ full_name: null, face_enrolled: false })
  const [userEmail,  setUserEmail] = useState<string | undefined>()
  const [loading,    setLoading]   = useState(true)
  const [filter,     setFilter]    = useState<'all' | 'scheduled' | 'in_progress' | 'completed'>('all')
  // T2-B: state for edit modal
  const [editingExam, setEditingExam] = useState<Exam | null>(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUserEmail(user.email)

      const [{ data: examsData }, { data: profileData }] = await Promise.all([
        supabase.from('exams').select('id,title,subject,scheduled_date,status,total_marks,obtained_marks').eq('user_id', user.id).order('scheduled_date', { ascending: false }),
        supabase.from('user_profiles').select('full_name,face_enrolled').eq('user_id', user.id).single(),
      ])
      setExams(examsData ?? [])
      if (profileData) setProfile(profileData)
      setLoading(false)
    }
    load()
  }, [])

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  // T2-B: update scheduled_date for an exam in DB + local state
  async function handleSaveDate(examId: string, newDate: string) {
    await supabase.from('exams').update({ scheduled_date: newDate }).eq('id', examId)
    setExams(prev => prev.map(e => e.id === examId ? { ...e, scheduled_date: newDate } : e))
  }

  const filteredExams = filter === 'all' ? exams : exams.filter(e => e.status === filter)
  const greeting = profile.full_name ? `Hello, ${profile.full_name.split(' ')[0]}!` : 'Hello!'

  if (loading) return (
    <div style={{ minHeight: '100dvh', background: 'var(--color-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" style={{ animation: 'spin 1s linear infinite' }}>
        <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
      </svg>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--color-bg)' }}>

      {/* Header */}
      <header style={{ position: 'sticky', top: 0, zIndex: 40, background: 'color-mix(in oklch,var(--color-surface) 95%,transparent)', backdropFilter: 'blur(8px)', borderBottom: '1px solid var(--color-divider)' }}>
        <div style={{ maxWidth: 'var(--content-wide)', margin: '0 auto', padding: '0 var(--space-6)', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-label="MockExam">
              <rect width="28" height="28" rx="8" fill="var(--color-primary)"/>
              <path d="M7 9h14M7 14h10M7 19h7" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <span style={{ fontSize: 'var(--text-base)', fontWeight: 800, color: 'var(--color-text)' }}>MockExam</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)' }} className="hide-mobile">{userEmail}</span>
            <SettingsDropdown onSignOut={handleSignOut} />
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 'var(--content-wide)', margin: '0 auto', padding: 'var(--space-8) var(--space-6)' }}>

        {/* Greeting */}
        <div style={{ marginBottom: 'var(--space-6)' }}>
          <h1 style={{ fontFamily: "'Cabinet Grotesk', 'Satoshi', sans-serif", fontSize: 'var(--text-xl)', fontWeight: 900, color: 'var(--color-text)', marginBottom: 4 }}>
            {greeting}
          </h1>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
            {exams.length === 0
              ? 'No exams scheduled yet. Create your first mock exam below.'
              : `${exams.filter(e => e.status === 'scheduled').length} upcoming · ${exams.filter(e => e.status === 'completed').length} completed`}
          </p>
        </div>

        <EnrollmentBanner face_enrolled={profile.face_enrolled} router={router} />

        {/* Actions row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 'var(--space-6)', flexWrap: 'wrap' }}>
          {/* Filter tabs */}
          <div style={{ display: 'flex', gap: 4, background: 'var(--color-surface-offset)', padding: 4, borderRadius: 'var(--radius-lg)' }}>
            {(['all', 'scheduled', 'in_progress', 'completed'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{ padding: '5px 12px', borderRadius: 'var(--radius-md)', background: filter === f ? 'var(--color-surface)' : 'transparent', color: filter === f ? 'var(--color-text)' : 'var(--color-text-muted)', fontSize: 'var(--text-xs)', fontWeight: filter === f ? 700 : 400, border: filter === f ? '1px solid var(--color-border)' : '1px solid transparent', cursor: 'pointer', transition: 'all 0.15s', boxShadow: filter === f ? 'var(--shadow-sm)' : 'none', textTransform: 'capitalize' }}>
                {f === 'in_progress' ? 'In Progress' : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          <button onClick={() => router.push('/schedule')} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 18px', borderRadius: 'var(--radius-lg)', background: 'var(--color-primary)', color: 'var(--color-text-inverse)', fontSize: 'var(--text-sm)', fontWeight: 700, border: 'none', cursor: 'pointer', boxShadow: 'var(--shadow-sm)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Schedule Exam
          </button>
        </div>

        {/* Exam grid */}
        {filteredExams.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 'var(--space-16) var(--space-8)', color: 'var(--color-text-muted)' }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-faint)" strokeWidth="1.5" strokeLinecap="round" style={{ margin: '0 auto var(--space-4)' }}>
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/>
            </svg>
            <p style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--color-text)', marginBottom: 8 }}>
              {filter === 'all' ? 'No exams yet' : `No ${filter.replace('_', ' ')} exams`}
            </p>
            <p style={{ fontSize: 'var(--text-sm)', marginBottom: 'var(--space-5)' }}>
              {filter === 'all' ? 'Create your first mock exam to get started.' : 'Try a different filter.'}
            </p>
            {filter === 'all' && (
              <button onClick={() => router.push('/schedule')} style={{ padding: '10px 24px', borderRadius: 'var(--radius-lg)', background: 'var(--color-primary)', color: 'var(--color-text-inverse)', fontSize: 'var(--text-sm)', fontWeight: 600, border: 'none', cursor: 'pointer' }}>
                Schedule First Exam
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(300px, 100%), 1fr))', gap: 'var(--space-4)' }}>
            {filteredExams.map(exam => (
              <ExamCard
                key={exam.id}
                exam={exam}
                onStart={id => router.push(`/exam/${id}`)}
                onEdit={setEditingExam}
              />
            ))}
          </div>
        )}
      </main>

      {/* T2-B: Edit date modal — renders when editingExam is set */}
      {editingExam && (
        <EditDateModal
          exam={editingExam}
          onClose={() => setEditingExam(null)}
          onSave={handleSaveDate}
        />
      )}
    </div>
  )
}