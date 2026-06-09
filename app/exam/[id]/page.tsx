'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

// ─── Types ────────────────────────────────────────────────────────────────────
interface Question {
  id: string; question_number: number; question_text: string
  expected_answer: string; marks: number
}
interface GradeResult { awarded_marks: number; feedback: string }
type ViolationType = 'face_missing' | 'multiple_faces' | 'tab_switch' | 'background_voice'

const BACKEND         = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'
const MAX_FACE_STRIKES  = 3
const MAX_VOICE_STRIKES = 5

// ─── Strike Overlay ───────────────────────────────────────────────────────────
function StrikeOverlay({ strike, max, reason, type, onDismiss }: {
  strike: number; max: number; reason: string
  type: ViolationType; onDismiss: () => void
}) {
  const isLast = strike >= max
  const color  = isLast ? 'var(--color-error)' : 'var(--color-warning)'
  const bgCol  = isLast ? 'var(--color-error-highlight)' : 'var(--color-warning-highlight)'
  return (
    <div style={{ position:'fixed',inset:0,zIndex:9999,background:'rgba(0,0,0,0.88)',display:'flex',alignItems:'center',justifyContent:'center',animation:'fadeIn 0.2s ease' }}>
      <div style={{ background:'var(--color-surface)',border:`2px solid ${color}`,borderRadius:'var(--radius-xl)',padding:'var(--space-8)',maxWidth:400,width:'90%',textAlign:'center',boxShadow:'var(--shadow-lg)' }}>
        <div style={{ width:56,height:56,borderRadius:'50%',margin:'0 auto var(--space-4)',background:bgCol,display:'flex',alignItems:'center',justifyContent:'center' }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
        </div>
        <p style={{ fontSize:'var(--text-lg)',fontWeight:800,color,marginBottom:'var(--space-2)' }}>
          {isLast ? 'Exam Terminated' : `Strike ${strike} of ${max}`}
        </p>
        <p style={{ fontSize:'var(--text-base)',color:'var(--color-text)',marginBottom:'var(--space-2)',fontWeight:600 }}>{reason}</p>
        <div style={{ display:'flex',justifyContent:'center',gap:8,margin:'var(--space-4) 0' }}>
          {Array.from({length:max}).map((_,i) => (
            <div key={i} style={{ width:12,height:12,borderRadius:'50%',
              background: i < strike ? color : 'var(--color-surface-offset)',
              border:`2px solid ${i < strike ? color : 'var(--color-border)'}`,transition:'background 0.3s' }} />
          ))}
        </div>
        {isLast ? (
          <p style={{ fontSize:'var(--text-sm)',color:'var(--color-text-muted)' }}>Your exam has been automatically submitted.</p>
        ) : (
          <div>
            <p style={{ fontSize:'var(--text-sm)',color:'var(--color-text-muted)',marginBottom:'var(--space-4)' }}>
              {max - strike} strike{max-strike!==1?'s':''} remaining before auto-submit.
            </p>
            <button onClick={onDismiss} style={{ width:'100%',padding:'11px',borderRadius:'var(--radius-lg)',background:'var(--color-primary)',color:'var(--color-text-inverse)',fontSize:'var(--text-sm)',fontWeight:600,border:'none',cursor:'pointer' }}>
              I understand — Resume Exam
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Webcam Preview ───────────────────────────────────────────────────────────
function WebcamPreview({ videoRef, active }: { videoRef: React.RefObject<HTMLVideoElement>; active: boolean }) {
  return (
    <div style={{
      position:'fixed',bottom:16,right:16,zIndex:50,
      borderRadius:'var(--radius-lg)',overflow:'hidden',
      border:'2px solid var(--color-border)',boxShadow:'var(--shadow-lg)',
      width:140,height:105,background:'#000',
      display: active ? 'block' : 'none',
    }}>
      <video ref={videoRef} muted playsInline autoPlay
        style={{ width:'100%',height:'100%',objectFit:'cover',transform:'scaleX(-1)',display:'block' }} />
      <div style={{ position:'absolute',bottom:4,left:6,display:'flex',alignItems:'center',gap:4 }}>
        <div style={{ width:6,height:6,borderRadius:'50%',background:'var(--color-error)',animation:'blink 1.5s ease-in-out infinite' }} />
        <span style={{ fontSize:10,color:'rgba(255,255,255,0.8)',fontWeight:600 }}>LIVE</span>
      </div>
    </div>
  )
}

// ─── Exam Timer ───────────────────────────────────────────────────────────────
function ExamTimer({ durationMinutes, onExpire }: { durationMinutes: number; onExpire: () => void }) {
  const [seconds, setSeconds] = useState(durationMinutes * 60)
  useEffect(() => {
    if (seconds <= 0) { onExpire(); return }
    const t = setInterval(() => setSeconds(s => { if(s<=1){clearInterval(t);onExpire();return 0} return s-1 }),1000)
    return () => clearInterval(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const h=Math.floor(seconds/3600), m=Math.floor((seconds%3600)/60), s=seconds%60
  const isLow = seconds < 300
  return (
    <div style={{ display:'flex',alignItems:'center',gap:8,padding:'8px 16px',borderRadius:'var(--radius-lg)',
      background:isLow?'var(--color-error-highlight)':'var(--color-surface-offset)',
      border:`1px solid ${isLow?'color-mix(in oklch,var(--color-error) 30%,transparent)':'var(--color-border)'}`,transition:'background 0.5s' }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={isLow?'var(--color-error)':'var(--color-text-muted)'} strokeWidth="2" strokeLinecap="round">
        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
      </svg>
      <span style={{ fontFamily:'monospace',fontSize:'var(--text-sm)',fontWeight:700,color:isLow?'var(--color-error)':'var(--color-text)',letterSpacing:'0.05em',fontVariantNumeric:'tabular-nums' }}>
        {h>0?`${h}:`:''}{ String(m).padStart(2,'0')}:{String(s).padStart(2,'0')}
      </span>
    </div>
  )
}

// ─── Question Card ────────────────────────────────────────────────────────────
function QuestionCard({ question,index,total,answer,onChange,result,submitted }: {
  question:Question;index:number;total:number;answer:string
  onChange:(v:string)=>void;result?:GradeResult;submitted:boolean
}) {
  const passed = result && result.awarded_marks >= question.marks * 0.5
  return (
    <div id={`q-${question.question_number}`} style={{ background:'var(--color-surface)',
      border:`1px solid ${result ? passed?'color-mix(in oklch,var(--color-success) 40%,transparent)':'color-mix(in oklch,var(--color-error) 40%,transparent)' : 'var(--color-border)'}`,
      borderRadius:'var(--radius-xl)',padding:'var(--space-6)',boxShadow:'var(--shadow-sm)' }}>
      <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'var(--space-4)' }}>
        <div style={{ display:'flex',alignItems:'center',gap:10 }}>
          <span style={{ width:28,height:28,borderRadius:'var(--radius-full)',background:'var(--color-primary-highlight)',color:'var(--color-primary)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'var(--text-xs)',fontWeight:700,flexShrink:0 }}>
            {question.question_number}
          </span>
          <span style={{ fontSize:'var(--text-xs)',color:'var(--color-text-faint)' }}>Q{index+1} of {total}</span>
        </div>
        <span style={{ padding:'3px 10px',borderRadius:'var(--radius-full)',fontSize:'var(--text-xs)',fontWeight:600,background:'var(--color-surface-offset)',color:'var(--color-text-muted)' }}>
          {question.marks} mark{question.marks!==1?'s':''}
        </span>
      </div>
      <p style={{ fontSize:'var(--text-base)',color:'var(--color-text)',lineHeight:1.7,marginBottom:'var(--space-4)',fontWeight:500 }}>
        {question.question_text}
      </p>
      {!submitted && (
        <textarea value={answer} onChange={e=>onChange(e.target.value)}
          placeholder="Type your answer here…" rows={5}
          style={{ width:'100%',padding:'12px 14px',borderRadius:'var(--radius-lg)',border:'1px solid var(--color-border)',background:'var(--color-surface-2)',color:'var(--color-text)',fontSize:'var(--text-base)',lineHeight:1.6,resize:'vertical',outline:'none',fontFamily:'inherit',transition:'border-color 0.15s,box-shadow 0.15s' }}
          onFocus={e=>{e.target.style.borderColor='var(--color-primary)';e.target.style.boxShadow='0 0 0 3px color-mix(in oklch,var(--color-primary) 15%,transparent)'}}
          onBlur={e=>{e.target.style.borderColor='var(--color-border)';e.target.style.boxShadow='none'}} />
      )}
      {submitted && result && (
        <div style={{ display:'flex',flexDirection:'column',gap:'var(--space-3)' }}>
          <div style={{ padding:'var(--space-3)',background:'var(--color-surface-2)',borderRadius:'var(--radius-lg)' }}>
            <p style={{ fontSize:'var(--text-xs)',color:'var(--color-text-faint)',marginBottom:4,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.06em' }}>Your Answer</p>
            <p style={{ fontSize:'var(--text-sm)',color:'var(--color-text-muted)',lineHeight:1.6 }}>{answer||<em>No answer provided</em>}</p>
          </div>
          <div style={{ padding:'var(--space-3)',background:passed?'var(--color-success-highlight)':'var(--color-error-highlight)',borderRadius:'var(--radius-lg)',display:'flex',alignItems:'flex-start',gap:12 }}>
            <div style={{ flexShrink:0,textAlign:'center',minWidth:48 }}>
              <p style={{ fontFamily:'monospace',fontSize:'var(--text-lg)',fontWeight:800,color:passed?'var(--color-success)':'var(--color-error)',lineHeight:1,fontVariantNumeric:'tabular-nums' }}>
                {result.awarded_marks}/{question.marks}
              </p>
              <p style={{ fontSize:'var(--text-xs)',color:'var(--color-text-muted)' }}>marks</p>
            </div>
            <p style={{ fontSize:'var(--text-sm)',color:'var(--color-text)',lineHeight:1.6,flex:1 }}>{result.feedback}</p>
          </div>
        </div>
      )}
      {/* Spinner shown per-question while grading is in progress for that question */}
      {submitted && !result && (
        <div style={{ padding:'var(--space-3)',background:'var(--color-surface-offset)',borderRadius:'var(--radius-lg)',display:'flex',alignItems:'center',gap:8 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-faint)" strokeWidth="2" strokeLinecap="round" style={{ animation:'spin 1s linear infinite',flexShrink:0 }}>
            <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
          </svg>
          <p style={{ fontSize:'var(--text-sm)',color:'var(--color-text-muted)' }}>Grading with Phi-3…</p>
        </div>
      )}
    </div>
  )
}

// ─── Results Summary ──────────────────────────────────────────────────────────
function ResultsSummary({ totalMarks,obtainedMarks,totalQuestions,router }: {
  totalMarks:number;obtainedMarks:number;totalQuestions:number;router:ReturnType<typeof useRouter>
}) {
  const pct   = Math.round((obtainedMarks/totalMarks)*100)
  const grade = pct>=90?'Excellent! 🎉':pct>=75?'Great job! 👏':pct>=50?'Good effort.':'Keep practicing.'
  const col   = pct>=75?'var(--color-success)':pct>=50?'var(--color-orange)':'var(--color-error)'
  return (
    <div style={{ background:'var(--color-surface)',border:'1px solid var(--color-border)',borderRadius:'var(--radius-xl)',padding:'var(--space-6)',boxShadow:'var(--shadow-md)',textAlign:'center',marginBottom:'var(--space-6)' }}>
      <p style={{ fontSize:'var(--text-xs)',color:'var(--color-text-faint)',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:8 }}>Final Score</p>
      <p style={{ fontSize:'var(--text-xl)',fontWeight:900,color:col,lineHeight:1,fontVariantNumeric:'tabular-nums' }}>{obtainedMarks}/{totalMarks}</p>
      <p style={{ fontSize:'var(--text-lg)',fontWeight:700,color:col,margin:'4px 0' }}>{pct}%</p>
      <p style={{ fontSize:'var(--text-sm)',color:'var(--color-text-muted)',marginBottom:'var(--space-4)' }}>{grade} · {totalQuestions} questions graded</p>
      <button onClick={()=>router.push('/dashboard')} style={{ width:'100%',padding:'10px',borderRadius:'var(--radius-lg)',background:'var(--color-primary)',color:'var(--color-text-inverse)',fontSize:'var(--text-sm)',fontWeight:600,border:'none',cursor:'pointer' }}>
        Back to Dashboard
      </button>
    </div>
  )
}

// ─── Grading Progress Banner ──────────────────────────────────────────────────
function GradingBanner({ done, total }: { done: number; total: number }) {
  const pct = total === 0 ? 100 : Math.round((done / total) * 100)
  return (
    <div style={{ background:'var(--color-surface)',border:'1px solid var(--color-border)',borderRadius:'var(--radius-xl)',padding:'var(--space-5)',boxShadow:'var(--shadow-md)',marginBottom:'var(--space-6)' }}>
      <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'var(--space-3)' }}>
        <div style={{ display:'flex',alignItems:'center',gap:10 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" style={{ animation:'spin 1s linear infinite',flexShrink:0 }}>
            <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
          </svg>
          <p style={{ fontSize:'var(--text-sm)',fontWeight:700,color:'var(--color-text)' }}>
            Grading your answers with Phi-3…
          </p>
        </div>
        <p style={{ fontSize:'var(--text-sm)',fontWeight:700,color:'var(--color-primary)',fontVariantNumeric:'tabular-nums' }}>
          {done}/{total}
        </p>
      </div>
      <div style={{ height:6,borderRadius:'var(--radius-full)',background:'var(--color-surface-offset)',overflow:'hidden' }}>
        <div style={{ height:'100%',borderRadius:'var(--radius-full)',background:'var(--color-primary)',width:`${pct}%`,transition:'width 0.4s ease' }} />
      </div>
      <p style={{ fontSize:'var(--text-xs)',color:'var(--color-text-muted)',marginTop:'var(--space-2)' }}>
        Please wait — this may take a minute. Do not close this page.
      </p>
    </div>
  )
}

// ─── Main Exam Page ───────────────────────────────────────────────────────────
export default function ExamPage() {
  const params   = useParams()
  const router   = useRouter()
  const examId   = params.id as string
  const supabase = createClient()

  // Exam state
  const [loading,         setLoading]         = useState(true)
  const [examTitle,       setExamTitle]        = useState('')
  const [totalMarks,      setTotalMarks]       = useState(0)
  const [durationMinutes, setDurationMinutes]  = useState(90)
  const [questions,       setQuestions]        = useState<Question[]>([])
  const [answers,         setAnswers]          = useState<Record<string,string>>({})
  const [results,         setResults]          = useState<Record<string,GradeResult>>({})
  const [submitted,       setSubmitted]        = useState(false)
  const [grading,         setGrading]          = useState(false)
  const [gradingProgress, setGradingProgress]  = useState(0)
  const [gradingTotal,    setGradingTotal]     = useState(0)
  const [error,           setError]            = useState('')
  const [userId,          setUserId]           = useState<string|null>(null)

  // Proctoring state
  const [proctorActive,   setProctorActive]    = useState(false)
  const [readyToStart,    setReadyToStart]     = useState(false)
  const [verifyingFace,   setVerifyingFace]    = useState(false)
  const [faceVerified,    setFaceVerified]     = useState(false)
  const [preExamError,    setPreExamError]     = useState('')
  const [faceStrikes,     setFaceStrikes]      = useState(0)
  const [voiceStrikes,    setVoiceStrikes]     = useState(0)
  const [showStrike,      setShowStrike]       = useState(false)
  const [strikeInfo,      setStrikeInfo]       = useState<{type:ViolationType;reason:string;strike:number;max:number}|null>(null)

  const faceStrikesRef   = useRef(0)
  const voiceStrikesRef  = useRef(0)
  const videoRef         = useRef<HTMLVideoElement>(null)
  const overlayVideoRef  = useRef<HTMLVideoElement>(null)
  const canvasRef        = useRef<HTMLCanvasElement>(null)
  const streamRef        = useRef<MediaStream|null>(null)
  const micStreamRef     = useRef<MediaStream|null>(null)
  const audioCtxRef      = useRef<AudioContext|null>(null)
  const faceIntervalRef  = useRef<ReturnType<typeof setInterval>|null>(null)
  const voiceIntervalRef = useRef<ReturnType<typeof setInterval>|null>(null)
  const submittedRef     = useRef(false)
  // ── FIX: answersRef always holds the latest answers — safe for stale-closure auto-submit
  const answersRef       = useRef<Record<string,string>>({})
  const questionsRef     = useRef<Question[]>([])
  const userIdRef        = useRef<string|null>(null)

  // Keep refs in sync with state
  useEffect(() => { answersRef.current   = answers   }, [answers])
  useEffect(() => { questionsRef.current = questions }, [questions])
  useEffect(() => { userIdRef.current    = userId    }, [userId])

  // ── Start webcam (laptop built-in camera) ─────────────────────────────────
  async function startWebcam() {
    try {
      const tempStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      tempStream.getTracks().forEach(t => t.stop())

      const devices      = await navigator.mediaDevices.enumerateDevices()
      const videoDevices = devices.filter(d => d.kind === 'videoinput')

      const PHONE_RE   = /(oneplus|samsung|pixel|iphone|android|phone|mobile)/i
      const BUILTIN_RE = /(integrated|built.?in|facetime|hd webcam|ir camera|front|laptop|internal)/i

      const builtIn  = videoDevices.find(d => BUILTIN_RE.test(d.label) && !PHONE_RE.test(d.label))
      const notPhone = videoDevices.find(d => !PHONE_RE.test(d.label))
      const chosen   = builtIn || notPhone || videoDevices[0]

      console.log('[Proctor] Cameras found:', videoDevices.map(d => d.label))
      console.log('[Proctor] Chosen camera:', chosen?.label)

      const constraints = chosen?.deviceId
        ? { video: { deviceId: { exact: chosen.deviceId }, width: { ideal: 640 }, height: { ideal: 480 } }, audio: false }
        : { video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }, audio: false }

      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play().catch(() => {})
      }
      if (overlayVideoRef.current) {
        overlayVideoRef.current.srcObject = stream
        await overlayVideoRef.current.play().catch(() => {})
      }
      console.log('[Proctor] Webcam started:', stream.getVideoTracks()[0]?.label)
    } catch (err: any) {
      console.warn('[Proctor] Webcam failed:', err?.name, err?.message)
    }
  }

  // ── Pre-exam face check ───────────────────────────────────────────────────
  async function waitForVideo(maxWaitMs = 5000): Promise<boolean> {
    if (!videoRef.current) return false
    if (videoRef.current.readyState >= 2) return true
    return new Promise(resolve => {
      const timeout = setTimeout(() => resolve(false), maxWaitMs)
      videoRef.current!.addEventListener('canplay', () => { clearTimeout(timeout); resolve(true) }, { once: true })
    })
  }

  async function runPreExamFaceCheck(): Promise<boolean> {
    if (!videoRef.current || !canvasRef.current) return true
    const ready = await waitForVideo(5000)
    if (!ready) return true
    setVerifyingFace(true)
    setPreExamError('')
    try {
      const canvas = canvasRef.current
      canvas.width  = videoRef.current.videoWidth  || 640
      canvas.height = videoRef.current.videoHeight || 480
      canvas.getContext('2d')!.drawImage(videoRef.current, 0, 0)
      const b64 = canvas.toDataURL('image/jpeg', 0.85)
      const res  = await fetch(`${BACKEND}/api/face/verify`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, image_b64: b64, mode: 'pre_exam' }),
      })
      const data = await res.json()
      console.log('[PreExam] Face check:', data)
      if (!data.enrolled) { setVerifyingFace(false); return true }
      if (data.match)     { setFaceVerified(true); setVerifyingFace(false); return true }
      const reason = data.reason === 'no_face_detected'
        ? 'No face detected. Please sit in front of the camera.'
        : data.reason === 'multiple_faces'
        ? 'Multiple faces detected. Please be alone.'
        : `Face does not match your enrolled profile. (confidence: ${data.confidence}%)`
      setPreExamError(reason)
      setVerifyingFace(false)
      return false
    } catch {
      setVerifyingFace(false)
      return true
    }
  }

  async function startProctoring(uid: string) {
    try {
      const el = document.documentElement
      if (el.requestFullscreen) await el.requestFullscreen()
      else if ((el as any).webkitRequestFullscreen) (el as any).webkitRequestFullscreen()
    } catch { /* ignore */ }
    await startMicDetection()
    startFaceVerification(uid)
    setProctorActive(true)
    setReadyToStart(false)
  }

  // ── Mic / voice detection ─────────────────────────────────────────────────
  async function startMicDetection() {
    try {
      const stream   = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      micStreamRef.current = stream
      const ctx      = new AudioContext()
      audioCtxRef.current = ctx
      const source   = ctx.createMediaStreamSource(stream)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 1024
      source.connect(analyser)

      const dataArray  = new Uint8Array(analyser.frequencyBinCount)
      let   loudFrames = 0
      let   cooldown   = 0

      voiceIntervalRef.current = setInterval(() => {
        if (submittedRef.current) return
        analyser.getByteFrequencyData(dataArray)
        const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length
        if (avg > 75) { loudFrames++ } else { loudFrames = Math.max(0, loudFrames - 1) }
        if (loudFrames >= 6 && cooldown === 0) {
          loudFrames = 0
          cooldown   = 30
          triggerViolation('background_voice')
        }
        if (cooldown > 0) cooldown--
      }, 500)

      console.log('[Proctor] Mic detection started')
    } catch (err) {
      console.warn('[Proctor] Mic denied or unavailable:', err)
    }
  }

  // ── Periodic face verification ────────────────────────────────────────────
  function startFaceVerification(uid: string) {
    faceIntervalRef.current = setInterval(async () => {
      if (submittedRef.current || !videoRef.current || !canvasRef.current) return
      if (videoRef.current.readyState < 2) return

      const canvas = canvasRef.current
      canvas.width  = videoRef.current.videoWidth  || 640
      canvas.height = videoRef.current.videoHeight || 480
      canvas.getContext('2d')!.drawImage(videoRef.current, 0, 0)
      const b64 = canvas.toDataURL('image/jpeg', 0.7)

      try {
        const res  = await fetch(`${BACKEND}/api/face/verify`, {
          method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ user_id: uid, image_b64: b64, mode: 'exam' }),
        })
        const data = await res.json()
        console.log('[Proctor] Face check:', data.reason, '| confidence:', data.confidence, '| distance:', data.lbph_distance)

        if (data.enrolled === false) return
        if (!data.match) {
          if (data.reason === 'no_face_detected') {
            triggerViolation('face_missing')
          } else {
            triggerViolation('multiple_faces')
          }
        }
      } catch (err) {
        console.warn('[Proctor] Face verify error:', err)
      }
    }, 10000)
  }

  // ── Violation handler ─────────────────────────────────────────────────────
  const triggerViolation = useCallback(async (type: ViolationType) => {
    if (submittedRef.current) return

    const isFace  = type === 'face_missing' || type === 'multiple_faces'
    const isVoice = type === 'background_voice'
    const isTab   = type === 'tab_switch'

    let currentStrike = 0
    let maxStrikes    = 0

    if (isFace || isTab) {
      faceStrikesRef.current++
      setFaceStrikes(faceStrikesRef.current)
      currentStrike = faceStrikesRef.current
      maxStrikes    = MAX_FACE_STRIKES
    } else if (isVoice) {
      voiceStrikesRef.current++
      setVoiceStrikes(voiceStrikesRef.current)
      currentStrike = voiceStrikesRef.current
      maxStrikes    = MAX_VOICE_STRIKES
    }

    const messages: Record<ViolationType, string> = {
      face_missing:     'No face detected. Please keep your face visible.',
      multiple_faces:   'Another person or a different face was detected.',
      tab_switch:       'You switched away from the exam tab.',
      background_voice: 'Loud background voice detected. Ensure you are alone.',
    }

    setStrikeInfo({ type, reason: messages[type], strike: currentStrike, max: maxStrikes })
    setShowStrike(true)

    const uid = userIdRef.current
    if (uid) {
      supabase.from('logs').insert({
        exam_id: examId, user_id: uid, event_type: type,
        event_time: new Date().toISOString(),
        details: { strike: currentStrike, message: messages[type] },
      }).then(()=>{}).catch(()=>{})
    }

    // ── FIX: auto-submit uses handleSubmitRef so it always calls the latest version
    if (currentStrike >= maxStrikes) {
      setTimeout(() => handleSubmitRef.current(true), 3000)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examId])

  // ── Tab switch detection ──────────────────────────────────────────────────
  useEffect(() => {
    if (!proctorActive || submitted) return
    const handleVis = () => { if (document.hidden) triggerViolation('tab_switch') }
    document.addEventListener('visibilitychange', handleVis)
    return () => document.removeEventListener('visibilitychange', handleVis)
  }, [proctorActive, submitted, triggerViolation])

  // ── Block browser back button ─────────────────────────────────────────────
  useEffect(() => {
    if (!proctorActive || submitted) return
    window.history.pushState(null, '', window.location.href)
    const handlePop = () => {
      window.history.pushState(null, '', window.location.href)
      triggerViolation('tab_switch')
    }
    window.addEventListener('popstate', handlePop)
    return () => window.removeEventListener('popstate', handlePop)
  }, [proctorActive, submitted, triggerViolation])

  // ── Cleanup on unmount ────────────────────────────────────────────────────
  function stopAllProctoring() {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    micStreamRef.current?.getTracks().forEach(t => t.stop())
    micStreamRef.current = null
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      audioCtxRef.current.close().catch(() => {})
    }
    audioCtxRef.current = null
    if (faceIntervalRef.current)  { clearInterval(faceIntervalRef.current);  faceIntervalRef.current  = null }
    if (voiceIntervalRef.current) { clearInterval(voiceIntervalRef.current); voiceIntervalRef.current = null }
  }
  useEffect(() => () => stopAllProctoring(), [])

  // ── Load exam ─────────────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      const { data:{ user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUserId(user.id)
      userIdRef.current = user.id

      const { data: exam } = await supabase
        .from('exams').select('title,total_marks,status,format_rules')
        .eq('id', examId).single()

      if (!exam) { setError('Exam not found.'); setLoading(false); return }
      setExamTitle(exam.title)
      setTotalMarks(exam.total_marks)
      setDurationMinutes(exam.format_rules?.duration_minutes ?? 90)

      if (exam.status === 'completed') {
        const [{ data: qs }, { data: subs }] = await Promise.all([
          supabase.from('questions').select('*').eq('exam_id', examId).order('question_number'),
          supabase.from('submissions').select('question_id,student_answer,awarded_marks,feedback').eq('exam_id', examId),
        ])
        setQuestions(qs ?? [])
        questionsRef.current = qs ?? []
        const aMap: Record<string,string>      = {}
        const rMap: Record<string,GradeResult> = {}
        subs?.forEach(s => { aMap[s.question_id]=s.student_answer; rMap[s.question_id]={awarded_marks:s.awarded_marks,feedback:s.feedback} })
        setAnswers(aMap); setResults(rMap); setSubmitted(true); setLoading(false)
        return
      }

      await supabase.from('exams').update({ status:'in_progress' }).eq('id', examId)
      await supabase.from('logs').insert({ exam_id:examId, user_id:user.id, event_type:'exam_start', event_time:new Date().toISOString(), details:{message:'Exam started'} })

      // ── T1-B: Load existing strikes from logs on resume ───────────────────────
      const { data: existingLogs } = await supabase
        .from('logs')
        .select('event_type')
        .eq('exam_id', examId)
        .eq('user_id', user.id)
        .in('event_type', ['face_missing', 'multiple_faces', 'tab_switch', 'background_voice'])

      if (existingLogs && existingLogs.length > 0) {
        const faceTally  = existingLogs.filter((l: any) => ['face_missing','multiple_faces','tab_switch'].includes(l.event_type)).length
        const voiceTally = existingLogs.filter((l: any) => l.event_type === 'background_voice').length
        const clampedFace  = Math.min(faceTally,  MAX_FACE_STRIKES)
        const clampedVoice = Math.min(voiceTally, MAX_VOICE_STRIKES)
        faceStrikesRef.current  = clampedFace
        voiceStrikesRef.current = clampedVoice
        setFaceStrikes(clampedFace)
        setVoiceStrikes(clampedVoice)
        console.log(`[Resume] Loaded strikes — face: ${clampedFace}, voice: ${clampedVoice}`)
      }
      // ── End strike loading ────────────────────────────────────────────────────

      const { data: qs } = await supabase.from('questions').select('*').eq('exam_id', examId).order('question_number')
      setQuestions(qs ?? [])
      questionsRef.current = qs ?? []
      setLoading(false)

      await startWebcam()
      setReadyToStart(true)
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examId])

  // ── Core submit logic (reads from refs — always has fresh data) ───────────
  const handleSubmit = useCallback(async (force = false) => {
    // Guard: don't double-submit
    if (submittedRef.current && !force) return
    if (!force && !window.confirm('Submit exam? You cannot change answers after submitting.')) return

    // ── Freeze everything immediately ──────────────────────────────────────
    submittedRef.current = true
    if (faceIntervalRef.current)  { clearInterval(faceIntervalRef.current);  faceIntervalRef.current  = null }
    if (voiceIntervalRef.current) { clearInterval(voiceIntervalRef.current); voiceIntervalRef.current = null }
    setProctorActive(false)
    stopAllProctoring()
    setShowStrike(false)
    setSubmitted(true)   // hides exam controls immediately
    setGrading(true)

    if (document.exitFullscreen) document.exitFullscreen().catch(()=>{})

    // ── Read from REFS (not state) — always fresh even in auto-submit ──────
    const currentAnswers   = answersRef.current
    const currentQuestions = questionsRef.current
    const uid              = userIdRef.current
    if (!uid) return

    const rMap: Record<string,GradeResult> = {}
    const submissionRows: object[] = []
    const now = new Date().toISOString()

    // ── Pass 1: Instant zero for all blank answers ─────────────────────────
    for (const q of currentQuestions) {
      const answer = (currentAnswers[q.id] ?? '').trim()
      if (!answer) {
        rMap[q.id] = { awarded_marks: 0, feedback: 'Question Not Attempted' }
        submissionRows.push({
          exam_id: examId, question_id: q.id, user_id: uid,
          student_answer: '', awarded_marks: 0,
          feedback: 'Question Not Attempted', graded_at: now,
        })
      }
    }
    setResults({ ...rMap })

    // ── Pass 2: Grade ALL attempted answers in PARALLEL ───────────────────
    const attempted = currentQuestions.filter(q => (currentAnswers[q.id] ?? '').trim())
    setGradingTotal(currentQuestions.length)
    setGradingProgress(Object.keys(rMap).length)   // blanks already done

    const gradePromises = attempted.map(async (q) => {
      const answer = currentAnswers[q.id].trim()
      try {
        const res  = await fetch(`${BACKEND}/api/grade`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question:        q.question_text,
            expected_answer: q.expected_answer,
            student_answer:  answer,
            max_marks:       q.marks,
          }),
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data    = await res.json()
        const awarded = Math.min(Math.max(data.awarded_marks ?? 0, 0), q.marks)
        const feedback = data.feedback ?? 'No feedback.'
        rMap[q.id] = { awarded_marks: awarded, feedback }
        submissionRows.push({
          exam_id: examId, question_id: q.id, user_id: uid,
          student_answer: answer, awarded_marks: awarded,
          feedback, graded_at: now,
        })
      } catch (err) {
        console.error(`[Grader] Failed for Q${q.question_number}:`, err)
        rMap[q.id] = { awarded_marks: 0, feedback: 'Grading failed — please review manually.' }
        submissionRows.push({
          exam_id: examId, question_id: q.id, user_id: uid,
          student_answer: answer, awarded_marks: 0,
          feedback: 'Grading failed — please review manually.', graded_at: now,
        })
      }
      // Update progress and results live as each question finishes
      setGradingProgress(prev => prev + 1)
      setResults(prev => ({ ...prev, [q.id]: rMap[q.id] }))
    })

    // Wait for all parallel grade calls to complete
    await Promise.allSettled(gradePromises)

    // ── Single batch Supabase insert for ALL rows ──────────────────────────
    if (submissionRows.length > 0) {
      const { error: insertErr } = await supabase.from('submissions').insert(submissionRows)
      if (insertErr) console.error('[Grader] Supabase insert error:', insertErr)
    }

    const obtained = Math.round(
      Object.values(rMap).reduce((sum, r) => sum + r.awarded_marks, 0) * 10
    ) / 10

    await supabase.from('exams').update({
      status: 'completed',
      obtained_marks: obtained,
    }).eq('id', examId)

    await supabase.from('logs').insert({
      exam_id: examId, user_id: uid, event_type: 'exam_submit',
      event_time: now,
      details: {
        obtained_marks:  obtained,
        face_strikes:    faceStrikesRef.current,
        voice_strikes:   voiceStrikesRef.current,
      },
    })

    setGrading(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examId])

  // ── Keep a stable ref to handleSubmit for use inside triggerViolation ─────
  const handleSubmitRef = useRef(handleSubmit)
  useEffect(() => { handleSubmitRef.current = handleSubmit }, [handleSubmit])

  // ── Derived values ────────────────────────────────────────────────────────
  const answeredCount = Object.values(answers).filter(a=>a.trim()).length
  const obtainedMarks = Math.round(Object.values(results).reduce((s,r)=>s+r.awarded_marks,0)*10)/10
  const allGraded     = submitted && !grading && Object.keys(results).length === questions.length

  // ── Loading screen ────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ minHeight:'100dvh',background:'var(--color-bg)',display:'flex',alignItems:'center',justifyContent:'center' }}>
      <div style={{ textAlign:'center' }}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" style={{ animation:'spin 1s linear infinite',margin:'0 auto 12px' }}>
          <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
        </svg>
        <p style={{ color:'var(--color-text-muted)',fontSize:'var(--text-sm)' }}>Loading exam…</p>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes blink{0%,100%{opacity:1}50%{opacity:0.3}}`}</style>
    </div>
  )

  // ── Error screen ──────────────────────────────────────────────────────────
  if (error) return (
    <div style={{ minHeight:'100dvh',background:'var(--color-bg)',display:'flex',alignItems:'center',justifyContent:'center' }}>
      <div style={{ textAlign:'center' }}>
        <p style={{ fontSize:'var(--text-lg)',fontWeight:600,color:'var(--color-error)',marginBottom:8 }}>{error}</p>
        <button onClick={()=>router.push('/dashboard')} style={{ color:'var(--color-primary)',background:'none',border:'none',cursor:'pointer',fontSize:'var(--text-sm)' }}>← Back to Dashboard</button>
      </div>
    </div>
  )

  // ── Main render ───────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight:'100dvh',background:'var(--color-bg)' }}>
      <style>{`
        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes fadeIn  { from { opacity:0; } to { opacity:1; } }
        @keyframes blink   { 0%,100%{opacity:1} 50%{opacity:0.3} }
      `}</style>

      <canvas ref={canvasRef} style={{ display:'none' }} />

      {/* Begin Exam overlay */}
      {readyToStart && !submitted && (
        <div style={{ position:'fixed',inset:0,zIndex:9998,background:'var(--color-bg)',display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:'var(--space-6)' }}>
          <div style={{ textAlign:'center',maxWidth:420,padding:'var(--space-8)' }}>
            <div style={{ width:64,height:64,borderRadius:'50%',background:'var(--color-primary-highlight)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto var(--space-4)' }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            </div>
            <h2 style={{ fontSize:'var(--text-xl)',fontWeight:800,color:'var(--color-text)',marginBottom:'var(--space-2)' }}>{examTitle}</h2>
            <p style={{ fontSize:'var(--text-sm)',color:'var(--color-text-muted)',marginBottom:'var(--space-4)',lineHeight:1.6 }}>
              Your exam is ready. Verify your face in the preview below, then click Begin.
            </p>
            <div style={{ position:'relative',background:'#000',borderRadius:'var(--radius-xl)',overflow:'hidden',aspectRatio:'4/3',maxWidth:280,margin:'0 auto var(--space-4)',border:'2px solid var(--color-border)',boxShadow:'var(--shadow-md)' }}>
              <video ref={overlayVideoRef} muted playsInline autoPlay
                style={{ width:'100%',height:'100%',objectFit:'cover',transform:'scaleX(-1)',display:'block' }} />
              <svg style={{ position:'absolute',inset:0,width:'100%',height:'100%',pointerEvents:'none' }} viewBox="0 0 280 210">
                <ellipse cx="140" cy="105" rx="65" ry="85" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeDasharray="8 4" />
              </svg>
              <div style={{ position:'absolute',bottom:6,left:8,display:'flex',alignItems:'center',gap:4 }}>
                <div style={{ width:6,height:6,borderRadius:'50%',background:'#ef4444',animation:'blink 1.5s ease-in-out infinite' }} />
                <span style={{ fontSize:10,color:'rgba(255,255,255,0.85)',fontWeight:600 }}>CAMERA</span>
              </div>
            </div>
            {preExamError && (
              <div style={{ padding:'12px 14px',borderRadius:'var(--radius-lg)',background:'var(--color-error-highlight)',border:'1px solid color-mix(in oklch,var(--color-error) 30%,transparent)',marginBottom:'var(--space-4)',textAlign:'left' }}>
                <p style={{ fontSize:'var(--text-sm)',color:'var(--color-error)',fontWeight:600,margin:0 }}>⚠️ {preExamError}</p>
                <p style={{ fontSize:'var(--text-xs)',color:'var(--color-error)',margin:'4px 0 0',opacity:0.8 }}>Please adjust and try again.</p>
              </div>
            )}
            <button
              disabled={verifyingFace}
              onClick={async () => {
                const ok = await runPreExamFaceCheck()
                if (ok) startProctoring(userId!)
              }}
              style={{ width:'100%',padding:'16px',borderRadius:'var(--radius-xl)',background:verifyingFace?'var(--color-surface-offset)':'var(--color-primary)',color:verifyingFace?'var(--color-text-muted)':'var(--color-text-inverse)',fontSize:'var(--text-base)',fontWeight:700,border:'none',cursor:verifyingFace?'not-allowed':'pointer',boxShadow:'var(--shadow-lg)',transition:'all 0.2s' }}>
              {verifyingFace ? '🔍 Verifying your face…' : preExamError ? '↺ Try Again' : 'Begin Exam →'}
            </button>
            <p style={{ marginTop:'var(--space-3)',fontSize:'var(--text-xs)',color:'var(--color-text-faint)' }}>
              Camera &amp; mic access will be requested. Duration: {durationMinutes} min · {questions.length} questions · {totalMarks} marks
            </p>
          </div>
        </div>
      )}

      {/* Strike overlay */}
      {showStrike && strikeInfo && (
        <StrikeOverlay
          strike={strikeInfo.strike} max={strikeInfo.max}
          reason={strikeInfo.reason} type={strikeInfo.type}
          onDismiss={() => setShowStrike(false)}
        />
      )}

      {/* Live webcam preview — bottom right */}
      <WebcamPreview videoRef={videoRef} active={(proctorActive || readyToStart) && !submitted} />

      {/* Header */}
      <header style={{ position:'sticky',top:0,zIndex:40,background:'color-mix(in oklch,var(--color-bg) 90%,transparent)',backdropFilter:'blur(8px)',borderBottom:'1px solid var(--color-divider)' }}>
        <div style={{ maxWidth:'var(--content-default)',margin:'0 auto',padding:'0 var(--space-6)',height:56,display:'flex',alignItems:'center',justifyContent:'space-between',gap:16 }}>
          <div style={{ flex:1,minWidth:0 }}>
            <p style={{ fontSize:'var(--text-base)',fontWeight:700,color:'var(--color-text)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{examTitle}</p>
            <p style={{ fontSize:'var(--text-xs)',color:'var(--color-text-muted)' }}>{questions.length} questions · {totalMarks} marks · {durationMinutes} min</p>
          </div>
          <div style={{ display:'flex',alignItems:'center',gap:12,flexShrink:0 }}>
            {proctorActive && !submitted && (
              <div style={{ display:'flex',alignItems:'center',gap:4 }} title="Face / Tab strikes">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-faint)" strokeWidth="2" strokeLinecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                {Array.from({length:MAX_FACE_STRIKES}).map((_,i)=>(
                  <div key={i} style={{ width:7,height:7,borderRadius:'50%',background:i<faceStrikes?'var(--color-error)':'var(--color-surface-offset)',border:`1.5px solid ${i<faceStrikes?'var(--color-error)':'var(--color-border)'}`,transition:'background 0.3s' }} />
                ))}
              </div>
            )}
            {proctorActive && !submitted && (
              <div style={{ display:'flex',alignItems:'center',gap:4 }} title="Voice strikes">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-faint)" strokeWidth="2" strokeLinecap="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/></svg>
                {Array.from({length:MAX_VOICE_STRIKES}).map((_,i)=>(
                  <div key={i} style={{ width:7,height:7,borderRadius:'50%',background:i<voiceStrikes?'var(--color-orange)':'var(--color-surface-offset)',border:`1.5px solid ${i<voiceStrikes?'var(--color-orange)':'var(--color-border)'}`,transition:'background 0.3s' }} />
                ))}
              </div>
            )}
            {!submitted && (
              <p style={{ fontSize:'var(--text-xs)',color:'var(--color-text-muted)' }}>
                <span style={{ fontWeight:700,color:'var(--color-text)' }}>{answeredCount}</span>/{questions.length} answered
              </p>
            )}
            {proctorActive && !submitted && (
              <ExamTimer durationMinutes={durationMinutes} onExpire={() => handleSubmitRef.current(true)} />
            )}
            {grading && (
              <p style={{ fontSize:'var(--text-xs)',color:'var(--color-primary)',fontWeight:600 }}>
                Grading {gradingProgress}/{questions.length}…
              </p>
            )}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main style={{ maxWidth:'var(--content-default)',margin:'0 auto',padding:'var(--space-8) var(--space-6)' }}>

        {/* Grading progress banner — shown while grading, replaced by results summary when done */}
        {grading && <GradingBanner done={gradingProgress} total={gradingTotal || questions.length} />}
        {allGraded && <ResultsSummary totalMarks={totalMarks} obtainedMarks={obtainedMarks} totalQuestions={questions.length} router={router} />}

        <div style={{ display:'flex',flexDirection:'column',gap:'var(--space-5)' }}>
          {questions.map((q,i)=>(
            <QuestionCard key={q.id} question={q} index={i} total={questions.length}
              answer={answers[q.id]??''} onChange={v=>setAnswers(p=>({...p,[q.id]:v}))}
              result={results[q.id]} submitted={submitted} />
          ))}
        </div>

        {!submitted && (
          <div style={{ position:'sticky',bottom:'var(--space-6)',display:'flex',justifyContent:'center',marginTop:'var(--space-8)' }}>
            <button onClick={()=>handleSubmit(false)} style={{ padding:'14px 40px',borderRadius:'var(--radius-xl)',background:'var(--color-primary)',color:'var(--color-text-inverse)',fontSize:'var(--text-base)',fontWeight:700,border:'none',cursor:'pointer',boxShadow:'var(--shadow-lg)',display:'flex',alignItems:'center',gap:10 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
              Submit Exam ({answeredCount}/{questions.length} answered)
            </button>
          </div>
        )}
      </main>
    </div>
  )
}