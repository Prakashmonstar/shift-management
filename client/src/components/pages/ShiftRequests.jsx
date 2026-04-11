// client/src/components/pages/ShiftRequests.jsx
import React, { useState } from 'react'
import { SHIFT_TYPES, getDayName, updateShiftRequestStatus } from '../../data/store'
import { exportShiftRequestsExcel } from '../../data/excelExport'

export function ShiftRequests({ toast, storeData }) {
  const { requests, refreshRequests } = storeData
  const [tab,    setTab]    = useState('pending')
  const [notes,  setNotes]  = useState({})
  const [saving, setSaving] = useState(false)

  const shown = requests.filter(r=>tab==='all'||r.status===tab)

  const act = async (id, status) => {
    setSaving(true)
    try {
      await updateShiftRequestStatus(id, status, notes[id]||'')
      toast(`Request ${status}`, status==='approved'?'success':'warning')
      await refreshRequests()
    } catch(e) { toast(e.message,'danger') }
    setSaving(false)
  }

  return (
    <div className="page">
      <div className="page-hd">
        <div><h1>Shift Change Requests</h1><p className="sub">Review and action agent shift change requests</p></div>
        <button className="btn btn-sm btn-outline" onClick={()=>exportShiftRequestsExcel(requests)}>⬇ Export Excel</button>
      </div>
      <div className="tabs">
        {['pending','approved','rejected','all'].map(t=>(
          <div key={t} className={`tab${tab===t?' active':''}`} onClick={()=>setTab(t)} style={{textTransform:'capitalize'}}>
            {t}{t!=='all'&&` (${requests.filter(r=>r.status===t).length})`}
          </div>
        ))}
      </div>
      {shown.length===0
        ? <div className="empty-state">No {tab==='all'?'':tab} shift requests found.</div>
        : <div style={{display:'flex',flexDirection:'column',gap:12}}>
          {shown.map(r=>{
            const cs=SHIFT_TYPES[r.currentShift], rs=SHIFT_TYPES[r.requestedShift]
            return (
              <div key={r.id} className={`req-card req-${r.status}`}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10,flexWrap:'wrap',gap:8}}>
                  <div style={{display:'flex',alignItems:'center',gap:10}}>
                    <span className="empid">{r.userEmpId}</span>
                    <span style={{fontWeight:700,fontSize:14}}>{r.userName||'?'}</span>
                    <span style={{fontSize:12,color:'var(--t2)'}}>{r.userDept}</span>
                  </div>
                  <span className={`badge badge-${r.status==='approved'?'green':r.status==='rejected'?'red':'amber'}`}>{r.status}</span>
                </div>
                <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:8,flexWrap:'wrap'}}>
                  <div style={{background:'var(--s2)',borderRadius:6,padding:'4px 10px',fontSize:12}}>
                    📅 Week: <strong>{r.weekKey}</strong>
                  </div>
                  <div style={{background:'var(--s2)',borderRadius:6,padding:'4px 10px',fontSize:12}}>
                    📆 {getDayName(r.dateStr)}, {new Date(r.dateStr).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})}
                  </div>
                  <div style={{display:'flex',alignItems:'center',gap:8}}>
                    <span style={{background:cs?.color||'#888',color:cs?.textColor||'#fff',padding:'3px 10px',borderRadius:6,fontSize:12,fontWeight:700}}>
                      {r.currentShift}: {cs?.label}
                    </span>
                    <span style={{fontSize:16,color:'var(--t2)'}}>→</span>
                    <span style={{background:rs?.color||'#888',color:rs?.textColor||'#fff',padding:'3px 10px',borderRadius:6,fontSize:12,fontWeight:700}}>
                      {r.requestedShift}: {rs?.label}
                    </span>
                  </div>
                </div>
                <div style={{fontSize:13,color:'var(--t2)',marginBottom:8,fontStyle:'italic'}}>
                  Agent reason: "{r.reason}"
                </div>
                {r.status==='pending'&&(
                  <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap',borderTop:'1px solid var(--border)',paddingTop:10,marginTop:4}}>
                    <input type="text" placeholder="Optional admin note…"
                      value={notes[r.id]||''}
                      onChange={e=>setNotes(p=>({...p,[r.id]:e.target.value}))}
                      style={{flex:1,minWidth:180}}/>
                    <button className="btn btn-success btn-sm" onClick={()=>act(r.id,'approved')} disabled={saving}>✓ Approve</button>
                    <button className="btn btn-danger  btn-sm" onClick={()=>act(r.id,'rejected')} disabled={saving}>✕ Reject</button>
                  </div>
                )}
                {r.adminNote&&<div style={{fontSize:12,color:'var(--green)',marginTop:6}}>Admin note: {r.adminNote}</div>}
                <div style={{fontSize:10,color:'var(--t3)',marginTop:6}}>
                  Submitted: {r.submittedAt?.slice(0,16)}
                  {r.actionAt&&` · Actioned: ${r.actionAt.slice(0,16)}`}
                </div>
              </div>
            )
          })}
        </div>
      }
    </div>
  )
}
