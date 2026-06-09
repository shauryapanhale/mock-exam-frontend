'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { addDays, differenceInDays, format, isAfter, startOfDay } from 'date-fns'
import { createClient } from '@/lib/supabase/client'

// ─── Types ────────────────────────────────────────────────────────────────────
interface ScheduledExam {
  date: Date
  title: string
  time: string
}

interface FormatRules {
  subject: string
  maximum_marks: number
  duration_minutes?: number
  sections: Array<{
    section_name: string
    questions_to_attempt: number
    total_questions_given?: number
    marks_per_question: number
  }>
}

// ─── Auto-scheduler ───────────────────────────────────────────────────────────
function autoScheduleDates(studyStart: Date, finalExamDate: Date, count: number, preferredTime: string): Date[] {
  const totalDays = differenceInDays(finalExamDate, studyStart)
  if (totalDays < count) return []
  const interval = Math.floor(totalDays / (count + 1))
  return Array.from({ length: count }, (_, i) => {
    const d = addDays(studyStart, interval * (i + 1))
    const [h, m] = preferredTime.split(':').map(Number)
    d.setHours(h, m, 0, 0)
    return d
  })
}

// ─── Shared UI atoms ──────────────────────────────────────────────────────────
function Label({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--color-text)', marginBottom: 6 }}>
      {children}
    </p>
  )
}

function Hint({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)', marginTop: 4 }}>
      {children}
    </p>
  )
}

function InputField({
  label, hint, type = 'text', value, onChange, min, max, placeholder, required,
}: {
  label: string; hint?: string; type?: string; value: string; placeholder?: string
  onChange: (v: string) => void; min?: string; max?: string; required?: boolean
}) {
  return (
    <div>
      <Label>{label}</Label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        min={min}
        max={max}
        placeholder={placeholder}
        required={required}
        style={{
          width: '100%', padding: '10px 14px',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-border)',
          background: 'var(--color-surface-2)',
          color: 'var(--color-text)',
          fontSize: 'var(--text-base)',
          outline: 'none',
          colorScheme: 'light dark',
        } as React.CSSProperties}
        onFocus={e => {
          e.target.style.borderColor = 'var(--color-primary)'
          e.target.style.boxShadow = '0 0 0 3px color-mix(in oklch, var(--color-primary) 15%, transparent)'
        }}
        onBlur={e => {
          e.target.style.borderColor = 'var(--color-border)'
          e.target.style.boxShadow = 'none'
        }}
      />
      {hint && <Hint>{hint}</Hint>}
    </div>
  )
}

function ErrorBanner({ msg }: { msg: string }) {
  return (
    <div style={{
      padding: '10px 14px', borderRadius: 'var(--radius-md)',
      background: 'var(--color-error-highlight)',
      color: 'var(--color-error)',
      fontSize: 'var(--text-sm)',
      border: '1px solid color-mix(in oklch, var(--color-error) 20%, transparent)',
      marginBottom: 'var(--space-5)',
    }}>
      {msg}
    </div>
  )
}

function SuccessBanner({ msg }: { msg: string }) {
  return (
    <div style={{
      padding: '10px 14px', borderRadius: 'var(--radius-md)',
      background: 'var(--color-success-highlight)',
      color: 'var(--color-success)',
      fontSize: 'var(--text-sm)',
      border: '1px solid color-mix(in oklch, var(--color-success) 20%, transparent)',
      marginBottom: 'var(--space-5)',
    }}>
      {msg}
    </div>
  )
}

function PrimaryBtn({
  children, onClick, disabled, type = 'button', loading,
}: {
  children: React.ReactNode; onClick?: () => void
  disabled?: boolean; type?: 'button' | 'submit'; loading?: boolean
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        padding: '11px 22px',
        borderRadius: 'var(--radius-lg)',
        background: (disabled || loading) ? 'color-mix(in oklch, var(--color-primary) 50%, transparent)' : 'var(--color-primary)',
        color: 'var(--color-text-inverse)',
        fontSize: 'var(--text-sm)', fontWeight: 600,
        border: 'none', cursor: (disabled || loading) ? 'not-allowed' : 'pointer',
        boxShadow: 'var(--shadow-sm)',
        transition: 'background var(--transition-interactive)',
      }}
    >
      {loading && (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2.5" strokeLinecap="round"
          style={{ animation: 'spin 0.8s linear infinite' }}>
          <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
        </svg>
      )}
      {children}
    </button>
  )
}

