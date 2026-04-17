// client/src/components/pages/Employees.jsx
import React, { useState, useRef } from 'react'
import {
  SHIFT_TYPES, addUser, updateUser, deleteUser,
  updateLeaveStatus, changePassword, cancelLeave, updateProfile
} from '../../data/store'
import { exportLeavesExcel, exportMonthlyReportExcel } from '../../data/excelExport'

function ini(n='') { return n.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase() }

function Avatar({ user, size=32, fontSize=11 }) {
  if (user?.profilePhoto) {
    return (
      <img src={user.profilePhoto} alt={user.name}
        style={{ width:size, height:size, borderRadius:'50%', objectFit:'cover', flexShrink:0 }} />
    )
  }
  return (
    <div className={`av ${user?.highlight==='orange'?'av-orange':user?.role==='admin'?'av-blue':'av-gray'}`}
      style={{ width:size, height:size, fontSize, flexShrink:0 }}>
      {ini(user?.name||'')}
    </div>
  )
}

// ─── Employees ───────────────────────────────────────────────
export function Employees({ toast, storeData }) {
  const { users, refreshUsers } = storeData
  const [search,  setSearch]  = useState('')
  const [modal,   setModal]   = useState(null)
  const [form,    setForm]    = useState({})
  const [showPwd, setShowPwd] = useState(false)
  const [saving,  setSaving]  = useState(false)

  const agents = users.filter(u =>
    u.role === 'agent' && (
      !search ||
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      (u.employeeId||'').includes(search) ||
      u.email.toLowerCase().includes(search.toLowerCase())
    )
  )

  const openAdd  = () => {
    setForm({ name:'', email:'', password:'pass123', role:'agent', dept:'Support', defaultShift:'MC', highlight:'' })
    setModal('add')
  }
  const openEdit = (u) => { setForm({...u, password:''}); setModal('edit') }
  const upd = (k,v) => setForm(p => ({...p, [k]:v}))

  const save = async () => {
    if (!form.name?.trim() || !form.email?.trim()) { toast('Fill required fields','warning'); return }
    if (modal==='add' && !form.password) { toast('Password required','warning'); return }
    setSaving(true)
    try {
      if (modal === 'add') {
        await addUser(form)
        toast(form.name + ' added!', 'success')
      } else {
        // Admin updates — password only sent if provided (allows shift change without password)
        const payload = { ...form }
        if (!payload.password) delete payload.password
        await updateUser(form._id || form.id, payload)
        toast('Employee updated!', 'success')
      }
      await refreshUsers()
      setModal(null)
    } catch(e) { toast(e.message,'danger') }
    setSaving(false)
  }

  const del = async (u) => {
    if (!window.confirm(`Remove ${u.name} from the system?`)) return
    try {
      await deleteUser(u._id||u.id)
      toast(u.name+' removed','danger')
      await refreshUsers()
    } catch(e) { toast(e.message,'danger') }
  }

  return (
    <div className="page">
      <div className="page-hd">
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <h1>Employees</h1>
          <span className="badge badge-gray">{agents.length}</span>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <input placeholder="🔍 Search name / email / ID…" value={search}
            onChange={e=>setSearch(e.target.value)} style={{ width:220 }}/>
          <button className="btn btn-primary" onClick={openAdd}>+ Add Employee</button>
        </div>
      </div>

      <div className="card card-np">
        <div className="tbl-wrap">
          <table>
            <thead>
              <tr>
                <th>Emp ID</th><th>Photo</th><th>Name</th><th>Email</th>
                <th>Dept</th><th>Default Shift</th><th>Highlight</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {agents.length===0 && (
                <tr><td colSpan="8" style={{textAlign:'center',padding:32,color:'var(--t3)'}}>
                  No employees found
                </td></tr>
              )}
              {agents.map(u => (
                <tr key={u._id||u.id} className={u.highlight==='orange'?'row-orange':''}>
                  <td><span className="empid">{u.employeeId||'—'}</span></td>
                  <td><Avatar user={u} size={32} fontSize={10}/></td>
                  <td><span style={{fontWeight:500}}>{u.name}</span></td>
                  <td style={{fontSize:12,color:'var(--t2)'}}>{u.email}</td>
                  <td style={{fontSize:12}}>{u.dept}</td>
                  <td>
                    <span style={{
                      background: SHIFT_TYPES[u.defaultShift]?.color||'#888',
                      color:'#fff', padding:'3px 8px', borderRadius:6, fontSize:11, fontWeight:600
                    }}>
                      {u.defaultShift} — {SHIFT_TYPES[u.defaultShift]?.label||u.defaultShift}
                    </span>
                  </td>
                  <td>
                    {u.highlight
                      ? <span style={{background:'orange',color:'#fff',padding:'2px 8px',borderRadius:10,fontSize:11}}>{u.highlight}</span>
                      : '—'}
                  </td>
                  <td>
                    <button className="btn btn-sm" onClick={()=>openEdit(u)}>Edit</button>{' '}
                    <button className="btn btn-sm btn-danger" onClick={()=>del(u)}>Remove</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Add/Edit Modal ── */}
      {modal && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setModal(null)}>
          <div className="modal">
            <div className="modal-hd">
              <h3>{modal==='add'?'Add Employee':'Edit Employee'}</h3>
              <button className="close-btn" onClick={()=>setModal(null)}>×</button>
            </div>
            <div className="modal-bd">
              <div className="form-row">
                <div className="form-group"><label>Full Name *</label>
                  <input value={form.name||''} onChange={e=>upd('name',e.target.value)}/></div>
                <div className="form-group"><label>Email *</label>
                  <input type="email" value={form.email||''} onChange={e=>upd('email',e.target.value)}/></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Employee ID</label>
                  <input value={form.employeeId||''} onChange={e=>upd('employeeId',e.target.value)}
                    placeholder="Auto-assigned if blank"/></div>
                <div className="form-group"><label>Department</label>
                  <input value={form.dept||''} onChange={e=>upd('dept',e.target.value)}/></div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>{modal==='edit'?'New Password (blank = no change)':'Password *'}</label>
                  <div className="input-icon-wrap">
                    <input type={showPwd?'text':'password'} value={form.password||''}
                      onChange={e=>upd('password',e.target.value)}
                      placeholder={modal==='edit'?'Leave blank to keep current':''}/>
                    <button type="button" className="eye-btn" onClick={()=>setShowPwd(s=>!s)}>
                      {showPwd?'🙈':'👁'}
                    </button>
                  </div>
                </div>
                {/* ★ Admin changes defaultShift WITHOUT needing password */}
                <div className="form-group">
                  <label>Default Shift <span style={{fontSize:10,color:'var(--green)'}}>✓ No password needed</span></label>
                  <select value={form.defaultShift||'MC'} onChange={e=>upd('defaultShift',e.target.value)}>
                    {Object.entries(SHIFT_TYPES).filter(([,d])=>d.minAgents>0).map(([k,d])=>(
                      <option key={k} value={k}>{k} — {d.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-group"><label>Highlight Color</label>
                <select value={form.highlight||''} onChange={e=>upd('highlight',e.target.value)}>
                  <option value="">None</option>
                  <option value="orange">Orange</option>
                </select>
              </div>
              {modal==='edit' && (
                <div style={{
                  marginTop:8,padding:'8px 12px',background:'rgba(22,163,74,.08)',
                  borderRadius:6,fontSize:12,color:'var(--green)'
                }}>
                  ✅ You can change the Default Shift without entering a password.
                  Only fill password if you want to change the agent's login password.
                </div>
              )}
            </div>
            <div className="modal-ft">
              <button className="btn" onClick={()=>setModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>
                {saving?'Saving…':modal==='add'?'Add Employee':'Update Employee'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Admin Leaves ─────────────────────────────────────────────
export function Leaves({ toast, storeData }) {
  const { leaves, refreshLeaves, lastRefreshTime, nextRefreshIn } = storeData
  const [tab,         setTab]         = useState('pending')
  const [saving,      setSaving]      = useState(false)
  const [filterName,  setFilterName]  = useState('')
  const [filterMonth, setFilterMonth] = useState('')
  const [filterType,  setFilterType]  = useState('')

  const TABS = ['pending','approved','rejected','cancelled','all']

  const shown = leaves.filter(l => {
    if (tab !== 'all' && l.status !== tab) return false
    if (filterName  && !l.userName?.toLowerCase().includes(filterName.toLowerCase()) && !l.userEmpId?.includes(filterName)) return false
    if (filterType  && l.leaveType !== filterType) return false
    if (filterMonth && !l.from?.startsWith(filterMonth) && !l.to?.startsWith(filterMonth)) return false
    return true
  })

  const act = async (id, status) => {
    setSaving(true)
    try {
      await updateLeaveStatus(id, status)
      toast(`Leave ${status}`, status==='approved'?'success':'warning')
      await refreshLeaves()
    } catch(e) { toast(e.message,'danger') }
    setSaving(false)
  }

  const handleManualRefresh = async () => {
    await refreshLeaves()
    toast('Refreshed','info')
  }

  return (
    <div className="page">
      <div className="page-hd">
        <div>
          <h1>Leave Requests</h1>
          <p className="sub">Review and action agent leave applications</p>
        </div>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
          {/* ── Auto-Refresh Indicator ── */}
          <div style={{
            display:'flex', alignItems:'center', gap:8, padding:'6px 12px',
            background:'var(--s2)', borderRadius:8, border:'1px solid var(--border)',
            fontSize:12, color:'var(--t2)'
          }}>
            <span style={{
              width:8, height:8, borderRadius:'50%', background:'#22c55e',
              display:'inline-block', animation:'pulse 2s infinite'
            }}/>
            <span>Auto-refresh in <strong style={{color:'var(--text)'}}>{nextRefreshIn}s</strong></span>
            {lastRefreshTime && (
              <span style={{color:'var(--t3)'}}>· Last: {lastRefreshTime.toLocaleTimeString()}</span>
            )}
          </div>
          <button className="btn btn-sm btn-outline" onClick={handleManualRefresh}>🔄 Refresh Now</button>
          <button className="btn btn-sm btn-outline"
            onClick={()=>exportLeavesExcel(shown, filterMonth||new Date().toISOString().slice(0,10))}>
            ⬇ Export Filtered
          </button>
        </div>
      </div>

      {/* ── Filters ── */}
      <div style={{
        display:'flex', gap:8, flexWrap:'wrap', marginBottom:12,
        padding:'12px 14px', background:'var(--s2)',
        borderRadius:8, border:'1px solid var(--border)'
      }}>
        <input placeholder="🔍 Search agent name / emp ID…" value={filterName}
          onChange={e=>setFilterName(e.target.value)} style={{flex:1,minWidth:180}}/>
        <input type="month" value={filterMonth} onChange={e=>setFilterMonth(e.target.value)}
          style={{width:160}} title="Filter by month"/>
        <select value={filterType} onChange={e=>setFilterType(e.target.value)} style={{width:160}}>
          <option value="">All Leave Types</option>
          {['Casual','Sick','Annual','Emergency','Comp Off','Maternity/Paternity'].map(t=>(
            <option key={t}>{t}</option>
          ))}
        </select>
        {(filterName||filterMonth||filterType) && (
          <button className="btn btn-sm btn-outline"
            onClick={()=>{setFilterName('');setFilterMonth('');setFilterType('')}}>✕ Clear</button>
        )}
        <span style={{fontSize:12,color:'var(--t2)',alignSelf:'center'}}>
          {shown.length} record{shown.length!==1?'s':''}
        </span>
      </div>

      <div className="tabs">
        {TABS.map(t=>(
          <div key={t} className={`tab${tab===t?' active':''}`}
            onClick={()=>setTab(t)} style={{textTransform:'capitalize'}}>
            {t}
            {t!=='all' && (
              <span style={{
                marginLeft:6, padding:'1px 7px', borderRadius:10, fontSize:10,
                background:tab===t?'rgba(255,255,255,.2)':'var(--s3)', fontWeight:700
              }}>
                {leaves.filter(l=>l.status===t).length}
              </span>
            )}
          </div>
        ))}
      </div>

      <div className="card card-np">
        <div className="tbl-wrap">
          <table>
            <thead>
              <tr>
                <th>Emp ID</th><th>Agent</th><th>Type</th><th>From</th>
                <th>To</th><th>Days</th><th>Reason</th><th>Applied</th>
                <th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {shown.length===0 && (
                <tr><td colSpan="10" style={{textAlign:'center',padding:32,color:'var(--t3)'}}>
                  No records found
                </td></tr>
              )}
              {shown.map(l => {
                const days = Math.ceil((new Date(l.to)-new Date(l.from))/86400000)+1
                return (
                  <tr key={l.id}>
                    <td><span className="empid">{l.userEmpId}</span></td>
                    <td style={{fontWeight:500}}>{l.userName||'?'}</td>
                    <td><span className="badge badge-blue">{l.leaveType}</span></td>
                    <td style={{fontSize:12}}>{l.from}</td>
                    <td style={{fontSize:12}}>{l.to}</td>
                    <td style={{fontWeight:700,textAlign:'center'}}>{days}</td>
                    <td style={{maxWidth:160,fontSize:12}}>{l.reason}</td>
                    <td style={{fontSize:11,color:'var(--t2)'}}>{l.appliedAt?.slice(0,10)}</td>
                    <td>
                      <span className={`badge badge-${l.status==='approved'?'green':l.status==='rejected'?'red':l.status==='cancelled'?'gray':'amber'}`}>
                        {l.status}
                      </span>
                    </td>
                    <td style={{whiteSpace:'nowrap'}}>
                      {l.status==='pending' && <>
                        <button className="btn btn-xs btn-success" onClick={()=>act(l.id,'approved')} disabled={saving}>✓</button>{' '}
                        <button className="btn btn-xs btn-danger"  onClick={()=>act(l.id,'rejected')} disabled={saving}>✕</button>
                      </>}
                      {l.remark && <div style={{fontSize:10,color:'var(--t3)',marginTop:2}}>{l.remark}</div>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ─── Settings ────────────────────────────────────────────────
export function Settings({ toast }) {
  const [oldPwd, setOldPwd] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [saving, setSaving] = useState(false)

  const handlePwdChange = async (e) => {
    e.preventDefault()
    if (newPwd.length < 6) { toast('Min 6 characters','warning'); return }
    setSaving(true)
    try {
      const res = await changePassword(null, oldPwd, newPwd)
      if (res.ok) { toast('Password changed!','success'); setOldPwd(''); setNewPwd('') }
      else toast(res.msg,'danger')
    } catch(e) { toast(e.message,'danger') }
    setSaving(false)
  }

  return (
    <div className="page">
      <div className="page-hd"><h1>Settings</h1></div>
      <div className="card" style={{maxWidth:440}}>
        <div className="card-title">Change Password</div>
        <form onSubmit={handlePwdChange}>
          <div className="form-group"><label>Current Password</label>
            <input type="password" value={oldPwd} onChange={e=>setOldPwd(e.target.value)} required/></div>
          <div className="form-group"><label>New Password (min 6)</label>
            <input type="password" value={newPwd} onChange={e=>setNewPwd(e.target.value)} required/></div>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving?'Saving…':'Change Password'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ─── Profile (with photo upload) ─────────────────────────────
export function Profile({ user, toast, onRefresh, onUserUpdate, storeData }) {
  const { agents } = storeData
  const [name,   setName]   = useState(user.name||'')
  const [saving, setSaving] = useState(false)
  const [oldPwd, setOldPwd] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [photo,  setPhoto]  = useState(user.profilePhoto||'')
  const fileRef = useRef()

  const agentsWithPhotos = agents.filter(a => a.profilePhoto)

  const handlePhotoChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { toast('Photo must be under 2MB','warning'); return }
    const reader = new FileReader()
    reader.onload = (ev) => setPhoto(ev.target.result)
    reader.readAsDataURL(file)
  }

  const saveProfile = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await updateProfile({ name: name.trim(), profilePhoto: photo })
      if (res.ok) { toast('Profile updated!','success'); onUserUpdate() }
      else toast(res.msg,'danger')
    } catch(e) { toast(e.message,'danger') }
    setSaving(false)
  }

  const changePwd = async (e) => {
    e.preventDefault()
    if (newPwd.length < 6) { toast('Min 6 characters','warning'); return }
    setSaving(true)
    try {
      const res = await changePassword(null, oldPwd, newPwd)
      if (res.ok) { toast('Password changed!','success'); setOldPwd(''); setNewPwd('') }
      else toast(res.msg,'danger')
    } catch(e) { toast(e.message,'danger') }
    setSaving(false)
  }

  return (
    <div className="page">
      <div className="page-hd"><h1>My Profile</h1></div>
      <div className="two-col">
        {/* ── Profile Info + Photo ── */}
        <div className="card">
          <div className="card-title">Profile Information</div>
          <form onSubmit={saveProfile}>
            <div style={{display:'flex',flexDirection:'column',alignItems:'center',marginBottom:20}}>
              <div style={{position:'relative',marginBottom:10}}>
                {photo
                  ? <img src={photo} alt="Profile" style={{width:80,height:80,borderRadius:'50%',objectFit:'cover',border:'3px solid var(--accent)'}}/>
                  : <div className="av av-blue" style={{width:80,height:80,fontSize:24}}>{ini(name)}</div>
                }
                <button type="button" onClick={()=>fileRef.current.click()} style={{
                  position:'absolute',bottom:0,right:0,background:'var(--accent)',
                  border:'none',borderRadius:'50%',width:26,height:26,cursor:'pointer',
                  fontSize:14,color:'#fff',display:'flex',alignItems:'center',justifyContent:'center'
                }}>📷</button>
              </div>
              <input ref={fileRef} type="file" accept="image/*" style={{display:'none'}} onChange={handlePhotoChange}/>
              {photo && (
                <button type="button" className="btn btn-sm btn-outline" onClick={()=>setPhoto('')}>Remove Photo</button>
              )}
            </div>
            <div className="form-group"><label>Full Name</label>
              <input value={name} onChange={e=>setName(e.target.value)} required/></div>
            <div className="form-group"><label>Email</label>
              <input value={user.email} disabled style={{opacity:.6}}/></div>
            <div className="form-group"><label>Employee ID</label>
              <input value={user.employeeId||'—'} disabled style={{opacity:.6}}/></div>
            <div className="form-group"><label>Role</label>
              <input value={user.role} disabled style={{opacity:.6}}/></div>
            <button type="submit" className="btn btn-primary btn-full" disabled={saving}>
              {saving?'Saving…':'Save Profile'}
            </button>
          </form>
        </div>

        <div style={{display:'flex',flexDirection:'column',gap:16}}>
          {/* ── Change Password ── */}
          <div className="card">
            <div className="card-title">Change Password</div>
            <form onSubmit={changePwd}>
              <div className="form-group"><label>Current Password</label>
                <input type="password" value={oldPwd} onChange={e=>setOldPwd(e.target.value)} required/></div>
              <div className="form-group"><label>New Password (min 6)</label>
                <input type="password" value={newPwd} onChange={e=>setNewPwd(e.target.value)} required/></div>
              <button type="submit" className="btn btn-primary btn-full" disabled={saving}>
                {saving?'Saving…':'Change Password'}
              </button>
            </form>
          </div>

          {/* ── Admin: Agent Photos ── */}
          {user.role==='admin' && (
            <div className="card">
              <div className="card-title">Agent Profile Photos ({agentsWithPhotos.length})</div>
              {agentsWithPhotos.length===0
                ? <div style={{color:'var(--t3)',fontSize:13,textAlign:'center',padding:16}}>
                    No agents have set a profile photo yet
                  </div>
                : <div style={{display:'flex',flexWrap:'wrap',gap:12,marginTop:8}}>
                  {agentsWithPhotos.map(a=>(
                    <div key={a._id||a.id} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:4}}>
                      <img src={a.profilePhoto} alt={a.name} style={{width:48,height:48,borderRadius:'50%',objectFit:'cover',border:'2px solid var(--border)'}}/>
                      <span style={{fontSize:10,color:'var(--t2)',textAlign:'center',maxWidth:60,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{a.name}</span>
                      <span className="empid" style={{fontSize:9}}>{a.employeeId}</span>
                    </div>
                  ))}
                </div>
              }
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Monthly Report ───────────────────────────────────────────
export function MonthlyReport({ toast, storeData }) {
  const { agents, leaves, scheduleCache, loadSchedule } = storeData
  const now = new Date()
  const [month,   setMonth]   = useState(`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`)
  const [loading, setLoading] = useState(false)

  function getWeekKeyFromDate(dateStr) {
    const d = new Date(dateStr), day = d.getDay()
    const mon = new Date(d); mon.setDate(d.getDate() - (day===0?6:day-1))
    return mon.toISOString().slice(0,10)
  }

  const handleDownload = async () => {
    setLoading(true)
    try {
      const [y, m]      = month.split('-')
      const daysInMonth = new Date(parseInt(y), parseInt(m), 0).getDate()
      const weekKeys    = new Set()
      for (let d=1; d<=daysInMonth; d++) {
        const dateStr = `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`
        weekKeys.add(getWeekKeyFromDate(dateStr))
      }
      // Load all week schedules
      const schedsByWeek = {}
      for (const wk of weekKeys) {
        const cached = scheduleCache[wk]
        if (cached) {
          schedsByWeek[wk] = cached.shifts || cached
        } else {
          const data = await loadSchedule(wk)
          schedsByWeek[wk] = data?.shifts || {}
        }
      }
      exportMonthlyReportExcel(month, agents, schedsByWeek, leaves)
      toast('Monthly report downloaded!','success')
    } catch(e) { toast(e.message,'danger') }
    setLoading(false)
  }

  const [y, m]      = month.split('-')
  const daysInMonth = month ? new Date(parseInt(y), parseInt(m), 0).getDate() : 0

  return (
    <div className="page">
      <div className="page-hd"><h1>Monthly Report</h1></div>
      <div style={{display:'flex',gap:16,flexWrap:'wrap'}}>
        <div className="card" style={{flex:1,minWidth:300,maxWidth:440}}>
          <div className="card-title">Download Monthly Schedule Report</div>
          <div className="form-group">
            <label>Select Month</label>
            <input type="month" value={month} onChange={e=>setMonth(e.target.value)}/>
          </div>
          {month && (
            <div style={{padding:'8px 12px',background:'rgba(37,99,235,.08)',borderRadius:6,fontSize:12,color:'var(--blue)',marginBottom:14}}>
              📅 {daysInMonth} days · {agents.length} agents · Approx {agents.length * daysInMonth} cells
            </div>
          )}
          <button className="btn btn-primary btn-full" onClick={handleDownload} disabled={loading || !month}>
            {loading ? '⏳ Generating Excel…' : `⬇ Download ${month} Report (Excel)`}
          </button>
          <div style={{marginTop:12,fontSize:12,color:'var(--t2)',lineHeight:1.7}}>
            📊 Report includes:<br/>
            • Every day of the month for all agents<br/>
            • Shift codes + time labels<br/>
            • Leave days marked automatically<br/>
            • Summary: Work days / Off days / Leave days per agent
          </div>
        </div>
      </div>
    </div>
  )
}
