'use client'


import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'


const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'


// ─── Types ────────────────────────────────────────────────────────────────────
interface CameraDevice { deviceId: string; label: string }
interface Profile {
  full_name: string; age: string; gender: string
  college: string; course: string; city: string
}


// ─── Step Indicator ───────────────────────────────────────────────────────────
function StepBar({ current }: { current: number }) {
  const steps = ['Basic Info', 'Face Enrollment', 'Done']
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 'var(--space-8)' }}>
      {steps.map((s, i) => {
        const done    = i < current
        const active  = i === current
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', flex: i < steps.length - 1 ? 1 : 'auto' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: done ? 'var(--color-primary)' : active ? 'var(--color-primary)' : 'var(--color-surface-offset)',
                border: `2px solid ${done || active ? 'var(--color-primary)' : 'var(--color-border)'}`,
                color: done || active ? '#fff' : 'var(--color-text-faint)',
                fontSize: 'var(--text-xs)', fontWeight: 700, flexShrink: 0,
              }}>
                {done
                  ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                  : i + 1}
              </div>
              <span style={{ fontSize: 'var(--text-xs)', color: active ? 'var(--color-primary)' : done ? 'var(--color-text-muted)' : 'var(--color-text-faint)', fontWeight: active ? 700 : 400, whiteSpace: 'nowrap' }}>
                {s}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div style={{ flex: 1, height: 2, background: done ? 'var(--color-primary)' : 'var(--color-border)', margin: '0 var(--space-2)', marginBottom: 20, transition: 'background 0.3s' }} />
            )}
          </div>
        )
      })}
    </div>
  )
}


// ─── Step 1: Basic Info ───────────────────────────────────────────────────────
function StepBasicInfo({ onDone, initialData }: { onDone: (p: Profile) => void; initialData?: Profile | null }) {
  const [form, setForm] = useState<Profile>(
    initialData ?? { full_name: '', age: '', gender: '', college: '', course: '', city: '' }
  )
  const [saving, setSaving] = useState(false)
  const set = (k: keyof Profile) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm(p => ({ ...p, [k]: e.target.value }))


  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.full_name.trim()) return
    setSaving(true)
    await new Promise(r => setTimeout(r, 300))
    onDone(form)
  }


  const inputStyle = {
    width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--color-border)', background: 'var(--color-surface-2)',
    color: 'var(--color-text)', fontSize: 'var(--text-sm)', fontFamily: 'inherit', outline: 'none',
  }


  return (
    <form onSubmit={submit}>
      <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 900, color: 'var(--color-text)', marginBottom: 4 }}>Tell us about yourself</h2>
      <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-6)' }}>This information will appear on your exam reports.</p>


      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
        {([
          ['full_name', 'Full Name', 'text', 'Shaurya Panhale'],
          ['age',       'Age',       'number', '20'],
          ['college',   'College / School', 'text', 'Your college name'],
          ['course',    'Course / Stream', 'text', 'e.g. B.Tech CS'],
          ['city',      'City',      'text', 'Your city'],
        ] as [keyof Profile, string, string, string][]).map(([k, label, type, ph]) => (
          <div key={k} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</label>
            <input type={type} placeholder={ph} value={form[k]} onChange={set(k)} style={inputStyle}
              onFocus={e => { e.target.style.borderColor = 'var(--color-primary)'; e.target.style.boxShadow = '0 0 0 3px color-mix(in oklch,var(--color-primary) 15%,transparent)' }}
              onBlur={e  => { e.target.style.borderColor = 'var(--color-border)'; e.target.style.boxShadow = 'none' }} />
          </div>
        ))}


        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Gender</label>
          <select value={form.gender} onChange={set('gender')} style={{ ...inputStyle, cursor: 'pointer' }}
            onFocus={e => { e.target.style.borderColor = 'var(--color-primary)'; e.target.style.boxShadow = '0 0 0 3px color-mix(in oklch,var(--color-primary) 15%,transparent)' }}
            onBlur={e  => { e.target.style.borderColor = 'var(--color-border)'; e.target.style.boxShadow = 'none' }}>
            <option value="">Select gender</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
            <option value="prefer_not_to_say">Prefer not to say</option>
          </select>
        </div>
      </div>


      <button type="submit" disabled={saving || !form.full_name.trim()} style={{
        width: '100%', padding: '12px', marginTop: 'var(--space-4)',
        borderRadius: 'var(--radius-lg)', background: 'var(--color-primary)',
        color: '#fff', fontSize: 'var(--text-sm)', fontWeight: 700,
        border: 'none', cursor: saving ? 'not-allowed' : 'pointer',
        opacity: saving || !form.full_name.trim() ? 0.6 : 1,
      }}>
        {saving ? 'Saving…' : 'Continue to Face Enrollment →'}
      </button>
    </form>
  )
}