function GhostBtn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '11px 22px',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--color-border)',
        background: 'none',
        color: 'var(--color-text-muted)',
        fontSize: 'var(--text-sm)', fontWeight: 500,
        cursor: 'pointer',
        transition: 'background var(--transition-interactive), color var(--transition-interactive)',
      }}
      onMouseEnter={e => {
        ;(e.currentTarget as HTMLButtonElement).style.background = 'var(--color-surface-offset)'
        ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--color-text)'
      }}
      onMouseLeave={e => {
        ;(e.currentTarget as HTMLButtonElement).style.background = 'none'
        ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--color-text-muted)'
      }}
    >
      {children}
    </button>
  )
}

// ─── Step indicator ───────────────────────────────────────────────────────────
function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 'var(--space-8)' }}>
      {Array.from({ length: total }, (_, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 28, height: 28,
            borderRadius: 'var(--radius-full)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 'var(--text-xs)', fontWeight: 700,
            background: i <= current ? 'var(--color-primary)' : 'var(--color-surface-offset)',
            color: i <= current ? 'var(--color-text-inverse)' : 'var(--color-text-faint)',
            transition: 'background 0.2s ease',
          }}>
            {i < current ? (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5"/>
              </svg>
            ) : i + 1}
          </div>
          {i < total - 1 && (
            <div style={{
              height: 2, width: 32,
              background: i < current ? 'var(--color-primary)' : 'var(--color-surface-dynamic)',
              borderRadius: 2,
              transition: 'background 0.2s ease',
            }} />
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Step 1: Dates, count, time & notes path ──────────────────────────────────
function Step1({
  studyStart, setStudyStart,
  finalExam, setFinalExam,
  mockCount, setMockCount,
  subject, setSubject,
  examTitle, setExamTitle,
  notesPath, setNotesPath,
  preferredTime, setPreferredTime,
  onNext,
}: {
  studyStart: string; setStudyStart: (v: string) => void
  finalExam: string; setFinalExam: (v: string) => void
  mockCount: string; setMockCount: (v: string) => void
  subject: string; setSubject: (v: string) => void
  examTitle: string; setExamTitle: (v: string) => void
  notesPath: string; setNotesPath: (v: string) => void
  preferredTime: string; setPreferredTime: (v: string) => void
  onNext: () => void
}) {
  const [error, setError] = useState('')
  const today = format(new Date(), 'yyyy-MM-dd')

  function validate() {
    if (!studyStart || !finalExam || !mockCount || !subject || !examTitle || !notesPath) {
      setError('Please fill in all fields.'); return
    }
    const start = new Date(studyStart)
    const end   = new Date(finalExam)
    const count = parseInt(mockCount)
    if (!isAfter(end, start)) {
      setError('Final exam date must be after study start date.'); return
    }
    const days = differenceInDays(end, start)
    if (days < count) {
      setError(`Not enough days (${days}) for ${count} mock exams. Reduce mock count or widen the date range.`); return
    }
    if (count < 1 || count > 10) {
      setError('Mock exam count must be between 1 and 10.'); return
    }
    setError('')
    onNext()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      {error && <ErrorBanner msg={error} />}
      <InputField label="Exam / Subject Title" placeholder="e.g. Physics Board Exam 2026"
        value={examTitle} onChange={setExamTitle} required />
      <InputField label="Subject" placeholder="e.g. Physics"
        value={subject} onChange={setSubject} required />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
        <InputField label="Study Leave Starts" type="date"
          value={studyStart} onChange={setStudyStart} min={today} required />
        <InputField label="Final Exam Date" type="date"
          value={finalExam} onChange={setFinalExam} min={studyStart || today} required />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
        <InputField
          label="Preferred Exam Time"
          type="time"
          value={preferredTime}
          onChange={setPreferredTime}
          hint="All mock exams will be scheduled at this time."
        />
        <InputField label="Number of Mock Exams" type="number" placeholder="e.g. 3"
          value={mockCount} onChange={setMockCount} min="1" max="10"
          hint="MockPrep will evenly space these across your study window." required />
      </div>
      <InputField
        label="Notes Folder Path (on your laptop)"
        placeholder="e.g. C:/Users/Shaurya/Desktop/notes"
        value={notesPath}
        onChange={setNotesPath}
        hint="Absolute path to the folder containing your .pdf / .docx chapter files. FastAPI reads this directly."
        required
      />
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--space-2)' }}>
        <PrimaryBtn onClick={validate}>
          Next — Upload Sample Paper
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </PrimaryBtn>
      </div>
    </div>
  )
}

// ─── Step 2: Upload sample paper → extract format ─────────────────────────────
function Step2({
  formatRules, setFormatRules, onNext, onBack,
}: {
  formatRules: FormatRules | null
  setFormatRules: (r: FormatRules) => void
  onNext: () => void
  onBack: () => void
}) {
  const [file, setFile]       = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [success, setSuccess] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'

  async function handleExtract() {
    if (!file) { setError('Please select a sample paper file.'); return }
    setError(''); setSuccess(''); setLoading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const ocrRes = await fetch(`${backendUrl}/api/ocr`, { method: 'POST', body: formData })
      if (!ocrRes.ok) {
        const err = await ocrRes.json().catch(() => ({}))
        throw new Error(err.error || `OCR failed (${ocrRes.status})`)
      }
      const ocrData = await ocrRes.json()
      const ocrText: string = ocrData.text || ''
      if (!ocrText.trim()) throw new Error('Could not extract text. Try a clearer image or PDF.')

      const fmtRes = await fetch(`${backendUrl}/api/extract-format`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: ocrText }),
      })
      if (!fmtRes.ok) {
        const err = await fmtRes.json().catch(() => ({}))
        throw new Error(err.error || `Format extraction failed (${fmtRes.status})`)
      }
      const fmtData = await fmtRes.json()
      const rules: FormatRules = fmtData.format_rules
      if (!rules || !rules.sections) throw new Error('AI could not parse the exam format. Try a different sample paper.')

      const sanitized: FormatRules = {
        subject:           String(rules.subject || 'Unknown Subject'),
        maximum_marks:     Number(rules.maximum_marks) || 40,
        duration_minutes:  Number(rules.duration_minutes) || 90,
        sections: (rules.sections || []).map((s: Record<string, unknown>) => ({
          section_name:          String(s.section_name || 'Section A'),
          questions_to_attempt:  Number(s.questions_to_attempt) || 8,
          total_questions_given: Number(s.total_questions_given || s.questions_to_attempt) || 10,
          marks_per_question:    Number(s.marks_per_question) || 5,
        })),
      }

      setFormatRules(sanitized)
      setSuccess(`Format extracted! ${sanitized.sections.length} section(s) · ${sanitized.maximum_marks} total marks.`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Is your laptop tunnel running?')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      {error   && <ErrorBanner msg={error} />}
      {success && <SuccessBanner msg={success} />}

      <div>
        <Label>Upload a Previous Year Sample Paper</Label>
        <Hint>JPG, PNG, or PDF · The AI will read the format (sections, marks, question count).</Hint>
        <div
          onClick={() => fileRef.current?.click()}
          style={{
            marginTop: 8,
            border: '2px dashed var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--space-8)',
            textAlign: 'center',
            cursor: 'pointer',
            background: 'var(--color-surface-2)',
            transition: 'border-color 0.2s ease, background 0.2s ease',
          }}
          onMouseEnter={e => {
            ;(e.currentTarget as HTMLDivElement).style.borderColor = 'var(--color-primary)'
            ;(e.currentTarget as HTMLDivElement).style.background = 'var(--color-primary-highlight)'
          }}
          onMouseLeave={e => {
            ;(e.currentTarget as HTMLDivElement).style.borderColor = 'var(--color-border)'
            ;(e.currentTarget as HTMLDivElement).style.background = 'var(--color-surface-2)'
          }}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
            stroke="var(--color-primary)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
            style={{ margin: '0 auto 8px' }}>
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          {file ? (
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-primary)', fontWeight: 500 }}>
              {file.name} ({(file.size / 1024).toFixed(0)} KB)
            </p>
          ) : (
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
              Click to choose file or drag and drop
            </p>
          )}
        </div>
        <input
          ref={fileRef} type="file" accept=".jpg,.jpeg,.png,.pdf"
          style={{ display: 'none' }}
          onChange={e => { if (e.target.files?.[0]) setFile(e.target.files[0]) }}
        />
      </div>

      {formatRules && (
        <div style={{
          padding: 'var(--space-4)', borderRadius: 'var(--radius-lg)',
          background: 'var(--color-surface-offset)', border: '1px solid var(--color-border)',
        }}>
          <p style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--color-text-faint)',
            textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>
            Extracted Format
          </p>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text)', marginBottom: 4 }}>
            <strong>Subject:</strong> {formatRules.subject}
          </p>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text)', marginBottom: 8 }}>
            <strong>Total Marks:</strong> {formatRules.maximum_marks}
          </p>
          {formatRules.sections.map((s, i) => (
            <div key={i} style={{
              fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)',
              padding: '4px 0', borderTop: i > 0 ? '1px solid var(--color-divider)' : 'none',
            }}>
              {s.section_name} · {s.questions_to_attempt} questions · {s.marks_per_question} marks each
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'var(--space-2)', flexWrap: 'wrap', gap: 12 }}>
        <GhostBtn onClick={onBack}>← Back</GhostBtn>
        <div style={{ display: 'flex', gap: 10 }}>
          <PrimaryBtn onClick={handleExtract} loading={loading} disabled={!file}>
            {loading ? 'Extracting…' : 'Extract Format with AI'}
          </PrimaryBtn>
          {formatRules && (
            <PrimaryBtn onClick={onNext}>
              Next — Review Schedule
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </PrimaryBtn>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Step 3: Review auto-scheduled dates ──────────────────────────────────────
function Step3({
  scheduledExams, setScheduledExams, onNext, onBack,
}: {
  scheduledExams: ScheduledExam[]
  setScheduledExams: (e: ScheduledExam[]) => void
  onNext: () => void
  onBack: () => void
}) {
  function updateTitle(i: number, title: string) {
    const updated = scheduledExams.map((e, idx) => idx === i ? { ...e, title } : e)
    setScheduledExams(updated)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      <div style={{
        padding: '10px 14px', borderRadius: 'var(--radius-md)',
        background: 'var(--color-primary-highlight)', color: 'var(--color-primary)',
        fontSize: 'var(--text-sm)',
        border: '1px solid color-mix(in oklch, var(--color-primary) 20%, transparent)',
      }}>
        MockPrep has evenly spaced your {scheduledExams.length} mock exam{scheduledExams.length !== 1 ? 's' : ''} across your study window. You can adjust the titles below.
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        {scheduledExams.map((exam, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 'var(--space-4)',
            padding: 'var(--space-4)',
            background: 'var(--color-surface)', border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
          }}>
            <div style={{
              width: 32, height: 32, flexShrink: 0,
              borderRadius: 'var(--radius-full)',
              background: 'var(--color-primary-highlight)', color: 'var(--color-primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 'var(--text-xs)', fontWeight: 700,
            }}>
              {i + 1}
            </div>
            <div style={{ minWidth: 130 }}>
              <p style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text)' }}>
                {format(exam.date, 'dd MMM yyyy')}
              </p>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)' }}>
                {format(exam.date, 'EEEE')} · {format(exam.date, 'hh:mm a')}
              </p>
            </div>
            <input
              value={exam.title}
              onChange={e => updateTitle(i, e.target.value)}
              style={{
                flex: 1, padding: '7px 12px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
                background: 'var(--color-surface-2)', color: 'var(--color-text)',
                fontSize: 'var(--text-sm)', outline: 'none',
              }}
              onFocus={e => {
                e.target.style.borderColor = 'var(--color-primary)'
                e.target.style.boxShadow = '0 0 0 3px color-mix(in oklch, var(--color-primary) 15%, transparent)'
              }}
              onBlur={e => {
                e.target.style.borderColor = 'var(--color-border)'
                e.target.style.boxShadow = 'none'
              }}
            />
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'var(--space-2)', flexWrap: 'wrap', gap: 12 }}>
        <GhostBtn onClick={onBack}>← Back</GhostBtn>
        <PrimaryBtn onClick={onNext}>
          Confirm & Generate Exams
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </PrimaryBtn>
      </div>
    </div>
  )
}

