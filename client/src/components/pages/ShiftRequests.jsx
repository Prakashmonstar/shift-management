// client/src/components/pages/ShiftRequests.jsx
import React, { useState } from 'react'
import { SHIFT_TYPES, getDayName, updateShiftRequestStatus, cancelShiftRequest } from '../../data/store'
import { exportShiftRequestsExcel } from '../../data/excelExport'

export function ShiftRequests({ toast, storeData }) {
  const { requests, refreshRequests, lastRefreshTime, nextRefreshIn } = storeData
  const [tab,         setTab]         = useState('pending')
  const [notes,       setNotes]       = useState({})
  const [saving,      setSaving]      = useState(false)
  const [filterName,  setFilterName]  = useState('')
  const [filterWeek,  setFilterWeek]  = useState('')
  const [filterShift, setFilterShift] = useState('')

  const TABS = ['all', 'pending', 'approved', 'rejected', 'cancelled']

  const filtered = requests.filter(r => {
    if (tab !== 'all' && r.status !== tab) return false
    if (filterName  && !r.userName?.toLowerCase().includes(filterName.toLowerCase()) && !r.userEmpId?.includes(filterName)) return false
    if (filterWeek  && !r.weekKey?.includes(filterWeek)) return false
    if (filterShift && r.currentShift !== filterShift && r.requestedShift !== filterShift) return false
    return true
  })

  const act = async (id, status) => {
    setSaving(true)
    try {
      await updateShiftRequestStatus(id, status, notes[id] || '')
      toast(`Request ${status}`, status === 'approved' ? 'success' : 'warning')
      await refreshRequests()
    } catch (e) { toast(e.message, 'danger') }
    setSaving(false)
  }

  const handleCancel = async (id) => {
    if (!window.confirm('Cancel this request?')) return
    setSaving(true)
    try {
      await cancelShiftRequest(id)
      toast('Request cancelled', 'warning')
      await refreshRequests()
    } catch (e) { toast(e.message, 'danger') }
    setSaving(false)
  }

  const handleManualRefresh = async () => {
    await refreshRequests()
    toast('Refreshed', 'info')
  }

  return (
    <div className="page">
      {/* ── Header ── */}
      <div className="page-hd">
        <div>
          <h1>Shift Change Requests</h1>
          <p className="sub">Review and action agent shift change requests</p>
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
          <button className="btn btn-sm btn-outline" onClick={() => exportShiftRequestsExcel(filtered, `requests_${new Date().toISOString().slice(0,10)}`)}>
            ⬇ Export Excel
          </button>
        </div>
      </div>

      {/* ── Filters ── */}
      <div style={{
        display:'flex', gap:8, flexWrap:'wrap', marginBottom:12,
        padding:'12px 14px', background:'var(--s2)',
        borderRadius:8, border:'1px solid var(--border)'
      }}>
        <input
          placeholder="🔍 Search agent name / emp ID…"
          value={filterName} onChange={e => setFilterName(e.target.value)}
          style={{ flex:1, minWidth:180 }}
        />
        <input
          placeholder="Filter by week (YYYY-MM-DD)…"
          value={filterWeek} onChange={e => setFilterWeek(e.target.value)}
          style={{ width:200 }}
        />
        <select value={filterShift} onChange={e => setFilterShift(e.target.value)} style={{ width:180 }}>
          <option value="">All Shifts</option>
          {Object.entries(SHIFT_TYPES).filter(([,d]) => d.minAgents > 0).map(([k,d]) => (
            <option key={k} value={k}>{k} — {d.label}</option>
          ))}
        </select>
        {(filterName || filterWeek || filterShift) && (
          <button className="btn btn-sm btn-outline"
            onClick={() => { setFilterName(''); setFilterWeek(''); setFilterShift('') }}>✕ Clear</button>
        )}
        <span style={{ fontSize:12, color:'var(--t2)', alignSelf:'center' }}>
          {filtered.length} record{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* ── Status Tabs ── */}
      <div className="tabs">
        {TABS.map(t => (
          <div key={t} className={`tab${tab === t ? ' active' : ''}`}
            onClick={() => setTab(t)} style={{ textTransform:'capitalize' }}>
            {t}
            {t !== 'all' && (
              <span style={{
                marginLeft:6, padding:'1px 7px', borderRadius:10, fontSize:10,
                background: tab === t ? 'rgba(255,255,255,.2)' : 'var(--s3)',
                fontWeight:700
              }}>
                {requests.filter(r => r.status === t).length}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* ── Content ── */}
      {filtered.length === 0 ? (
        <div className="empty-state">
          <div style={{fontSize:40,marginBottom:12}}>📋</div>
          No {tab === 'all' ? '' : tab} shift requests found.
          {(filterName || filterWeek || filterShift) && ' Try clearing filters.'}
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {filtered.map(r => {
            const cs = SHIFT_TYPES[r.currentShift]
            const rs = SHIFT_TYPES[r.requestedShift]
            return (
              <div key={r.id} className={`req-card req-${r.status}`}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10, flexWrap:'wrap', gap:8 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <span className="empid">{r.userEmpId}</span>
                    <span style={{ fontWeight:700, fontSize:14 }}>{r.userName || '?'}</span>
                    <span style={{ fontSize:12, color:'var(--t2)' }}>{r.userDept}</span>
                  </div>
                  <span className={`badge badge-${r.status==='approved'?'green':r.status==='rejected'?'red':r.status==='cancelled'?'gray':'amber'}`}>
                    {r.status}
                  </span>
                </div>

                <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:8, flexWrap:'wrap' }}>
                  <div style={{ background:'var(--s2)', borderRadius:6, padding:'4px 10px', fontSize:12 }}>
                    📅 Week: <strong>{r.weekKey}</strong>
                  </div>
                  <div style={{ background:'var(--s2)', borderRadius:6, padding:'4px 10px', fontSize:12 }}>
                    📆 {getDayName(r.dateStr)}, {new Date(r.dateStr).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})}
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <span style={{ background:cs?.color||'#888', color:cs?.textColor||'#fff', padding:'3px 10px', borderRadius:6, fontSize:12, fontWeight:700 }}>
                      {r.currentShift}: {cs?.label}
                    </span>
                    <span style={{ fontSize:18, color:'var(--t2)' }}>→</span>
                    <span style={{ background:rs?.color||'#888', color:rs?.textColor||'#fff', padding:'3px 10px', borderRadius:6, fontSize:12, fontWeight:700 }}>
                      {r.requestedShift}: {rs?.label}
                    </span>
                  </div>
                </div>

                <div style={{ fontSize:13, color:'var(--t2)', marginBottom:8, fontStyle:'italic' }}>
                  Agent reason: "{r.reason}"
                </div>

                {r.status === 'pending' && (
                  <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', borderTop:'1px solid var(--border)', paddingTop:10, marginTop:4 }}>
                    <input type="text" placeholder="Optional admin note…"
                      value={notes[r.id] || ''} onChange={e => setNotes(p => ({...p, [r.id]: e.target.value}))}
                      style={{ flex:1, minWidth:180 }}
                    />
                    <button className="btn btn-success btn-sm" onClick={() => act(r.id,'approved')} disabled={saving}>✓ Approve</button>
                    <button className="btn btn-danger  btn-sm" onClick={() => act(r.id,'rejected')} disabled={saving}>✕ Reject</button>
                    <button className="btn btn-sm btn-outline" onClick={() => handleCancel(r.id)} disabled={saving}>⊘ Cancel</button>
                  </div>
                )}

                {r.adminNote && (
                  <div style={{ fontSize:12, color:'var(--green)', marginTop:6 }}>
                    💬 Admin note: {r.adminNote}
                  </div>
                )}
                <div style={{ fontSize:10, color:'var(--t3)', marginTop:6 }}>
                  Submitted: {r.submittedAt?.slice(0,16)}
                  {r.actionAt && ` · Actioned: ${r.actionAt.slice(0,16)}`}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
