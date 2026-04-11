// client/src/App.jsx
import React, { useState, useCallback } from 'react'
import { initStore, getSession, logout } from './data/store'
import { useStore } from './data/useStore'
import { Login, ForgotPassword, CreateAccount } from './components/auth/Login.jsx'
import { Shell } from './components/layout/Shell.jsx'
import { ToastContainer } from './components/ui/Toast.jsx'
import { Dashboard, Coverage } from './components/pages/Dashboard.jsx'
import { Schedule } from './components/pages/Schedule.jsx'
import { Employees, Leaves, Settings, Profile } from './components/pages/Employees.jsx'
import { ShiftRequests } from './components/pages/ShiftRequests.jsx'
import { MySchedule, ShiftRequestForm, ApplyLeave, MyLeaves } from './components/pages/AgentPages.jsx'

initStore()

export default function App() {
  const [user,     setUser]     = useState(()=>getSession())
  // authView: 'login' | 'forgot' | 'create'
  const [authView, setAuthView] = useState('login')
  const [page,     setPage]     = useState(()=>{
    const u = getSession()
    return u?.role==='admin' ? 'dashboard' : 'my-schedule'
  })
  const [toasts, setToasts] = useState([])

  const toast = useCallback((msg, type='info') => {
    const id = Date.now() + Math.random()
    setToasts(prev=>[...prev,{id,msg,type}])
    setTimeout(()=>setToasts(prev=>prev.filter(t=>t.id!==id)), 3500)
  }, [])

  const storeData = useStore(user)

  const handleLogin = (u) => {
    setUser(u)
    setPage(u.role==='admin' ? 'dashboard' : 'my-schedule')
    setAuthView('login')
    toast(`Welcome, ${u.name}! 👋`, 'success')
    storeData.refresh()
  }

  const handleUserUpdate = () => {
    try {
      const raw = localStorage.getItem('sf_user')
      if (raw) setUser(JSON.parse(raw))
    } catch {}
    storeData.refresh()
  }

  // ── Not logged in ─────────────────────────────────────────
  if (!user) {
    if (authView === 'forgot')
      return <ForgotPassword onBack={()=>setAuthView('login')} />
    if (authView === 'create')
      return <CreateAccount onBack={()=>setAuthView('login')} onLogin={handleLogin} />
    return (
      <Login
        onLogin={handleLogin}
        onForgot={()=>setAuthView('forgot')}
        onCreateAccount={()=>setAuthView('create')}
      />
    )
  }

  // ── Loading state ─────────────────────────────────────────
  if (storeData.loading && storeData.agents.length === 0) {
    return (
      <div style={{
        display:'flex', alignItems:'center', justifyContent:'center',
        height:'100vh', background:'#0d1117', color:'#8b949e',
        flexDirection:'column', gap:16
      }}>
        <div style={{fontSize:36}}>⏱</div>
        <div style={{fontSize:15, fontWeight:600}}>ShiftApp Pro</div>
        <div style={{fontSize:13}}>Connecting to MongoDB…</div>
        <div className="spinner" style={{marginTop:8, width:24, height:24, borderWidth:3}}/>
      </div>
    )
  }

  // ── Error state ───────────────────────────────────────────
  if (storeData.error) {
    return (
      <div style={{
        display:'flex', alignItems:'center', justifyContent:'center',
        height:'100vh', background:'#0d1117', color:'#f87171',
        flexDirection:'column', gap:14, padding:32, textAlign:'center'
      }}>
        <div style={{fontSize:44}}>⚠️</div>
        <h2 style={{color:'var(--text)'}}>Cannot connect to server</h2>
        <p style={{color:'#8b949e', maxWidth:440, lineHeight:1.6}}>{storeData.error}</p>
        <div style={{
          background:'#161b22', border:'1px solid #30363d', borderRadius:8,
          padding:'12px 20px', fontSize:13, color:'#8b949e', marginTop:4
        }}>
          <div>Make sure the server is running:</div>
          <code style={{color:'#58a6ff'}}>cd server && npm run dev</code>
          <div style={{marginTop:8}}>Then make sure MongoDB is running:</div>
          <code style={{color:'#58a6ff'}}>Windows: net start MongoDB</code>
        </div>
        <div style={{display:'flex', gap:10, marginTop:8}}>
          <button className="btn btn-primary" onClick={()=>storeData.refresh()}>🔄 Retry</button>
          <button className="btn btn-outline" onClick={()=>{ logout(); setUser(null) }}>← Back to Login</button>
        </div>
      </div>
    )
  }

  const sharedProps = { user, toast, onRefresh: storeData.refresh, storeData }

  const renderPage = () => {
    switch(page) {
      case 'dashboard':      return <Dashboard {...sharedProps} onNav={setPage}/>
      case 'schedule':       return <Schedule  {...sharedProps}/>
      case 'coverage':       return <Coverage  {...sharedProps}/>
      case 'shift-requests': return <ShiftRequests toast={toast} storeData={storeData}/>
      case 'leaves':         return <Leaves    toast={toast} storeData={storeData}/>
      case 'employees':      return <Employees toast={toast} storeData={storeData}/>
      case 'settings':       return <Settings  toast={toast} storeData={storeData}/>
      case 'profile':        return <Profile   {...sharedProps} onUserUpdate={handleUserUpdate}/>
      case 'my-schedule':    return <MySchedule    user={user} storeData={storeData}/>
      case 'shift-request':  return <ShiftRequestForm user={user} toast={toast} storeData={storeData}/>
      case 'apply-leave':    return <ApplyLeave {...sharedProps}/>
      case 'my-leaves':      return <MyLeaves   {...sharedProps}/>
      default:
        return user.role==='admin'
          ? <Dashboard {...sharedProps} onNav={setPage}/>
          : <MySchedule user={user} storeData={storeData}/>
    }
  }

  return (
    <>
      <Shell user={user} page={page} onNav={setPage}
        pendingLeaves={storeData.pendingLeaves}
        pendingRequests={storeData.pendingRequests}>
        {renderPage()}
      </Shell>
      <ToastContainer toasts={toasts}/>
    </>
  )
}