// ─── Step 2: Face Enrollment ──────────────────────────────────────────────────
function StepFaceEnroll({ userId, onDone, savedPhotos = [] }: { userId: string; onDone: () => void; savedPhotos?: string[] }) {
  const videoRef   = useRef<HTMLVideoElement>(null)
  const canvasRef  = useRef<HTMLCanvasElement>(null)
  const streamRef  = useRef<MediaStream | null>(null)

  // FIX T1-C: showRetakeChoice is true when already enrolled — camera stays OFF until Retake is clicked
  const [showRetakeChoice, setShowRetakeChoice] = useState(savedPhotos.length >= 3)
  const [cameras,       setCameras]       = useState<CameraDevice[]>([])
  const [selectedCam,   setSelectedCam]   = useState<string>('')
  const [cameraReady,   setCameraReady]   = useState(false)
  const [cameraError,   setCameraError]   = useState('')
  const [photosTaken,   setPhotosTaken]   = useState(0)
  const [capturing,     setCapturing]     = useState(false)
  const [enrollDone,    setEnrollDone]    = useState(false)
  const [statusMsg,     setStatusMsg]     = useState('')
  const [errorMsg,      setErrorMsg]      = useState('')
  const [flashAnim,     setFlashAnim]     = useState(false)

  // FIX T1-C: track whether camera should be active — only true after Retake or fresh enrollment
  const [cameraActive,  setCameraActive]  = useState(false)


  const prompts = [
    'Photo 1 — Look straight at the camera',
    'Photo 2 — Turn your head slightly LEFT',
    'Photo 3 — Turn your head slightly RIGHT',
  ]


  // ── On mount: enumerate devices (permission request) but DO NOT start camera
  //    if already enrolled (showRetakeChoice === true). Camera starts only when
  //    cameraActive becomes true (set by Retake button or fresh enrollment path).
  useEffect(() => {
    async function listDevices() {
      try {
        await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
          .then(s => s.getTracks().forEach(t => t.stop())) // immediately release — just for permission + labels
        const devices = await navigator.mediaDevices.enumerateDevices()
        const videoDevices = devices
          .filter(d => d.kind === 'videoinput')
          .map(d => ({ deviceId: d.deviceId, label: d.label || `Camera ${d.deviceId.slice(0, 6)}` }))
        setCameras(videoDevices)

        const builtIn = videoDevices.find(d =>
          /(integrated|built.?in|facetime|hd webcam|ir camera|front|laptop)/i.test(d.label)
          && !/(oneplus|samsung|pixel|iphone|android|phone|mobile)/i.test(d.label)
        )
        const notPhone = videoDevices.find(d =>
          !/(oneplus|samsung|pixel|iphone|android|phone|mobile)/i.test(d.label)
        )
        const autoSelected = builtIn || notPhone || videoDevices[0]
        if (autoSelected) setSelectedCam(autoSelected.deviceId)

        // FIX T1-C: Only auto-start camera on fresh enrollment (not already enrolled)
        if (savedPhotos.length < 3) {
          setCameraActive(true)
        }
        // If already enrolled: cameraActive stays false → camera won't start
      } catch (err: any) {
        setCameraError('Camera permission denied. Please allow camera access in your browser settings.')
      }
    }
    listDevices()
    return () => stopCamera()
  }, [])


  // FIX T1-C: Camera only starts when BOTH selectedCam is set AND cameraActive is true
  useEffect(() => {
    if (selectedCam && cameraActive) startCamera(selectedCam)
  }, [selectedCam, cameraActive])


  function stopCamera() {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    setCameraReady(false)
  }


  async function startCamera(deviceId: string) {
    stopCamera()
    setCameraError('')
    setCameraReady(false)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: deviceId }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play()
          setCameraReady(true)
        }
      }
    } catch (err: any) {
      if (err.name === 'NotReadableError') {
        setCameraError('This camera is in use by another app (e.g. Teams, Zoom). Close them and try again.')
      } else if (err.name === 'NotAllowedError') {
        setCameraError('Camera permission denied. Click the lock icon in your address bar and allow camera.')
      } else {
        setCameraError(`Camera error: ${err.message}`)
      }
    }
  }


  // ── Reset all enrollment data, then activate camera ───────────────────────
  // FIX T1-C: handleReset now also sets cameraActive = true so camera starts after Retake
  async function handleReset() {
    try {
      await fetch(`${BACKEND}/api/face/reset/${userId}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' } })
    } catch { /* ignore */ }
    setPhotosTaken(0)
    setEnrollDone(false)
    setStatusMsg('')
    setErrorMsg('')
    setShowRetakeChoice(false)
    setCameraActive(true) // FIX T1-C: activate camera only NOW, when user explicitly clicked Retake
  }


  async function captureAndEnroll() {
    if (!cameraReady || !videoRef.current || !canvasRef.current) return
    setCapturing(true)
    setErrorMsg('')


    setFlashAnim(true)
    setTimeout(() => setFlashAnim(false), 300)


    const canvas = canvasRef.current
    canvas.width  = videoRef.current.videoWidth  || 1280
    canvas.height = videoRef.current.videoHeight || 720
    canvas.getContext('2d')!.drawImage(videoRef.current, 0, 0)
    const b64 = canvas.toDataURL('image/jpeg', 0.92)


    const photoIndex = photosTaken + 1
    setStatusMsg(`Sending photo ${photoIndex}/3 to server…`)


    try {
      const res  = await fetch(`${BACKEND}/api/face/enroll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, image_b64: b64, photo_index: photoIndex }),
      })
      const data = await res.json()


      if (!res.ok) {
        setErrorMsg(data.detail || 'Server error — please try again.')
        setCapturing(false)
        return
      }


      const newCount = photoIndex
      setPhotosTaken(newCount)
      setStatusMsg(data.message)


      if (data.enrolled) {
        setEnrollDone(true)
        stopCamera()
        setCameraActive(false)
      }
    } catch (err) {
      setErrorMsg('Could not reach backend. Is the server running?')
    }
    setCapturing(false)
  }


  // ── Show saved photos with Continue / Retake option ───────────────────────
  // Camera is OFF here — only activates when handleReset() is called via Retake button
  if (showRetakeChoice) return (
    <div>
      <h2 style={{ fontSize:'var(--text-xl)',fontWeight:900,color:'var(--color-text)',marginBottom:4 }}>Face Already Enrolled</h2>
      <p style={{ fontSize:'var(--text-sm)',color:'var(--color-text-muted)',marginBottom:'var(--space-5)' }}>Your face was enrolled previously. You can continue or retake all 3 photos.</p>
      <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'var(--space-3)',marginBottom:'var(--space-6)' }}>
        {savedPhotos.map((src, i) => (
          <div key={i} style={{ borderRadius:'var(--radius-lg)',overflow:'hidden',aspectRatio:'1',background:'#000',border:'2px solid var(--color-border)' }}>
            <img src={src} alt={`Enrolled photo ${i+1}`} style={{ width:'100%',height:'100%',objectFit:'cover',transform:'scaleX(-1)' }} />
          </div>
        ))}
      </div>
      <div style={{ display:'flex',gap:'var(--space-3)' }}>
        <button onClick={onDone} style={{ flex:1,padding:'12px',borderRadius:'var(--radius-lg)',background:'var(--color-primary)',color:'#fff',fontSize:'var(--text-sm)',fontWeight:700,border:'none',cursor:'pointer' }}>
          Continue with these photos
        </button>
        <button onClick={handleReset} style={{ padding:'12px 20px',borderRadius:'var(--radius-lg)',background:'var(--color-error-highlight)',color:'var(--color-error)',fontSize:'var(--text-sm)',fontWeight:700,border:'1px solid color-mix(in oklch,var(--color-error) 30%,transparent)',cursor:'pointer' }}>
          Retake
        </button>
      </div>
    </div>
  )


  if (enrollDone) return (
    <div style={{ textAlign: 'center', padding: 'var(--space-10) 0' }}>
      <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--color-success-highlight)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto var(--space-4)' }}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--color-success)" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
      </div>
      <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 800, color: 'var(--color-text)', marginBottom: 8 }}>Face Enrolled!</h3>
      <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-6)' }}>All 3 photos saved. Your face will be verified during every exam.</p>
      <button onClick={onDone} style={{ padding: '12px 32px', borderRadius: 'var(--radius-lg)', background: 'var(--color-primary)', color: '#fff', fontSize: 'var(--text-sm)', fontWeight: 700, border: 'none', cursor: 'pointer' }}>
        Finish Setup
      </button>
    </div>
  )


  return (
    <div>
      <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 900, color: 'var(--color-text)', marginBottom: 4 }}>Enroll Your Face</h2>
      <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-5)' }}>One-time setup. Your face will be verified during every exam.</p>


      {/* Camera selector */}
      {cameras.length > 1 && (
        <div style={{ marginBottom: 'var(--space-4)' }}>
          <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>
            Select Camera
          </label>
          <select value={selectedCam} onChange={e => setSelectedCam(e.target.value)} style={{
            width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--color-border)', background: 'var(--color-surface-2)',
            color: 'var(--color-text)', fontSize: 'var(--text-sm)', fontFamily: 'inherit', cursor: 'pointer',
          }}>
            {cameras.map(c => (
              <option key={c.deviceId} value={c.deviceId}>
                {c.label}
                {/(oneplus|samsung|pixel|iphone|android|phone|mobile)/i.test(c.label) ? ' (phone — avoid)' : ' (recommended)'}
              </option>
            ))}
          </select>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)', marginTop: 4 }}>
            Choose your laptop's built-in camera. Avoid phone cameras.
          </p>
        </div>
      )}


      {/* Progress dots */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-3)', padding: '10px 14px', background: 'var(--color-surface-offset)', borderRadius: 'var(--radius-lg)' }}>
        <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-primary)', fontWeight: 600, flex: 1 }}>
          {photosTaken < 3 ? prompts[photosTaken] : 'All photos captured!'}
        </span>
        <div style={{ display: 'flex', gap: 6 }}>
          {[0,1,2].map(i => (
            <div key={i} style={{ width: 10, height: 10, borderRadius: '50%',
              background: i < photosTaken ? 'var(--color-primary)' : 'var(--color-border)',
              transition: 'background 0.3s' }} />
          ))}
        </div>
      </div>


      {/* Camera preview */}
      <div style={{ position: 'relative', background: '#000', borderRadius: 'var(--radius-xl)', overflow: 'hidden', aspectRatio: '16/10', marginBottom: 'var(--space-4)' }}>
        {flashAnim && <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.6)', zIndex: 10, pointerEvents: 'none', animation: 'flashOut 0.3s ease forwards' }} />}

        <video ref={videoRef} muted playsInline autoPlay
          style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)', display: 'block' }} />
        <canvas ref={canvasRef} style={{ display: 'none' }} />

        {cameraReady && (
          <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }} viewBox="0 0 640 400">
            <ellipse cx="320" cy="200" rx="120" ry="155"
              fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2" strokeDasharray="8 4" />
          </svg>
        )}

        {!cameraReady && !cameraError && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2" strokeLinecap="round" style={{ animation: 'spin 1s linear infinite' }}>
              <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
            </svg>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 'var(--text-sm)' }}>Starting camera…</p>
          </div>
        )}

        {cameraError && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 'var(--space-6)', textAlign: 'center' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--color-error)" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <p style={{ color: 'var(--color-error)', fontSize: 'var(--text-sm)', fontWeight: 600 }}>{cameraError}</p>
            <button onClick={() => startCamera(selectedCam)} style={{ padding: '8px 20px', borderRadius: 'var(--radius-lg)', background: 'var(--color-primary)', color: '#fff', fontSize: 'var(--text-xs)', fontWeight: 600, border: 'none', cursor: 'pointer' }}>
              Retry
            </button>
          </div>
        )}
      </div>


      {statusMsg && !errorMsg && (
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-3)', textAlign: 'center' }}>{statusMsg}</p>
      )}
      {errorMsg && (
        <div style={{ padding: '10px 14px', borderRadius: 'var(--radius-lg)', background: 'var(--color-error-highlight)', border: '1px solid color-mix(in oklch,var(--color-error) 30%,transparent)', marginBottom: 'var(--space-3)' }}>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-error)', fontWeight: 600 }}>{errorMsg}</p>
        </div>
      )}


      <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
        <button onClick={captureAndEnroll} disabled={!cameraReady || capturing || photosTaken >= 3} style={{
          flex: 1, padding: '12px', borderRadius: 'var(--radius-lg)',
          background: !cameraReady || capturing || photosTaken >= 3 ? 'var(--color-surface-offset)' : 'var(--color-primary)',
          color: !cameraReady || capturing || photosTaken >= 3 ? 'var(--color-text-muted)' : '#fff',
          fontSize: 'var(--text-sm)', fontWeight: 700, border: 'none',
          cursor: !cameraReady || capturing || photosTaken >= 3 ? 'not-allowed' : 'pointer',
        }}>
          {capturing ? 'Capturing…' : photosTaken >= 3 ? 'All photos taken' : `Take Photo ${photosTaken + 1} of 3`}
        </button>

        {photosTaken > 0 && !enrollDone && (
          <button onClick={handleReset} style={{
            padding: '12px 16px', borderRadius: 'var(--radius-lg)',
            background: 'var(--color-surface-offset)', color: 'var(--color-text-muted)',
            fontSize: 'var(--text-sm)', fontWeight: 600,
            border: '1px solid var(--color-border)', cursor: 'pointer',
          }}>
            Restart
          </button>
        )}
      </div>


      <style>{`
        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes flashOut { 0%{opacity:1} 100%{opacity:0} }
      `}</style>
    </div>
  )
}


