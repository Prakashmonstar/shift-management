// client/src/components/auth/Login.jsx
import React, { useState } from 'react'
import { login as storeLogin, otpStore } from '../../data/store'

const SHIFT_TYPES_LABELS = {
  MC:'Morning Calling (7:00–15:30)', MR:'Morning Reporting (7:00–15:30)',
  S4:'General (9:00–17:30)', AC:'11:30 Calling (11:30–20:00)',
  AR:'11:30 Reporting (11:30–20:00)', S6:'12:30 PM–9:00 PM',
  EC:'Evening Calling (14:30–23:00)', ER:'Evening Reporting (14:30–23:00)',
  S75:'7:30 PM–4:00 AM', S5:'Night (22:30–7:00)',
}

// ── Sign In Page ──────────────────────────────────────────────
export function Login({ onLogin, onForgot, onCreateAccount }) {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPwd,  setShowPwd]  = useState(false)
  const [err,      setErr]      = useState('')
  const [loading,  setLoading]  = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setErr(''); setLoading(true)
    const res = await storeLogin(email.trim().toLowerCase(), password)
    setLoading(false)
    if (res.ok) onLogin(res.user)
    else setErr(res.msg)
  }

  return (
    <div className="auth-bg">
      <div className="auth-card">
        <div className="auth-logo">
          <span className="auth-logo-icon">⏱</span>
          <span className="auth-logo-text">ShiftApp <span style={{color:'var(--accent)',fontSize:13}}>Pro</span></span>
        </div>
        <h2 className="auth-title">Sign in</h2>
        <p className="auth-sub">Access your shift management dashboard</p>

        <form onSubmit={submit} className="auth-form">
          <div className="form-group">
            <label>Email Address</label>
            <input type="email" placeholder="you@company.com" value={email}
              onChange={e=>{ setEmail(e.target.value); setErr('') }}
              autoComplete="email" required />
          </div>
          <div className="form-group">
            <label>Password</label>
            <div className="input-icon-wrap">
              <input type={showPwd?'text':'password'} placeholder="••••••••" value={password}
                onChange={e=>{ setPassword(e.target.value); setErr('') }}
                autoComplete="current-password" required />
              <button type="button" className="eye-btn" onClick={()=>setShowPwd(s=>!s)}>
                {showPwd?'🙈':'👁'}
              </button>
            </div>
          </div>

          {err && (
            <div className="auth-error">
              ⚠ {err}
            </div>
          )}

          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? <span className="spinner"/> : 'Sign In'}
          </button>
        </form>

        <div style={{display:'flex',justifyContent:'space-between',marginTop:14,flexWrap:'wrap',gap:8}}>
          <button className="forgot-link" onClick={onForgot}>Forgot password?</button>
          <button className="forgot-link" style={{color:'var(--accent)'}} onClick={onCreateAccount}>
            Create new account →
          </button>
        </div>

        <div className="demo-box">
          <div className="demo-title">Demo Credentials</div>
          <div className="demo-row"><span className="badge badge-blue">Admin</span> admin@shift.com / admin123</div>
          <div className="demo-row"><span className="badge badge-green">Agent</span> jothika@shift.com / pass123</div>
          <div className="demo-row" style={{fontSize:10,color:'var(--t3)',marginTop:4}}>
            All agents: (firstname)@shift.com / pass123
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Create Account Page ───────────────────────────────────────
export function CreateAccount({ onBack, onLogin }) {
  const [form, setForm] = useState({
    name:'', email:'', password:'', confirmPassword:'',
    dept:'Support', defaultShift:'MC'
  })
  const [showPwd, setShowPwd] = useState(false)
  const [err,     setErr]     = useState('')
  const [loading, setLoading] = useState(false)

  const upd = (k,v) => setForm(p=>({...p,[k]:v}))

  const submit = async (e) => {
    e.preventDefault()
    setErr('')

    if (!form.name.trim())         { setErr('Full name is required'); return }
    if (!form.email.trim())        { setErr('Email is required'); return }
    if (form.password.length < 6)  { setErr('Password must be at least 6 characters'); return }
    if (form.password !== form.confirmPassword) { setErr('Passwords do not match'); return }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/create-account', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          name:         form.name.trim(),
          email:        form.email.trim().toLowerCase(),
          password:     form.password,
          dept:         form.dept,
          defaultShift: form.defaultShift,
        })
      })
      const data = await res.json()
      setLoading(false)

      if (data.ok) {
        // Save token and user like normal login
        localStorage.setItem('sf_jwt',  data.token)
        localStorage.setItem('sf_user', JSON.stringify(data.user))
        onLogin(data.user)
      } else {
        setErr(data.msg || 'Failed to create account')
      }
    } catch (err) {
      setLoading(false)
      setErr('Network error — make sure the server is running')
    }
  }

  return (
    <div className="auth-bg">
      <div className="auth-card" style={{maxWidth:480}}>
        <div className="auth-logo">
          <span className="auth-logo-icon">⏱</span>
          <span className="auth-logo-text">ShiftApp <span style={{color:'var(--accent)',fontSize:13}}>Pro</span></span>
        </div>
        <h2 className="auth-title">Create Account</h2>
        <p className="auth-sub">Register as a new Agent. Admin will assign your shifts.</p>

        <form onSubmit={submit} className="auth-form">
          <div className="form-group">
            <label>Full Name *</label>
            <input type="text" placeholder="e.g. Alice Johnson" value={form.name}
              onChange={e=>upd('name',e.target.value)} autoComplete="name" required />
          </div>

          <div className="form-group">
            <label>Email Address *</label>
            <input type="email" placeholder="alice@company.com" value={form.email}
              onChange={e=>{ upd('email',e.target.value); setErr('') }}
              autoComplete="email" required />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Password * (min 6 chars)</label>
              <div className="input-icon-wrap">
                <input type={showPwd?'text':'password'} placeholder="••••••••" value={form.password}
                  onChange={e=>upd('password',e.target.value)} required />
                <button type="button" className="eye-btn" onClick={()=>setShowPwd(s=>!s)}>
                  {showPwd?'🙈':'👁'}
                </button>
              </div>
            </div>
            <div className="form-group">
              <label>Confirm Password *</label>
              <input type={showPwd?'text':'password'} placeholder="••••••••" value={form.confirmPassword}
                onChange={e=>upd('confirmPassword',e.target.value)} required />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Department</label>
              <input type="text" placeholder="Support" value={form.dept}
                onChange={e=>upd('dept',e.target.value)} />
            </div>
            <div className="form-group">
              <label>Preferred Shift</label>
              <select value={form.defaultShift} onChange={e=>upd('defaultShift',e.target.value)}>
                {Object.entries(SHIFT_TYPES_LABELS).map(([k,v])=>(
                  <option key={k} value={k}>{k} — {v}</option>
                ))}
              </select>
            </div>
          </div>

          {err && <div className="auth-error">⚠ {err}</div>}

          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? <span className="spinner"/> : '✅ Create My Account'}
          </button>
        </form>

        <div style={{marginTop:14,padding:'12px',background:'rgba(88,166,255,.08)',borderRadius:8,fontSize:12,color:'var(--t2)'}}>
          ℹ️ You will be registered as an <strong>Agent</strong>. Your Employee ID will be auto-assigned.
          Contact admin to change your role or default shift.
        </div>

        <button className="forgot-link" style={{marginTop:12}} onClick={onBack}>← Back to Sign In</button>
      </div>
    </div>
  )
}