// ─── Step 4: Generate & save ──────────────────────────────────────────────────
function Step4({
  scheduledExams, formatRules, subject, notesPath, onBack,
}: {
  scheduledExams: ScheduledExam[]
  formatRules: FormatRules
  subject: string
  notesPath: string
  onBack: () => void
}) {
  const router   = useRouter()
  const supabase = createClient()

  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [progress, setProgress] = useState<string[]>([])

  function addLog(msg: string) {
    setProgress(prev => [...prev, msg])
  }

  // ── Polling helper ────────────────────────────────────────────────────────
  function pollJob(backendUrl: string, jobId: string): Promise<{ questions: unknown[] }> {
    return new Promise((resolve, reject) => {
      const interval = setInterval(async () => {
        try {
          const pollRes  = await fetch(`${backendUrl}/api/generate-exam/status/${jobId}`)
          const pollData = await pollRes.json()
          if (pollData.status === 'done') {
            clearInterval(interval)
            resolve(pollData.result.exam)
          } else if (pollData.status === 'error') {
            clearInterval(interval)
            reject(new Error(pollData.error || 'Generation failed'))
          }
          // status === 'running' → keep waiting
        } catch (e) {
          clearInterval(interval)
          reject(e)
        }
      }, 5000)
    })
  }

  async function handleGenerate() {
    setError(''); setLoading(true); setProgress([])
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated.')

      for (let i = 0; i < scheduledExams.length; i++) {
        const exam = scheduledExams[i]
        addLog(`Generating exam ${i + 1}/${scheduledExams.length}: ${exam.title}…`)

        // Step 1: kick off — Node responds immediately with jobId
        const kickRes  = await fetch(`${backendUrl}/api/generate-exam`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ format_rules: formatRules, notes_path: notesPath }),
        })
        const kickData = await kickRes.json()
        if (!kickRes.ok) throw new Error(kickData.error || 'Failed to start generation')

        addLog(`Job started (${kickData.jobId}) — waiting for Phi-3…`)

        // Step 2: poll every 5s until done
        const examJson = await pollJob(backendUrl, kickData.jobId)

        if (!examJson?.questions?.length) {
          throw new Error(`AI returned no questions for "${exam.title}". Double-check your notes folder path.`)
        }

        // Step 3: save exam row to Supabase
        const { data: examRow, error: examErr } = await supabase
          .from('exams')
          .insert({
            user_id:        user.id,
            title:          exam.title,
            subject:        subject,
            scheduled_date: exam.date.toISOString(),
            status:         'scheduled',
            total_marks:    formatRules.maximum_marks,
            obtained_marks: null,
            format_rules:   formatRules,
          })
          .select('id')
          .single()

        if (examErr) throw new Error(`DB error saving exam: ${examErr.message}`)

        // Step 4: save questions
        const questionsToInsert = (examJson.questions as Array<{
          question_number: number
          question_text: string
          expected_answer: string
          marks: number
        }>).map(q => ({
          exam_id:         examRow.id,
          question_number: q.question_number,
          question_text:   q.question_text,
          expected_answer: q.expected_answer,
          marks:           q.marks,
        }))

        const { error: qErr } = await supabase.from('questions').insert(questionsToInsert)
        if (qErr) throw new Error(`DB error saving questions: ${qErr.message}`)

        addLog(`Exam ${i + 1} saved — ${questionsToInsert.length} questions.`)
      }

      addLog('All exams scheduled! Redirecting to dashboard…')
      setTimeout(() => router.push('/dashboard'), 1500)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      {error && <ErrorBanner msg={error} />}

      <div style={{
        padding: 'var(--space-5)', background: 'var(--color-surface-offset)',
        border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)',
      }}>
        <p style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--color-text-faint)',
          textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>
          Ready to Generate
        </p>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text)', marginBottom: 4 }}>
          <strong>{scheduledExams.length}</strong> mock exam{scheduledExams.length !== 1 ? 's' : ''} · <strong>{formatRules.maximum_marks}</strong> marks each
        </p>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginBottom: 4 }}>
          Notes folder: <code style={{ fontSize: 'var(--text-xs)', background: 'var(--color-surface-dynamic)',
            padding: '2px 6px', borderRadius: 'var(--radius-sm)' }}>{notesPath}</code>
        </p>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
          Phi-3 will generate questions from your notes. This may take several minutes — keep this tab open.
        </p>
      </div>

      {progress.length > 0 && (
        <div style={{
          padding: 'var(--space-4)', background: 'var(--color-surface)',
          border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)',
          fontFamily: 'monospace', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)',
          display: 'flex', flexDirection: 'column', gap: 4,
        }}>
          {progress.map((log, i) => (
            <p key={i} style={{ color: log.startsWith('All exams') || log.includes('saved') ? 'var(--color-success)' : 'inherit' }}>
              {log}
            </p>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'var(--space-2)', flexWrap: 'wrap', gap: 12 }}>
        <GhostBtn onClick={onBack}>← Back</GhostBtn>
        <PrimaryBtn onClick={handleGenerate} loading={loading} disabled={loading}>
          {loading ? 'Generating…' : 'Generate & Schedule All Exams'}
        </PrimaryBtn>
      </div>
    </div>
  )
}