// ─── Step 3: Done ─────────────────────────────────────────────────────────────
function StepDone({ name, router }: { name: string; router: ReturnType<typeof useRouter> }) {
  return (
    <div style={{ textAlign: 'center', padding: 'var(--space-10) 0' }}>
      <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--color-success-highlight)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto var(--space-4)' }}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--color-success)" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
      </div>
      <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 900, color: 'var(--color-text)', marginBottom: 8 }}>
        You are all set, {name.split(' ')[0]}!
      </h2>
      <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-6)', maxWidth: '38ch', margin: '0 auto var(--space-6)' }}>
        Profile complete. You can now schedule exams — proctoring will be fully active.
      </p>
      <button onClick={() => router.push('/dashboard')} style={{
        padding: '12px 32px', borderRadius: 'var(--radius-lg)',
        background: 'var(--color-primary)', color: '#fff',
        fontSize: 'var(--text-sm)', fontWeight: 700, border: 'none', cursor: 'pointer',
      }}>
        Go to Dashboard
      </button>
    </div>
  )
}


// ─── Main Profile Page ────────────────────────────────────────────────────────
export default function ProfilePage() {
  const router   = useRouter()
  const supabase = createClient()


  const [step,           setStep]          = useState(0)
  const [userId,         setUserId]        = useState('')
  const [profile,        setProfile]       = useState<Profile | null>(null)
  const [enrolledPhotos, setEnrolledPhotos] = useState<string[]>([])
  const [loading,        setLoading]       = useState(true)


  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUserId(user.id)


      const { data } = await supabase
        .from('user_profiles')
        .select('full_name,age,gender,college,course,city,face_enrolled')
        .eq('user_id', user.id).single()


      if (data?.full_name) {
        setProfile(data as Profile)
        setStep(0)
      }


      if (user.id) {
        try {
          const faceRes  = await fetch(`${BACKEND}/api/face/status/${user.id}`)
          const faceData = await faceRes.json()
          if (faceData.enrolled && faceData.photos?.length) {
            setEnrolledPhotos(faceData.photos)
          }
        } catch { /* ignore */ }
      }


      setLoading(false)
    }
    load()
  }, [])


  async function handleBasicInfoDone(p: Profile) {
    setProfile(p)
    await supabase.from('user_profiles').upsert({
      user_id:    userId,
      full_name:  p.full_name,
      age:        parseInt(p.age) || null,
      gender:     p.gender,
      college:    p.college,
      course:     p.course,
      city:       p.city,
      face_enrolled: false,
    })
    setStep(1)
  }


  async function handleFaceEnrollDone() {
    await supabase.from('user_profiles').update({ face_enrolled: true }).eq('user_id', userId)
    setStep(2)
  }


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
      <header style={{ position: 'sticky', top: 0, zIndex: 40, background: 'color-mix(in oklch,var(--color-surface) 95%,transparent)', backdropFilter: 'blur(8px)', borderBottom: '1px solid var(--color-divider)' }}>
        <div style={{ maxWidth: 'var(--content-default)', margin: '0 auto', padding: '0 var(--space-6)', height: 56, display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => router.push('/dashboard')} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
            Dashboard
          </button>
          <span style={{ color: 'var(--color-border)' }}>|</span>
          <span style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--color-text)' }}>Profile Setup</span>
        </div>
      </header>


      <main style={{ maxWidth: 540, margin: '0 auto', padding: 'var(--space-10) var(--space-6)' }}>
        <StepBar current={step} />


        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-8)', boxShadow: 'var(--shadow-md)' }}>
          {step === 0 && <StepBasicInfo onDone={handleBasicInfoDone} initialData={profile} />}
          {step === 1 && <StepFaceEnroll userId={userId} onDone={handleFaceEnrollDone} savedPhotos={enrolledPhotos} />}
          {step === 2 && <StepDone name={profile?.full_name || ''} router={router} />}
        </div>


        {step === 2 && (
          <button onClick={() => setStep(1)} style={{
            display: 'block', margin: 'var(--space-4) auto 0',
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--color-text-faint)', fontSize: 'var(--text-xs)',
            textDecoration: 'underline',
          }}>
            Re-enroll face
          </button>
        )}
      </main>
    </div>
  )
}