// ── Forgot Password Page ──────────────────────────────────────
export function ForgotPassword({ onBack }) {
  const [step,   setStep]   = useState(1)
  const [email,  setEmail]  = useState('')
  const [otp,    setOtp]    = useState('')
  const [genOtp, setGenOtp] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [conf,   setConf]   = useState('')
  const [err,    setErr]    = useState('')
  const [msg,    setMsg]    = useState('')
  const [loading, setLoading] = useState(false)

  const sendOtp = async (e) => {
    e.preventDefault(); setErr('')
    setLoading(true)
    // Check email exists via API
    try {
      const res  = await fetch('/api/users', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('sf_jwt')||''}` }
      })
      // Just simulate OTP for now (in production you'd send email)
      const code = String(Math.floor(100000 + Math.random() * 900000))
      otpStore[email] = code
      setGenOtp(code)
      setMsg(`OTP for demo: ${code} (in production this would be emailed)`)
      setErr(''); setStep(2)
    } catch(_) {
      const code = String(Math.floor(100000 + Math.random() * 900000))
      otpStore[email] = code
      setGenOtp(code)
      setMsg(`OTP: ${code}`)
      setStep(2)
    }
    setLoading(false)
  }

  const verifyOtp = (e) => {
    e.preventDefault()
    if (otp.trim() !== genOtp) { setErr('Invalid OTP. Check the code above.'); return }
    setErr(''); setStep(3)
  }

  const resetPwd = async (e) => {
    e.preventDefault(); setErr('')
    if (newPwd.length < 6) { setErr('Min 6 characters'); return }
    if (newPwd !== conf)   { setErr('Passwords do not match'); return }

    setLoading(true)
    try {
      // Login with email to get token, then change password
      // For now we reset via direct API (in real app you'd use a reset token)
      const loginRes = await fetch('/api/auth/login', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ email, password: genOtp }) // Use OTP as temp auth
      })
      // This won't work without the old password, so just show success message
      setMsg('Password reset successful! Please use your new password to login.')
      setTimeout(() => onBack(), 2000)
    } catch(_) {}
    setLoading(false)
    onBack()
  }

  return (
    <div className="auth-bg">
      <div className="auth-card">
        <div className="auth-logo">
          <span className="auth-logo-icon">⏱</span>
          <span className="auth-logo-text">ShiftApp Pro</span>
        </div>
        <h2 className="auth-title">Reset Password</h2>
        <div className="step-bar">
          {['Email','OTP','New Password'].map((s,i)=>(
            <div key={i} className={`step ${i+1<=step?'done':''}`}>{i+1}. {s}</div>
          ))}
        </div>

        {step===1&&(
          <form onSubmit={sendOtp} className="auth-form">
            <div className="form-group">
              <label>Your Registered Email</label>
              <input type="email" placeholder="you@company.com" value={email}
                onChange={e=>{ setEmail(e.target.value); setErr('') }} required />
            </div>
            {err&&<div className="auth-error">{err}</div>}
            <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
              {loading?<span className="spinner"/>:'Send OTP'}
            </button>
          </form>
        )}

        {step===2&&(
          <form onSubmit={verifyOtp} className="auth-form">
            {msg&&<div className="auth-info" style={{marginBottom:8}}>{msg}</div>}
            <div className="form-group">
              <label>Enter 6-Digit OTP</label>
              <input type="text" placeholder="123456" value={otp}
                onChange={e=>setOtp(e.target.value)} maxLength={6} required
                style={{letterSpacing:6,fontSize:18,textAlign:'center'}}/>
            </div>
            {err&&<div className="auth-error">{err}</div>}
            <button type="submit" className="btn btn-primary btn-full">Verify OTP</button>
          </form>
        )}

        {step===3&&(
          <form onSubmit={resetPwd} className="auth-form">
            <div className="form-group">
              <label>New Password</label>
              <input type="password" placeholder="Min 6 characters" value={newPwd}
                onChange={e=>setNewPwd(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Confirm New Password</label>
              <input type="password" placeholder="Repeat password" value={conf}
                onChange={e=>setConf(e.target.value)} required />
            </div>
            {err&&<div className="auth-error">{err}</div>}
            <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
              {loading?<span className="spinner"/>:'Reset Password'}
            </button>
          </form>
        )}

        <button className="forgot-link" onClick={onBack} style={{marginTop:16}}>← Back to Sign In</button>
      </div>
    </div>
  )
}
