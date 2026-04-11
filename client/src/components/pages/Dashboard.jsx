// client/src/components/pages/Dashboard.jsx
import React, { useState } from 'react'
import {
  SHIFT_TYPES, getCurrentWeekKey, getWeekDates, getDayName, formatDate,
  getNextWeekKey, getPrevWeekKey, analyzeWeekCoverage, resetToDefaults,
} from '../../data/store'
import { exportScheduleExcel, exportShiftRequestsExcel, exportLeavesExcel } from '../../data/excelExport'

export function Dashboard({ onNav, storeData }) {
  const { agents, leaves, requests, scheduleCache, loadSchedule } = storeData
  const weekKey  = getCurrentWeekKey()
  const schedule = scheduleCache[weekKey]?.shifts || {}
  const { warnings } = analyzeWeekCoverage(weekKey, schedule, agents, leaves)

  const metrics = [
    { label:'Total Agents',      value: agents.length,                                    color:'var(--blue)',   icon:'👥' },
    { label:'Pending Leaves',    value: leaves.filter(l=>l.status==='pending').length,    color:'var(--amber)',  icon:'🌿', link:'leaves' },
    { label:'Shift Requests',    value: requests.filter(r=>r.status==='pending').length,  color:'var(--purple)', icon:'🔄', link:'shift-requests' },
    { label:'Coverage Warnings', value: warnings.length, icon:'⚠',
      color: warnings.length>0?'var(--red)':'var(--green)' },
  ]

  const dist = {}
  Object.keys(SHIFT_TYPES).forEach(k=>{ dist[k]=0 })
  agents.forEach(a=>{ dist[a.defaultShift]=(dist[a.defaultShift]||0)+1 })

  return (
    <div className="page">
      <div className="page-hd">
        <div>
          <h1>Dashboard</h1>
          <p className="sub">Welcome back, Admin 👋 &nbsp;·&nbsp; <span className="ls-dot"/>
            Data stored in <strong>MongoDB</strong> — shared across all devices</p>
        </div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          <button className="btn btn-sm btn-outline"
            onClick={()=>exportScheduleExcel(weekKey, agents, schedule, leaves)}>⬇ Schedule Excel</button>
          <button className="btn btn-sm btn-outline"
            onClick={()=>exportShiftRequestsExcel(requests)}>⬇ Requests Excel</button>
          <button className="btn btn-sm btn-outline"
            onClick={()=>exportLeavesExcel(leaves)}>⬇ Leaves Excel</button>
          <button className="btn btn-sm btn-danger"
            onClick={()=>{ if(window.confirm('Logout and reload?')) resetToDefaults() }}>⏻ Logout</button>
        </div>
      </div>

      {/* MongoDB badge */}
      <div className="db-badge">
        <span className="db-dot"/>
        <span>Connected to MongoDB — multi-user, multi-device data storage active</span>
      </div>

      <div className="metrics-grid">
        {metrics.map(m=>(
          <div key={m.label} className="metric-card" style={{'--mc':m.color}}
            onClick={()=>m.link&&onNav(m.link)} role={m.link?'button':undefined}>
            <div className="mc-icon">{m.icon}</div>
            <div className="mc-val" style={{color:m.color}}>{m.value}</div>
            <div className="mc-label">{m.label}</div>
            {m.link&&<div className="mc-link">View →</div>}
          </div>
        ))}
      </div>

      <div className="two-col">
        <div className="card">
          <div className="card-title">Default Shift Distribution</div>
          {Object.entries(SHIFT_TYPES).filter(([,d])=>d.minAgents>0).map(([code,def])=>(
            <div key={code} style={{display:'flex',alignItems:'center',gap:10,marginBottom:9}}>
              <div style={{width:10,height:10,background:def.color,borderRadius:2,flexShrink:0}}/>
              <span style={{fontSize:12,flex:1,color:'var(--t2)',minWidth:170}}>{def.label}</span>
              <div style={{width:80,height:7,background:'var(--border)',borderRadius:4,overflow:'hidden'}}>
                <div style={{height:'100%',background:def.color,
                  width:`${agents.length?Math.min(100,((dist[code]||0)/agents.length)*100):0}%`}}/>
              </div>
              <span style={{fontSize:12,fontWeight:700,width:18,textAlign:'right'}}>{dist[code]||0}</span>
              <span style={{fontSize:10,color:'var(--t3)',width:22}}>/{def.minAgents}</span>
            </div>
          ))}
        </div>
        <div className="card">
          <div className="card-title">Recent Activity</div>
          {[...requests].slice(0,5).map(r=>(
            <div key={r.id} className="info-row">
              <span style={{fontSize:12}}><strong>{r.userName||'?'}</strong> — shift req</span>
              <span className={`badge badge-${r.status==='approved'?'green':r.status==='rejected'?'red':'amber'}`}>{r.status}</span>
            </div>
          ))}
          {[...leaves].slice(0,3).map(l=>(
            <div key={l.id} className="info-row">
              <span style={{fontSize:12}}><strong>{l.userName||'?'}</strong> — leave</span>
              <span className={`badge badge-${l.status==='approved'?'green':l.status==='rejected'?'red':'amber'}`}>{l.status}</span>
            </div>
          ))}
          {requests.length===0&&leaves.length===0&&
            <div style={{color:'var(--t3)',fontSize:13,textAlign:'center',padding:20}}>No activity yet</div>}
        </div>
      </div>
    </div>
  )
}