// ─── Main Wizard ──────────────────────────────────────────────────────────────
export default function SchedulePage() {
  const [step, setStep] = useState(0)

  const [examTitle,     setExamTitle]     = useState('')
  const [subject,       setSubject]       = useState('')
  const [studyStart,    setStudyStart]    = useState('')
  const [finalExam,     setFinalExam]     = useState('')
  const [mockCount,     setMockCount]     = useState('3')
  const [notesPath,     setNotesPath]     = useState('')
  const [preferredTime, setPreferredTime] = useState('09:00')

  const [formatRules,    setFormatRules]    = useState<FormatRules | null>(null)
  const [scheduledExams, setScheduledExams] = useState<ScheduledExam[]>([])

  function handleStep1Done() {
    const dates = autoScheduleDates(
      startOfDay(new Date(studyStart)),
      startOfDay(new Date(finalExam)),
      parseInt(mockCount),
      preferredTime
    )
    setScheduledExams(dates.map((date, i) => ({
      date,
      title: `${examTitle} — Mock ${i + 1}`,
      time: preferredTime,
    })))
    setStep(1)
  }

  const stepTitles = [
    'Set Your Study Window',
    'Upload Sample Paper',
    'Review Schedule',
    'Generate Exams',
  ]

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--color-bg)', padding: 'var(--space-6) var(--space-4)' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <div style={{ marginBottom: 'var(--space-8)' }}>
          <a href="/dashboard" style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)',
            textDecoration: 'none', marginBottom: 'var(--space-6)',
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            Back to Dashboard
          </a>
          <h1 style={{
            fontFamily: "'Cabinet Grotesk', Satoshi, sans-serif",
            fontSize: 'var(--text-xl)', fontWeight: 800,
            color: 'var(--color-text)', letterSpacing: '-0.02em', marginBottom: 4,
          }}>
            Schedule Mock Exams
          </h1>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
            {stepTitles[step]}
          </p>
        </div>

        <StepIndicator current={step} total={4} />

        <div style={{
          background: 'var(--color-surface)', border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-md)',
          padding: 'var(--space-8)',
        }}>
          {step === 0 && (
            <Step1
              studyStart={studyStart}       setStudyStart={setStudyStart}
              finalExam={finalExam}         setFinalExam={setFinalExam}
              mockCount={mockCount}         setMockCount={setMockCount}
              subject={subject}             setSubject={setSubject}
              examTitle={examTitle}         setExamTitle={setExamTitle}
              notesPath={notesPath}         setNotesPath={setNotesPath}
              preferredTime={preferredTime} setPreferredTime={setPreferredTime}
              onNext={handleStep1Done}
            />
          )}
          {step === 1 && (
            <Step2
              formatRules={formatRules} setFormatRules={setFormatRules}
              onNext={() => setStep(2)} onBack={() => setStep(0)}
            />
          )}
          {step === 2 && (
            <Step3
              scheduledExams={scheduledExams} setScheduledExams={setScheduledExams}
              onNext={() => setStep(3)} onBack={() => setStep(1)}
            />
          )}
          {step === 3 && formatRules && (
            <Step4
              scheduledExams={scheduledExams}
              formatRules={formatRules}
              subject={subject}
              notesPath={notesPath}
              onBack={() => setStep(2)}
            />
          )}
        </div>
      </div>
    </div>
  )
}