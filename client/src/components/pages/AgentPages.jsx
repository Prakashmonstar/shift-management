import React, { useState, useEffect } from 'react'
import {
  SHIFT_TYPES, getWeekDates, getDayName, formatDate,
  getCurrentWeekKey, getNextWeekKey, getPrevWeekKey,
  applyLeave, cancelLeave, submitShiftRequest, cancelShiftRequest,
} from '../../data/store'

// ─── My Schedule ──────────────────────────────────────────────
export function MySchedule({ user, storeData }) {
  const { leaves, scheduleCache, loadSchedule } = storeData
  const [weekKey, setWeekKey] = useState(getCurrentWeekKey)
  const [lastRefresh, setLastRefresh] = useState(new Date())

  useEffect(() => { loadSchedule(weekKey) }, [weekKey])

  const dates    = getWeekDates(weekKey)
  const cached   = scheduleCache[weekKey] || { status:'draft', shifts:{} }
  const schedule = cached.shifts || {}
  const status   = cached.status || 'draft'
  const uid      = user._id || user.id
  const myLeaves = leaves.filter(l=>l.userId===uid && l.status==='approved')

  const getCell = (dateStr) => {
    const onLeave = myLeaves.some(l=>dateStr>=l.from&&dateStr<=l.to)
    if (onLeave) return 'LEAVE'
    return schedule[uid]?.[dateStr] || user.defaultShift || 'MC'
  }

  const weekLabel = () => {
    const d1=new Date(dates[0]), d2=new Date(dates[6])
    return `${d1.toLocaleDateString('en-GB',{day:'numeric',month:'short'})} – ${d2.toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})}`
  }

  const handleRefresh = () => {
    loadSchedule(weekKey)
    setLastRefresh(new Date())
  }

  const totalWork  = dates.filter(d=>{ const c=getCell(d); return c!=='OFF'&&c!=='LEAVE'&&c!=='COMP' }).length
  const totalOff   = dates.filter(d=>getCell(d)==='OFF').length
  const totalLeave = dates.filter(d=>getCell(d)==='LEAVE').length

  return (
    <div className="page">
      <div className="page-hd">
        <div>
          <h1>My Schedule</h1>
          <p className="sub">
            <span className="empid">{user.employeeId}</span>&nbsp;·&nbsp;
            <span className={`status-tag status-${status}`}>{status}</span>
            &nbsp;·&nbsp;Auto-refreshes every 30s · Last: {lastRefresh.toLocaleTimeString()}
          </p>
        </div>
        <button className="btn btn-sm btn-outline" onClick={handleRefresh}>🔄 Refresh</button>
      </div>

      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:16}}>
        <button className="btn btn-sm" onClick={()=>setWeekKey(getPrevWeekKey(weekKey))}>← Prev</button>
        <span className="week-lbl">📅 {weekLabel()}</span>
        <button className="btn btn-sm" onClick={()=>setWeekKey(getNextWeekKey(weekKey))}>Next →</button>
      </div>

      <div className="metrics-grid" style={{marginBottom:16}}>
        <div className="metric-card" style={{'--mc':'var(--blue)'}}><div className="mc-icon">💼</div><div className="mc-val" style={{color:'var(--blue)'}}>{totalWork}</div><div className="mc-label">Work Days</div></div>
        <div className="metric-card" style={{'--mc':'#6b7280'}}><div className="mc-icon">😴</div><div className="mc-val">{totalOff}</div><div className="mc-label">Days Off</div></div>
        <div className="metric-card" style={{'--mc':'var(--amber)'}}><div className="mc-icon">🌿</div><div className="mc-val" style={{color:'var(--amber)'}}>{totalLeave}</div><div className="mc-label">Leave Days</div></div>
        <div className="metric-card" style={{'--mc':'var(--purple)'}}><div className="mc-icon">⏱</div><div className="mc-val" style={{fontSize:12,color:'var(--purple)',marginTop:6}}>{status}</div><div className="mc-label">Week Status</div></div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:10}}>
        {dates.map(dateStr=>{
          const code=getCell(dateStr)
          const def=SHIFT_TYPES[code]||SHIFT_TYPES['MC']
          const dn=getDayName(dateStr)
          const isWE=dn==='Sat'||dn==='Sun'
          return (
            <div key={dateStr} style={{border:`2px solid ${isWE?'var(--border)':def.color}`,borderRadius:10,overflow:'hidden',opacity:code==='OFF'?.6:1}}>
              <div style={{background:isWE?'var(--s2)':def.color,padding:'8px 6px',textAlign:'center'}}>
                <div style={{fontSize:11,fontWeight:700,color:isWE?'var(--t2)':def.textColor}}>{dn}</div>
                <div style={{fontSize:18,fontWeight:800,color:isWE?'var(--text)':def.textColor}}>{new Date(dateStr).getDate()}</div>
                <div style={{fontSize:9,color:isWE?'var(--t3)':def.textColor,opacity:.8}}>{new Date(dateStr).toLocaleDateString('en-GB',{month:'short'})}</div>
              </div>
              <div style={{padding:'8px 6px',textAlign:'center',background:'var(--s2)'}}>
                <div style={{fontSize:11,fontWeight:700,color:def.color,marginBottom:2}}>{code}</div>
                <div style={{fontSize:9,color:'var(--t2)',lineHeight:1.3}}>{def.start?`${def.start}–${def.end}`:def.label}</div>
              </div>
            </div>
          )
        })}
      </div>

      <div style={{marginTop:16,display:'flex',gap:8,flexWrap:'wrap'}}>
        {Object.entries(SHIFT_TYPES).map(([k,d])=>(
          <div key={k} style={{display:'flex',alignItems:'center',gap:4,fontSize:11}}>
            <div style={{width:10,height:10,background:d.color,borderRadius:2}}/><span style={{color:'var(--t2)'}}>{k}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Shift Request Form ───────────────────────────────────────
export function ShiftRequestForm({ user, toast, storeData }) {
  const { requests, refreshRequests, scheduleCache, loadSchedule, leaves } = storeData
  const weekKey  = getCurrentWeekKey()
  const dates    = getWeekDates(weekKey)
  const uid      = user._id || user.id
  const cached   = scheduleCache[weekKey]
  const schedule = cached?.shifts || {}
  const myLeaves = leaves.filter(l=>l.userId===uid&&l.status==='approved')

  useEffect(()=>{ if(!cached) loadSchedule(weekKey) },[weekKey])

  const [form,   setForm]   = useState({ dateStr:dates[0]||'', requestedShift:'', reason:'' })
  const [err,    setErr]    = useState('')
  const [done,   setDone]   = useState(false)
  const [saving, setSaving] = useState(false)
  const [filterStatus, setFilterStatus] = useState('all')

  const getCurrentShift = (dateStr) => {
    const onLeave=myLeaves.some(l=>dateStr>=l.from&&dateStr<=l.to)
    if (onLeave) return 'LEAVE'
    return schedule[uid]?.[dateStr] || user.defaultShift || 'MC'
  }

  const currentShift = getCurrentShift(form.dateStr)
  const myReqs = requests.filter(r=>r.userId===uid)
  const shownReqs = filterStatus==='all' ? myReqs : myReqs.filter(r=>r.status===filterStatus)

  const submit = async (e) => {
    e.preventDefault(); setErr('')
    if (!form.requestedShift) { setErr('Select a requested shift'); return }
    if (!form.reason.trim())  { setErr('Reason is required'); return }
    if (form.requestedShift===currentShift) { setErr('Requested shift is same as current'); return }
    setSaving(true)
    try {
      await submitShiftRequest({ userId:uid, weekKey, dateStr:form.dateStr, currentShift, requestedShift:form.requestedShift, reason:form.reason.trim() })
      toast('Shift change request submitted!','success')
      await refreshRequests()
      setDone(true)
    } catch(e) { setErr(e.message) }
    setSaving(false)
  }

  const handleCancel = async (id) => {
    if (!window.confirm('Cancel this request?')) return
    try {
      await cancelShiftRequest(id)
      toast('Request cancelled','warning')
      await refreshRequests()
    } catch(e) { toast(e.message,'danger') }
  }

  if (done) return (
    <div className="page">
      <div className="page-hd"><h1>Request Shift Change</h1></div>
      <div className="card" style={{textAlign:'center',padding:40}}>
        <div style={{fontSize:48,marginBottom:14}}>✅</div>
        <h3 style={{marginBottom:8}}>Request Submitted!</h3>
        <p style={{color:'var(--t2)',marginBottom:20}}>Your shift change request has been sent to admin for review.</p>
        <button className="btn btn-primary" onClick={()=>setDone(false)}>Submit Another Request</button>
      </div>
    </div>
  )

  return (
    <div className="page">
      <div className="page-hd"><div><h1>Request Shift Change</h1><p className="sub">Submit a request to change your scheduled shift</p></div></div>
      <div className="two-col">
        <div className="card">
          <div className="card-title">Shift Change Request Form</div>
          {err&&<div className="auth-error" style={{marginBottom:12}}>⚠ {err}</div>}
          <form onSubmit={submit}>
            <div className="form-group"><label>Select Date</label>
              <select value={form.dateStr} onChange={e=>setForm(p=>({...p,dateStr:e.target.value}))}>
                {dates.map(d=><option key={d} value={d}>{getDayName(d)}, {new Date(d).toLocaleDateString('en-GB',{day:'numeric',month:'short'})}</option>)}
              </select>
            </div>
            <div className="form-group"><label>Current Assigned Shift</label>
              <div style={{padding:'10px 14px',borderRadius:8,fontWeight:600,fontSize:13,background:SHIFT_TYPES[currentShift]?.color||'#888',color:SHIFT_TYPES[currentShift]?.textColor||'#fff'}}>
                {currentShift} — {SHIFT_TYPES[currentShift]?.label||currentShift}
                {SHIFT_TYPES[currentShift]?.start&&` (${SHIFT_TYPES[currentShift].start} – ${SHIFT_TYPES[currentShift].end})`}
              </div>
            </div>
            <div className="form-group"><label>Requested Shift *</label>
              <select value={form.requestedShift} onChange={e=>setForm(p=>({...p,requestedShift:e.target.value}))} required>
                <option value="">— Select shift —</option>
                {Object.entries(SHIFT_TYPES).filter(([k])=>k!==currentShift&&k!=='LEAVE').map(([k,d])=>(
                  <option key={k} value={k}>{k} — {d.label}{d.start?` (${d.start}–${d.end})`:''}</option>
                ))}
              </select>
            </div>
            <div className="form-group"><label>Reason for Change *</label>
              <textarea rows={4} placeholder="Please provide a clear reason…" value={form.reason} onChange={e=>setForm(p=>({...p,reason:e.target.value}))} required/>
            </div>
            <button type="submit" className="btn btn-primary btn-full" disabled={!form.requestedShift||!form.reason.trim()||saving}>
              {saving?'Submitting…':'📤 Submit Request to Admin'}
            </button>
          </form>
        </div>

        <div className="card">
          <div className="card-title">My Previous Requests</div>
          {/* Status filter tabs */}
          <div style={{display:'flex',gap:6,marginBottom:12,flexWrap:'wrap'}}>
            {['all','pending','approved','rejected','cancelled'].map(s=>(
              <button key={s} className={`btn btn-xs ${filterStatus===s?'btn-primary':'btn-outline'}`}
                onClick={()=>setFilterStatus(s)} style={{textTransform:'capitalize',fontSize:11}}>
                {s}{s!=='all'&&` (${myReqs.filter(r=>r.status===s).length})`}
              </button>
            ))}
          </div>
          {shownReqs.length===0
            ? <div style={{color:'var(--t3)',fontSize:13,textAlign:'center',padding:20}}>No requests found</div>
            : shownReqs.map(r=>(
              <div key={r.id} className={`req-card req-${r.status}`} style={{marginBottom:8}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
                  <span style={{fontWeight:700,fontSize:13}}>{getDayName(r.dateStr)} · {new Date(r.dateStr).toLocaleDateString('en-GB',{day:'numeric',month:'short'})}</span>
                  <span className={`badge badge-${r.status==='approved'?'green':r.status==='rejected'?'red':r.status==='cancelled'?'gray':'amber'}`}>{r.status}</span>
                </div>
                <div style={{fontSize:12,color:'var(--t2)',marginBottom:4}}>
                  <span style={{background:SHIFT_TYPES[r.currentShift]?.color,color:SHIFT_TYPES[r.currentShift]?.textColor,padding:'1px 6px',borderRadius:4,fontSize:11,fontWeight:600}}>{r.currentShift}</span>
                  &nbsp;→&nbsp;
                  <span style={{background:SHIFT_TYPES[r.requestedShift]?.color,color:SHIFT_TYPES[r.requestedShift]?.textColor,padding:'1px 6px',borderRadius:4,fontSize:11,fontWeight:600}}>{r.requestedShift}</span>
                </div>
                <div style={{fontSize:11,color:'var(--t3)',fontStyle:'italic'}}>"{r.reason}"</div>
                {r.adminNote&&<div style={{fontSize:11,color:'var(--green)',marginTop:4}}>Admin: {r.adminNote}</div>}
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:4}}>
                  <span style={{fontSize:10,color:'var(--t3)'}}>{r.submittedAt?.slice(0,16)}</span>
                  {r.status==='pending'&&(
                    <button className="btn btn-xs btn-outline" onClick={()=>handleCancel(r.id)} style={{fontSize:10}}>⊘ Cancel</button>
                  )}
                </div>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  )
}

// ─── Apply Leave ──────────────────────────────────────────────
export function ApplyLeave({ user, toast, onRefresh, storeData }) {
  const { refreshLeaves } = storeData
  const today = new Date().toISOString().slice(0,10)
  const [form,   setForm]   = useState({ leaveType:'Casual', from:today, to:today, reason:'' })
  const [err,    setErr]    = useState('')
  const [saving, setSaving] = useState(false)

  const days = () => { const d=Math.ceil((new Date(form.to)-new Date(form.from))/86400000)+1; return d>0?d:0 }

  const submit = async (e) => {
    e.preventDefault(); setErr('')
    if (!form.reason.trim()) { setErr('Please provide a reason'); return }
    if (form.to < form.from) { setErr('End date must be after start'); return }
    setSaving(true)
    try {
      await applyLeave({ userId:user._id||user.id, ...form })
      toast('Leave application submitted!','success')
      setForm({ leaveType:'Casual', from:today, to:today, reason:'' })
      await refreshLeaves(); onRefresh()
    } catch(e) { setErr(e.message) }
    setSaving(false)
  }

  return (
    <div className="page">
      <div className="page-hd"><h1>Apply for Leave</h1></div>
      <div className="two-col">
        <div className="card">
          <div className="card-title">Leave Application Form</div>
          {err&&<div className="auth-error" style={{marginBottom:12}}>{err}</div>}
          <form onSubmit={submit}>
            <div className="form-group"><label>Leave Type</label>
              <select value={form.leaveType} onChange={e=>setForm(p=>({...p,leaveType:e.target.value}))}>
                {['Casual','Sick','Annual','Emergency','Comp Off','Maternity/Paternity'].map(t=><option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-row">
              <div className="form-group"><label>From Date</label><input type="date" value={form.from} min={today} onChange={e=>setForm(p=>({...p,from:e.target.value}))}/></div>
              <div className="form-group"><label>To Date</label><input type="date" value={form.to} min={form.from} onChange={e=>setForm(p=>({...p,to:e.target.value}))}/></div>
            </div>
            {days()>0&&<div style={{background:'rgba(37,99,235,.1)',borderRadius:8,padding:'8px 12px',fontSize:13,color:'var(--blue)',marginBottom:14}}>
              Duration: <strong>{days()} day{days()>1?'s':''}</strong>
            </div>}
            <div className="form-group"><label>Reason *</label>
              <textarea rows={3} value={form.reason} onChange={e=>setForm(p=>({...p,reason:e.target.value}))} placeholder="Brief reason for leave…" required/>
            </div>
            <button type="submit" className="btn btn-primary btn-full" disabled={!form.reason.trim()||saving}>
              {saving?'Submitting…':'Submit Application'}
            </button>
          </form>
        </div>
        <div className="card">
          <div className="card-title">Leave Policy</div>
          {[['Casual Leave','12 days/year'],['Sick Leave','10 days/year'],['Annual Leave','18 days/year'],['Emergency Leave','5 days/year']].map(([k,v])=>(
            <div key={k} className="info-row"><span className="info-label">{k}</span><span>{v}</span></div>
          ))}
          <div style={{marginTop:12,padding:'10px 12px',background:'var(--s2)',borderRadius:8,fontSize:12,color:'var(--t2)'}}>
            ⚠ Requests require admin approval. Minimum 3 agents per shift — plan ahead!
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── My Leaves ────────────────────────────────────────────────
export function MyLeaves({ user, toast, onRefresh, storeData }) {
  const { leaves, refreshLeaves } = storeData
  const uid = user._id || user.id
  const myLeaves = leaves.filter(l=>l.userId===uid)
  const [filterStatus, setFilterStatus] = useState('all')

  const shown = filterStatus==='all' ? myLeaves : myLeaves.filter(l=>l.status===filterStatus)

  const cancel = async (id) => {
    if (!window.confirm('Cancel this leave request?')) return
    try {
      await cancelLeave(id)
      toast('Leave cancelled','warning')
      await refreshLeaves(); onRefresh()
    } catch(e) { toast(e.message,'danger') }
  }

  return (
    <div className="page">
      <div className="page-hd"><h1>My Leave Requests</h1></div>
      <div className="metrics-grid" style={{marginBottom:16}}>
        {['pending','approved','rejected','cancelled'].map(s=>(
          <div key={s} className="metric-card" style={{'--mc':s==='approved'?'var(--green)':s==='rejected'?'var(--red)':s==='cancelled'?'#6b7280':'var(--amber)'}}>
            <div className="mc-val" style={{color:s==='approved'?'var(--green)':s==='rejected'?'var(--red)':s==='cancelled'?'#6b7280':'var(--amber)'}}>
              {myLeaves.filter(l=>l.status===s).length}
            </div>
            <div className="mc-label" style={{textTransform:'capitalize'}}>{s}</div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div style={{display:'flex',gap:6,marginBottom:12,flexWrap:'wrap'}}>
        {['all','pending','approved','rejected','cancelled'].map(s=>(
          <button key={s} className={`btn btn-xs ${filterStatus===s?'btn-primary':'btn-outline'}`}
            onClick={()=>setFilterStatus(s)} style={{textTransform:'capitalize',fontSize:11}}>
            {s}{s!=='all'&&` (${myLeaves.filter(l=>l.status===s).length})`}
          </button>
        ))}
      </div>

      {shown.length===0
        ? <div className="empty-state">No {filterStatus==='all'?'':filterStatus} leave requests.</div>
        : <div className="card card-np">
          <div className="tbl-wrap">
            <table>
              <thead><tr><th>Type</th><th>From</th><th>To</th><th>Days</th><th>Reason</th><th>Status</th><th>Applied</th><th>Actions</th></tr></thead>
              <tbody>
                {shown.map(l=>{
                  const days=Math.ceil((new Date(l.to)-new Date(l.from))/86400000)+1
                  return (
                    <tr key={l.id}>
                      <td><span className="badge badge-blue">{l.leaveType}</span></td>
                      <td style={{fontSize:12}}>{l.from}</td>
                      <td style={{fontSize:12}}>{l.to}</td>
                      <td style={{fontWeight:700}}>{days}</td>
                      <td style={{fontSize:12,maxWidth:140}}>{l.reason}</td>
                      <td>
                        <span className={`badge badge-${l.status==='approved'?'green':l.status==='rejected'?'red':l.status==='cancelled'?'gray':'amber'}`}>{l.status}</span>
                        {l.remark&&<div style={{fontSize:10,color:'var(--t3)',marginTop:2}}>{l.remark}</div>}
                      </td>
                      <td style={{fontSize:11,color:'var(--t2)'}}>{l.appliedAt?.slice(0,10)}</td>
                      <td>
                        {l.status==='pending'&&(
                          <button className="btn btn-xs btn-danger" onClick={()=>cancel(l.id)}>⊘ Cancel</button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      }
    </div>
  )
}