export function Coverage({ storeData }) {
  const { agents, leaves, scheduleCache, loadSchedule } = storeData
  const [weekKey, setWeekKey] = useState(getCurrentWeekKey)
  const schedule = scheduleCache[weekKey]?.shifts || {}

  React.useEffect(() => { loadSchedule(weekKey) }, [weekKey])

  const { coverage, warnings } = analyzeWeekCoverage(weekKey, schedule, agents, leaves)
  const dates     = getWeekDates(weekKey)
  const shiftKeys = Object.entries(SHIFT_TYPES).filter(([,d])=>d.minAgents>0).map(([k])=>k)

  const weekLabel = () => {
    const d=new Date(weekKey), d2=new Date(weekKey); d2.setDate(d2.getDate()+6)
    return `${d.toLocaleDateString('en-GB',{day:'numeric',month:'short'})} – ${d2.toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})}`
  }

  return (
    <div className="page">
      <div className="page-hd">
        <div><h1>Coverage Analysis</h1><p className="sub">Minimum staffing check per shift per day</p></div>
        <div style={{display:'flex',gap:8}}>
          <button className="btn btn-sm" onClick={()=>setWeekKey(getPrevWeekKey(weekKey))}>← Prev</button>
          <span style={{fontWeight:600,fontSize:13,padding:'6px 10px',background:'var(--s2)',borderRadius:6}}>{weekLabel()}</span>
          <button className="btn btn-sm" onClick={()=>setWeekKey(getNextWeekKey(weekKey))}>Next →</button>
        </div>
      </div>

      {warnings.length===0
        ? <div className="ok-banner">✅ All shifts meet minimum staffing for this week</div>
        : <div className="warn-banner">
            <strong>⚠ {warnings.length} coverage gap{warnings.length>1?'s':''} detected</strong>
            <ul style={{marginTop:8}}>{warnings.map((w,i)=>(
              <li key={i}>{getDayName(w.dateStr)} {formatDate(w.dateStr)} — {SHIFT_TYPES[w.shiftCode]?.label}: {w.count}/{w.required} agents</li>
            ))}</ul>
          </div>
      }

      <div className="card card-np">
        <div className="tbl-wrap">
          <table>
            <thead>
              <tr>
                <th style={{minWidth:200}}>Shift</th>
                {dates.map(d=>(
                  <th key={d} style={{textAlign:'center',minWidth:80}}>
                    <div style={{fontWeight:700,fontSize:12}}>{formatDate(d)}</div>
                    <div style={{fontSize:10,color:'var(--t2)'}}>{getDayName(d)}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shiftKeys.map(sc=>{
                const def=SHIFT_TYPES[sc]
                return (
                  <tr key={sc}>
                    <td>
                      <div style={{display:'flex',alignItems:'center',gap:8}}>
                        <div style={{width:10,height:10,background:def.color,borderRadius:2}}/>
                        <span style={{fontSize:12}}>{def.label}</span>
                        <span style={{fontSize:10,color:'var(--t3)'}}>min {def.minAgents}</span>
                      </div>
                    </td>
                    {dates.map(d=>{
                      const dn=getDayName(d); const isWE=dn==='Sat'||dn==='Sun'
                      const count=coverage[sc]?.[d]||0
                      const required=isWE?Math.max(1,def.minAgents-1):def.minAgents
                      const ok=count>=required
                      return (
                        <td key={d} style={{textAlign:'center'}}>
                          <span style={{
                            display:'inline-block',width:34,height:34,lineHeight:'34px',
                            borderRadius:'50%',fontWeight:700,fontSize:13,
                            background:count===0?'var(--s3)':ok?'rgba(22,163,74,.15)':'rgba(220,38,38,.12)',
                            color:count===0?'var(--t3)':ok?'#15803d':'#b91c1c',
                            border:`2px solid ${count===0?'var(--border)':ok?'#16a34a':'#dc2626'}`,
                          }}>{count}</span>
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
              <tr style={{background:'var(--s2)'}}>
                <td><strong style={{fontSize:12}}>Total agents / day</strong></td>
                {dates.map(d=>{
                  const total=shiftKeys.reduce((a,sc)=>a+(coverage[sc]?.[d]||0),0)
                  return <td key={d} style={{textAlign:'center',fontWeight:700}}>{total}</td>
                })}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <p style={{fontSize:11,color:'var(--t3)',marginTop:8}}>
        Required: MC≥4 · MR≥2 · S4≥2 · AC≥7 · AR≥2 · S6≥2 · EC≥3 · ER≥1 · S75≥1 · S5≥1 per day
      </p>
    </div>
  )
}
