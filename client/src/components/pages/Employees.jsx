// client/src/components/pages/Employees.jsx
import React, { useState } from 'react'
import {
  SHIFT_TYPES, addUser, updateUser, deleteUser, updateLeaveStatus, changePassword,
} from '../../data/store'
import { exportLeavesExcel } from '../../data/excelExport'

function ini(n=''){return n.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()}

// ─── Employees ───────────────────────────────────────────────
export function Employees({ toast, storeData }) {
  const { users, refreshUsers } = storeData
  const [search,  setSearch]  = useState('')
  const [modal,   setModal]   = useState(null)
  const [form,    setForm]    = useState({})
  const [showPwd, setShowPwd] = useState(false)
  const [saving,  setSaving]  = useState(false)

  const agents = users.filter(u =>
    u.role==='agent' &&
    (!search || u.name.toLowerCase().includes(search.toLowerCase()) ||
     (u.employeeId||'').includes(search) || u.email.toLowerCase().includes(search.toLowerCase()))
  )

  const openAdd  = () => { setForm({ name:'',email:'',password:'pass123',role:'agent',dept:'Support',defaultShift:'MC',highlight:'' }); setModal('add') }
  const openEdit = (u) => { setForm({...u}); setModal('edit') }
  const upd = (k,v) => setForm(p=>({...p,[k]:v}))

  const save = async () => {
    if (!form.name.trim()||!form.email.trim()||!form.password) { toast('Fill all required fields','warning'); return }
    setSaving(true)
    try {
      if (modal==='add') {
        await addUser(form)
        toast(form.name+' added successfully','success')
      } else {
        await updateUser(form._id||form.id, form)
        toast('Employee updated','success')
      }
      await refreshUsers()
      setModal(null)
    } catch(e) { toast(e.message,'danger') }
    setSaving(false)
  }

  const del = async (u) => {
    if (!window.confirm(`Remove ${u.name}?`)) return
    try {
      await deleteUser(u._id||u.id)
      toast(u.name+' removed','danger')
      await refreshUsers()
    } catch(e) { toast(e.message,'danger') }
  }

  return (
    <div className="page">
      <div className="page-hd">
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <h1>Employees</h1><span className="badge badge-gray">{agents.length}</span>
        </div>
        <div style={{display:'flex',gap:8}}>
          <input placeholder="🔍 Search name / email / ID…" value={search} onChange={e=>setSearch(e.target.value)} style={{width:200}}/>
          <button className="btn btn-primary" onClick={openAdd}>+ Add Employee</button>
        </div>
      </div>

      <div className="card card-np">
        <div className="tbl-wrap">
          <table>
            <thead><tr><th>Emp ID</th><th>Name</th><th>Email</th><th>Dept</th><th>Default Shift</th><th>Highlight</th><th>Actions</th></tr></thead>
            <tbody>
              {agents.length===0&&<tr><td colSpan="7" style={{textAlign:'center',padding:32,color:'var(--t3)'}}>No employees found</td></tr>}
              {agents.map(u=>(
                <tr key={u._id||u.id} className={u.highlight==='orange'?'row-orange':''}>
                  <td><span className="empid">{u.employeeId||'—'}</span></td>
                  <td>
                    <div style={{display:'flex',alignItems:'center',gap:8}}>
                      <div className={`av ${u.highlight==='orange'?'av-orange':'av-gray'}`} style={{width:28,height:28,fontSize:10}}>{ini(u.name)}</div>
                      <span style={{fontWeight:500}}>{u.name}</span>
                    </div>
                  </td>
                  <td style={{fontSize:12,color:'var(--t2)'}}>{u.email}</td>
                  <td style={{fontSize:12}}>{u.dept}</td>
                  <td>
                    <span style={{background:SHIFT_TYPES[u.defaultShift]?.color||'#888',color:'#fff',padding:'3px 8px',borderRadius:6,fontSize:11,fontWeight:600}}>
                      {SHIFT_TYPES[u.defaultShift]?.label||u.defaultShift}
                    </span>
                  </td>
                  <td>{u.highlight?<span style={{background:'orange',color:'#fff',padding:'2px 8px',borderRadius:10,fontSize:11}}>{u.highlight}</span>:'—'}</td>
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

      {modal&&(
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setModal(null)}>
          <div className="modal">
            <div className="modal-hd"><h3>{modal==='add'?'Add Employee':'Edit Employee'}</h3><button className="close-btn" onClick={()=>setModal(null)}>×</button></div>
            <div className="modal-bd">
              <div className="form-row">
                <div className="form-group"><label>Full Name *</label><input value={form.name||''} onChange={e=>upd('name',e.target.value)}/></div>
                <div className="form-group"><label>Email *</label><input type="email" value={form.email||''} onChange={e=>upd('email',e.target.value)}/></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Employee ID</label><input value={form.employeeId||''} onChange={e=>upd('employeeId',e.target.value)} placeholder="Auto-assigned if blank"/></div>
                <div className="form-group"><label>Department</label><input value={form.dept||''} onChange={e=>upd('dept',e.target.value)}/></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Password *</label>
                  <div className="input-icon-wrap">
                    <input type={showPwd?'text':'password'} value={form.password||''} onChange={e=>upd('password',e.target.value)}/>
                    <button type="button" className="eye-btn" onClick={()=>setShowPwd(s=>!s)}>{showPwd?'🙈':'👁'}</button>
                  </div>
                </div>
                <div className="form-group"><label>Default Shift</label>
                  <select value={form.defaultShift||'MC'} onChange={e=>upd('defaultShift',e.target.value)}>
                    {Object.entries(SHIFT_TYPES).filter(([,d])=>d.minAgents>0).map(([k,d])=>(
                      <option key={k} value={k}>{k} — {d.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-group"><label>Highlight Color</label>
                <select value={form.highlight||''} onChange={e=>upd('highlight',e.target.value)}>
                  <option value="">None</option><option value="orange">Orange</option>
                </select>
              </div>
            </div>
            <div className="modal-ft">
              <button className="btn" onClick={()=>setModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>{saving?'Saving…':modal==='add'?'Add Employee':'Update'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Admin Leaves ─────────────────────────────────────────────
export function Leaves({ toast, storeData }) {
  const { leaves, refreshLeaves } = storeData
  const [tab,    setTab]    = useState('pending')
  const [saving, setSaving] = useState(false)

  const shown = leaves.filter(l=>tab==='all'||l.status===tab)

  const act = async (id, status) => {
    setSaving(true)
    try {
      await updateLeaveStatus(id, status)
      toast(`Leave ${status}`, status==='approved'?'success':'warning')
      await refreshLeaves()
    } catch(e) { toast(e.message,'danger') }
    setSaving(false)
  }

  return (
    <div className="page">
      <div className="page-hd">
        <div><h1>Leave Requests</h1><p className="sub">Review and action agent leave applications</p></div>
        <button className="btn btn-sm btn-outline" onClick={()=>exportLeavesExcel(leaves)}>⬇ Export Excel</button>
      </div>
      <div className="tabs">
        {['pending','approved','rejected','all'].map(t=>(
          <div key={t} className={`tab${tab===t?' active':''}`} onClick={()=>setTab(t)} style={{textTransform:'capitalize'}}>
            {t}{t!=='all'&&` (${leaves.filter(l=>l.status===t).length})`}
          </div>
        ))}
      </div>
      <div className="card card-np">
        <div className="tbl-wrap">
          <table>
            <thead><tr><th>Emp ID</th><th>Agent</th><th>Type</th><th>From</th><th>To</th><th>Days</th><th>Reason</th><th>Applied</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {shown.length===0&&<tr><td colSpan="10" style={{textAlign:'center',padding:32,color:'var(--t3)'}}>No records</td></tr>}
              {shown.map(l=>{
                const days=Math.ceil((new Date(l.to)-new Date(l.from))/86400000)+1
                return (
                  <tr key={l.id}>
                    <td><span className="empid">{l.userEmpId}</span></td>
                    <td style={{fontWeight:500}}>{l.userName||'?'}</td>
                    <td><span className="badge badge-blue">{l.leaveType}</span></td>
                    <td style={{fontSize:12}}>{l.from}</td>
                    <td style={{fontSize:12}}>{l.to}</td>
                    <td style={{fontWeight:700}}>{days}</td>
                    <td style={{maxWidth:140,fontSize:12}}>{l.reason}</td>
                    <td style={{fontSize:11,color:'var(--t2)'}}>{l.appliedAt?.slice(0,10)}</td>
                    <td><span className={`badge badge-${l.status==='approved'?'green':l.status==='rejected'?'red':'amber'}`}>{l.status}</span></td>
                    <td style={{whiteSpace:'nowrap'}}>
                      {l.status==='pending'&&<>
                        <button className="btn btn-xs btn-success" onClick={()=>act(l.id,'approved')} disabled={saving}>✓ Approve</button>{' '}
                        <button className="btn btn-xs btn-danger"  onClick={()=>act(l.id,'rejected')} disabled={saving}>✕ Reject</button>
                      </>}
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

// ─── Settings ─────────────────────────────────────────────────
export function Settings({ toast, storeData }) {
  const { users, refreshUsers } = storeData
  const [saving, setSaving] = useState(false)
  const [nf, setNf] = useState({ name:'', email:'', password:'' })
  const admins = users.filter(u=>u.role==='admin')

  const addAdmin = async () => {
    if (!nf.name||!nf.email||!nf.password) { toast('Fill all fields','warning'); return }
    setSaving(true)
    try {
      await addUser({ ...nf, role:'admin', dept:'Management', defaultShift:'MC', highlight:'' })
      toast('Admin created','success')
      setNf({ name:'',email:'',password:'' })
      await refreshUsers()
    } catch(e) { toast(e.message,'danger') }
    setSaving(false)
  }

  const removeAdmin = async (u) => {
    if (admins.length<=1) { toast('Must keep at least one admin','warning'); return }
    if (!window.confirm(`Remove admin ${u.name}?`)) return
    try {
      await deleteUser(u._id||u.id)
      toast('Removed','danger')
      await refreshUsers()
    } catch(e) { toast(e.message,'danger') }
  }

  return (
    <div className="page">
      <div className="page-hd"><h1>System Settings</h1></div>
      <div className="two-col">
        <div className="card">
          <div className="card-title">Shift Configuration</div>
          {Object.entries(SHIFT_TYPES).map(([code,def])=>(
            <div key={code} className="info-row">
              <div style={{display:'flex',alignItems:'center',gap:6}}>
                <div style={{width:10,height:10,background:def.color,borderRadius:2}}/>
                <span style={{fontSize:12,fontWeight:600}}>{code}</span>
                <span style={{fontSize:12,color:'var(--t2)'}}>{def.label}</span>
              </div>
              <span style={{fontSize:11,color:'var(--t3)'}}>{def.minAgents>0?`min ${def.minAgents} agents`:'—'}</span>
            </div>
          ))}
        </div>
        <div className="card">
          <div className="card-title">Admin Accounts</div>
          {admins.map(u=>(
            <div key={u._id||u.id} className="info-row">
              <span style={{fontWeight:500,fontSize:12}}>{u.name}</span>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <span style={{fontSize:11,color:'var(--t3)'}}>{u.email}</span>
                <button className="btn btn-xs btn-danger" onClick={()=>removeAdmin(u)}>Remove</button>
              </div>
            </div>
          ))}
          <div style={{marginTop:16,borderTop:'1px solid var(--border)',paddingTop:14}}>
            <div style={{fontWeight:700,fontSize:13,marginBottom:10}}>Create Admin Account</div>
            <div className="form-group"><label>Name</label><input value={nf.name} onChange={e=>setNf(p=>({...p,name:e.target.value}))}/></div>
            <div className="form-group"><label>Email</label><input type="email" value={nf.email} onChange={e=>setNf(p=>({...p,email:e.target.value}))}/></div>
            <div className="form-group"><label>Password</label><input type="password" value={nf.password} onChange={e=>setNf(p=>({...p,password:e.target.value}))}/></div>
            <button className="btn btn-primary btn-sm" onClick={addAdmin} disabled={saving}>{saving?'Creating…':'Create Admin'}</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Profile ──────────────────────────────────────────────────
export function Profile({ user, toast, onUserUpdate, storeData }) {
  const { refreshUsers } = storeData
  const [pf,   setPf]  = useState({ name:user.name, email:user.email })
  const [cpf,  setCpf] = useState({ old:'', new1:'', new2:'' })
  const [err,  setErr] = useState('')
  const [saving, setSaving] = useState(false)

  function ini2(n=''){return n.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()}

  const saveProfile = async () => {
    setSaving(true)
    try {
      await updateUser(user._id||user.id, { name:pf.name, email:pf.email })
      toast('Profile updated','success')
      onUserUpdate()
    } catch(e) { toast(e.message,'danger') }
    setSaving(false)
  }

  const changePwd = async (e) => {
    e.preventDefault(); setErr('')
    if (cpf.new1.length<6) { setErr('Min 6 characters'); return }
    if (cpf.new1!==cpf.new2) { setErr('Passwords do not match'); return }
    const res = await changePassword(user._id||user.id, cpf.old, cpf.new1)
    if (res.ok) { toast('Password changed!','success'); setCpf({old:'',new1:'',new2:''}) }
    else setErr(res.msg)
  }

  return (
    <div className="page">
      <div className="page-hd"><h1>My Profile</h1></div>
      <div className="two-col">
        <div className="card">
          <div className="card-title">Profile Information</div>
          <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:20}}>
            <div className={`av ${user.role==='admin'?'av-blue':'av-gray'}`} style={{width:52,height:52,fontSize:18}}>{ini2(user.name)}</div>
            <div>
              <div style={{fontWeight:700,fontSize:15}}>{user.name}</div>
              <div style={{fontSize:12,color:'var(--t2)'}}>{user.email}</div>
              <div style={{marginTop:4}}>
                <span className={`badge ${user.role==='admin'?'badge-blue':'badge-green'}`}>{user.role}</span>
                {user.employeeId&&<span className="empid" style={{marginLeft:8}}>{user.employeeId}</span>}
              </div>
            </div>
          </div>
          <div className="form-group"><label>Full Name</label><input value={pf.name} onChange={e=>setPf(p=>({...p,name:e.target.value}))}/></div>
          <div className="form-group"><label>Email</label><input type="email" value={pf.email} onChange={e=>setPf(p=>({...p,email:e.target.value}))}/></div>
          <button className="btn btn-primary" onClick={saveProfile} disabled={saving}>{saving?'Saving…':'Save Profile'}</button>
        </div>
        <div className="card">
          <div className="card-title">Change Password</div>
          {err&&<div className="auth-error" style={{marginBottom:12}}>{err}</div>}
          <form onSubmit={changePwd}>
            <div className="form-group"><label>Current Password</label><input type="password" value={cpf.old} onChange={e=>setCpf(p=>({...p,old:e.target.value}))} required/></div>
            <div className="form-group"><label>New Password</label><input type="password" value={cpf.new1} onChange={e=>setCpf(p=>({...p,new1:e.target.value}))} required/></div>
            <div className="form-group"><label>Confirm New Password</label><input type="password" value={cpf.new2} onChange={e=>setCpf(p=>({...p,new2:e.target.value}))} required/></div>
            <button type="submit" className="btn btn-primary">Change Password</button>
          </form>
        </div>
      </div>
    </div>
  )
}
