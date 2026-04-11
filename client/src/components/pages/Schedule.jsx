// client/src/components/pages/Schedule.jsx
import React, { useState, useEffect } from 'react'
import {
  SHIFT_TYPES, getWeekDates, formatDate, getDayName,
  getNextWeekKey, getPrevWeekKey, getCurrentWeekKey,
  analyzeWeekCoverage, setAgentShift, setWeekStatus,
  autoGenerateWeek, bulkSetWeek,
} from '../../data/store'
import { exportScheduleExcel } from '../../data/excelExport'

function ShiftPicker({ agent, dateStr, current, onPick, onClose }) {
  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal" style={{maxWidth:340}}>
        <div className="modal-hd">
          <h3>Set Shift — {agent.name}</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        <div className="modal-bd">
          <div style={{fontSize:12,color:'var(--t2)',marginBottom:12}}>{getDayName(dateStr)}, {formatDate(dateStr)}</div>
          <div style={{display:'flex',flexDirection:'column',gap:6}}>
            {Object.entries(SHIFT_TYPES).map(([code,def])=>(
              <button key={code} onClick={()=>{ onPick(code); onClose() }}
                style={{
                  padding:'10px 14px',borderRadius:8,cursor:'pointer',textAlign:'left',
                  display:'flex',justifyContent:'space-between',alignItems:'center',
                  border:current===code?'2px solid #1e293b':'1px solid transparent',
                  background:def.color,color:def.textColor,fontWeight:600,fontSize:12
                }}>
                <span>{def.label}</span>
                <span style={{fontSize:10}}>{def.start&&`${def.start}–${def.end}`}</span>
                {current===code&&<span>✓</span>}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export function Schedule({ user, toast, onRefresh, storeData }) {
  const isAdmin = user.role === 'admin'
  const { agents, leaves, scheduleCache, loadSchedule, setScheduleCache } = storeData

  const [weekKey,     setWeekKey]     = useState(()=>isAdmin?getNextWeekKey(getCurrentWeekKey()):getCurrentWeekKey())
  const [picker,      setPicker]      = useState(null)
  const [rejectModal, setRejectModal] = useState(false)
  const [rejectNote,  setRejectNote]  = useState('')
  const [saving,      setSaving]      = useState(false)

  useEffect(() => { loadSchedule(weekKey) }, [weekKey])

  const cached   = scheduleCache[weekKey] || { status:'draft', shifts:{} }
  const schedule = cached.shifts || {}
  const status   = cached.status || 'draft'
  const dates    = getWeekDates(weekKey)
  const approvedLeaves = leaves.filter(l=>l.status==='approved')
  const { warnings } = analyzeWeekCoverage(weekKey, schedule, agents, approvedLeaves)
  const warnDates = new Set(warnings.map(w=>w.dateStr))

  const getCell = (agentId, dateStr) => {
    const onLeave = approvedLeaves.some(l=>(l.userId===agentId)&&dateStr>=l.from&&dateStr<=l.to)
    if (onLeave) return 'LEAVE'
    return schedule[agentId]?.[dateStr] || agents.find(a=>(a._id||a.id)===agentId)?.defaultShift || 'MC'
  }

  const canEdit = isAdmin ? (status==='draft'||status==='rejected') : status==='draft'

  const handleCellClick = (agent, dateStr) => {
    if (!canEdit||!isAdmin) return
    const agentId = agent._id || agent.id
    const current = getCell(agentId, dateStr)
    if (current==='LEAVE') return
    setPicker({ agent, dateStr, current })
  }

  const handlePick = async (agent, dateStr, code) => {
    const agentId = agent._id || agent.id
    setSaving(true)
    try {
      await setAgentShift(weekKey, agentId, dateStr, code)
      // Optimistic update
      setScheduleCache(prev => ({
        ...prev,
        [weekKey]: {
          ...prev[weekKey],
          shifts: {
            ...(prev[weekKey]?.shifts||{}),
            [agentId]: { ...(prev[weekKey]?.shifts?.[agentId]||{}), [dateStr]: code }
          }
        }
      }))
    } catch(e) { toast(e.message,'danger') }
    setSaving(false)
  }

  const handleStatusChange = async (newStatus) => {
    setSaving(true)
    try {
      await setWeekStatus(weekKey, newStatus)
      setScheduleCache(prev=>({ ...prev, [weekKey]:{ ...(prev[weekKey]||{}), status:newStatus } }))
      toast(`Schedule ${newStatus}!`, newStatus==='approved'?'success':'warning')
      onRefresh()
    } catch(e) { toast(e.message,'danger') }
    setSaving(false)
  }

  const handleAutoGen = async () => {
    if (!window.confirm('Auto-generate from default shifts? This overwrites the current draft.')) return
    setSaving(true)
    try {
      await autoGenerateWeek(weekKey)
      await loadSchedule(weekKey)
      toast('Schedule auto-generated!','success')
    } catch(e) { toast(e.message,'danger') }
    setSaving(false)
  }

  const weekLabel = () => {
    if (!dates[0]) return weekKey
    const d1=new Date(dates[0]), d2=new Date(dates[6])
    return `${d1.toLocaleDateString('en-GB',{day:'numeric',month:'short'})} – ${d2.toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})}`
  }

  const displayAgents = isAdmin ? agents : agents.filter(a=>(a._id||a.id)===(user._id||user.id))

  return (
    <div className="page">
      <div className="page-hd">
        <div style={{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
          <h1>Weekly Schedule</h1>
          <span className={`status-tag status-${status}`}>{status.toUpperCase()}</span>
          {saving&&<span style={{fontSize:11,color:'var(--t2)'}}>⏳ Saving…</span>}
        </div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          {isAdmin&&canEdit&&<button className="btn btn-sm btn-outline" onClick={handleAutoGen} disabled={saving}>⚡ Auto-Generate</button>}
          {isAdmin&&<button className="btn btn-sm btn-outline" onClick={()=>exportScheduleExcel(weekKey,agents,schedule,approvedLeaves)}>⬇ Excel</button>}
          {isAdmin&&status==='pending'&&<>
            <button className="btn btn-sm btn-success" onClick={()=>handleStatusChange('approved')} disabled={saving}>✓ Approve</button>
            <button className="btn btn-sm btn-danger"  onClick={()=>setRejectModal(true)} disabled={saving}>✕ Reject</button>
          </>}
          {!isAdmin&&status==='draft'&&(
            <button className="btn btn-sm btn-primary" onClick={()=>handleStatusChange('pending')} disabled={saving}>
              📤 Submit for Approval
            </button>
          )}
        </div>
      </div>

      <div className="week-nav">
        <button className="btn btn-sm" onClick={()=>setWeekKey(getPrevWeekKey(weekKey))}>← Prev</button>
        <span className="week-lbl">📅 {weekLabel()}</span>
        <button className="btn btn-sm" onClick={()=>setWeekKey(getNextWeekKey(weekKey))}>Next →</button>
      </div>

      {warnings.length>0&&(
        <div className="warn-banner">
          <strong>⚠ {warnings.length} coverage warning{warnings.length>1?'s':''}</strong>
          <ul>{warnings.slice(0,6).map((w,i)=>(
            <li key={i}>{getDayName(w.dateStr)} {formatDate(w.dateStr)} — {SHIFT_TYPES[w.shiftCode]?.label}: {w.count}/{w.required} agents</li>
          ))}</ul>
        </div>
      )}
      {!isAdmin&&<div className="info-banner">👁 View only. Use "Request Shift" to request changes.</div>}

      <div className="card card-np">
        <div className="tbl-wrap" style={{maxHeight:'65vh'}}>
          <table>
            <thead>
              <tr>
                <th className="sticky-col" style={{minWidth:50}}>Emp ID</th>
                <th className="sticky-col2" style={{minWidth:150}}>Employee Name</th>
                {dates.map(d=>(
                  <th key={d} style={{minWidth:130,textAlign:'center',background:warnDates.has(d)?'rgba(234,88,12,.08)':''}}>
                    <div style={{fontWeight:700,fontSize:12}}>{formatDate(d)}</div>
                    <div style={{fontSize:10,color:'var(--t2)'}}>{getDayName(d)}</div>
                    {warnDates.has(d)&&<div style={{fontSize:9,color:'#ea580c',fontWeight:700}}>⚠ LOW</div>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayAgents.map(agent=>{
                const agentId = agent._id || agent.id
                return (
                  <tr key={agentId} className={agent.highlight==='orange'?'row-orange':''}>
                    <td className="sticky-col"><span className="empid">{agent.employeeId}</span></td>
                    <td className="sticky-col2">
                      <div style={{display:'flex',alignItems:'center',gap:7}}>
                        <div className={`av ${agent.highlight==='orange'?'av-orange':'av-gray'}`} style={{width:24,height:24,fontSize:9}}>{agent.name.slice(0,1)}</div>
                        <span style={{fontWeight:500,fontSize:12}}>{agent.name}</span>
                      </div>
                    </td>
                    {dates.map(dateStr=>{
                      const code=getCell(agentId, dateStr)
                      const def=SHIFT_TYPES[code]||SHIFT_TYPES['MC']
                      const edit=canEdit&&isAdmin&&code!=='LEAVE'
                      const isWE=['Sat','Sun'].includes(getDayName(dateStr))
                      return (
                        <td key={dateStr} style={{textAlign:'center',padding:'6px 4px'}}>
                          <div className={`shift-pill ${edit?'editable':''}`}
                            style={{background:def.color,color:def.textColor,opacity:isWE&&code==='OFF'?.5:1}}
                            onClick={()=>handleCellClick(agent,dateStr)}
                            title={edit?'Click to change':def.label}>
                            <div style={{fontSize:11,fontWeight:700}}>{code}</div>
                            <div style={{fontSize:9,marginTop:1}}>{def.start?`${def.start}–${def.end}`:def.label}</div>
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{display:'flex',flexWrap:'wrap',gap:8,marginTop:12}}>
        {Object.entries(SHIFT_TYPES).map(([code,def])=>(
          <div key={code} style={{display:'flex',alignItems:'center',gap:4,fontSize:11}}>
            <div style={{width:10,height:10,background:def.color,borderRadius:2}}/>
            <span style={{color:'var(--t2)'}}>{code}: {def.label}</span>
          </div>
        ))}
      </div>

      {picker&&<ShiftPicker agent={picker.agent} dateStr={picker.dateStr} current={picker.current}
        onPick={code=>handlePick(picker.agent,picker.dateStr,code)} onClose={()=>setPicker(null)}/>}

      {rejectModal&&(
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setRejectModal(false)}>
          <div className="modal" style={{maxWidth:380}}>
            <div className="modal-hd"><h3>Reject Schedule</h3><button className="close-btn" onClick={()=>setRejectModal(false)}>×</button></div>
            <div className="modal-bd">
              <div className="form-group"><label>Reason (optional)</label>
                <textarea value={rejectNote} onChange={e=>setRejectNote(e.target.value)} placeholder="Reason for rejection…"/>
              </div>
            </div>
            <div className="modal-ft">
              <button className="btn" onClick={()=>setRejectModal(false)}>Cancel</button>
              <button className="btn btn-danger" onClick={()=>{ handleStatusChange('rejected'); setRejectModal(false) }}>Reject & Send Back</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
