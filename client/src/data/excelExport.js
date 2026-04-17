// client/src/data/excelExport.js
// ── xlsx compatible with Vite / ESM ──────────────────────────
import * as XLSX from 'xlsx'

function download(wb, filename) {
  XLSX.writeFile(wb, filename)
}

function autoWidths(ws, rows) {
  if (!rows || !rows[0]) return
  ws['!cols'] = rows[0].map((_, ci) => ({
    wch: Math.max(10, ...rows.map(r => String(r[ci] ?? '').length + 2))
  }))
}

// ── Schedule (one week) ───────────────────────────────────────
export function exportScheduleExcel(weekKey, agents, schedule, leaves) {
  const { getWeekDates, getDayName, formatDate, SHIFT_TYPES } = window.__shiftStore || {}
  // Fallback inline helpers if window store not set
  const _dates = (() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekKey); d.setDate(d.getDate() + i)
      return d.toISOString().slice(0, 10)
    })
  })()
  const _dayName = (ds) => new Date(ds).toLocaleDateString('en-GB', { weekday: 'short' })
  const _fmt     = (ds) => { const d = new Date(ds); return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}` }
  const SHIFTS   = _getShiftTypes()

  const headers = ['Emp ID', 'Employee Name', 'Department', 'Default Shift',
    ..._dates.map(d => `${_dayName(d)} ${_fmt(d)}`)]

  const rows = [headers]
  ;(agents || []).forEach(agent => {
    const id  = agent._id || agent.id
    const row = [
      agent.employeeId, agent.name, agent.dept || 'Support',
      SHIFTS[agent.defaultShift]?.label || agent.defaultShift,
    ]
    _dates.forEach(dateStr => {
      const onLeave = (leaves || []).some(l =>
        (l.userId === id) && l.status === 'approved' && dateStr >= l.from && dateStr <= l.to
      )
      const code = onLeave ? 'LEAVE' : (schedule?.[id]?.[dateStr] || agent.defaultShift)
      row.push(SHIFTS[code]?.label || code)
    })
    rows.push(row)
  })

  const ws = XLSX.utils.aoa_to_sheet(rows)
  autoWidths(ws, rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Schedule')
  download(wb, `schedule_${weekKey}.xlsx`)
}

// ── Shift Requests ────────────────────────────────────────────
export function exportShiftRequestsExcel(requests, label) {
  const SHIFTS = _getShiftTypes()
  const _dayName = (ds) => new Date(ds).toLocaleDateString('en-GB', { weekday: 'short' })

  const headers = ['Agent Name','Emp ID','Dept','Week','Date','Day',
    'Current Shift','Requested Shift','Reason','Status','Admin Note','Submitted','Actioned']
  const rows = [headers]
  ;(requests || []).forEach(r => {
    rows.push([
      r.userName || '?', r.userEmpId || '?', r.userDept || '',
      r.weekKey, r.dateStr, _dayName(r.dateStr),
      SHIFTS[r.currentShift]?.label   || r.currentShift,
      SHIFTS[r.requestedShift]?.label || r.requestedShift,
      r.reason, r.status, r.adminNote || '',
      r.submittedAt?.slice(0, 16) || '',
      r.actionAt?.slice(0, 16)   || '',
    ])
  })

  const ws = XLSX.utils.aoa_to_sheet(rows)
  autoWidths(ws, rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Shift Requests')
  download(wb, `shift_requests_${label || new Date().toISOString().slice(0,10)}.xlsx`)
}

// ── Leaves ────────────────────────────────────────────────────
export function exportLeavesExcel(leaves, label) {
  const headers = ['Agent Name','Emp ID','Leave Type','From','To','Days',
    'Reason','Status','Applied','Actioned','Remark']
  const rows = [headers]
  ;(leaves || []).forEach(l => {
    const days = Math.ceil((new Date(l.to) - new Date(l.from)) / 86400000) + 1
    rows.push([
      l.userName || '?', l.userEmpId || '?', l.leaveType,
      l.from, l.to, days, l.reason, l.status,
      l.appliedAt?.slice(0,10) || '',
      l.actionAt?.slice(0,10)  || '',
      l.remark || '',
    ])
  })

  const ws = XLSX.utils.aoa_to_sheet(rows)
  autoWidths(ws, rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Leaves')
  download(wb, `leaves_${label || new Date().toISOString().slice(0,10)}.xlsx`)
}

// ── Monthly Report ────────────────────────────────────────────
export function exportMonthlyReportExcel(month, agents, schedulesByWeek, allLeaves) {
  const SHIFTS = _getShiftTypes()
  const [y, m]       = month.split('-')
  const daysInMonth  = new Date(parseInt(y), parseInt(m), 0).getDate()
  const _dayName     = (ds) => new Date(ds).toLocaleDateString('en-GB', { weekday: 'short' })
  const _fmt         = (ds) => { const d = new Date(ds); return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}` }

  const allDates = Array.from({ length: daysInMonth }, (_, i) => {
    const day = String(i+1).padStart(2,'0')
    return `${y}-${String(m).padStart(2,'0')}-${day}`
  })

  const headers = ['Emp ID', 'Employee Name', 'Dept', 'Default Shift',
    ...allDates.map(d => `${_dayName(d)} ${_fmt(d)}`),
    'Work Days', 'Off Days', 'Leave Days']

  const rows = [headers]
  ;(agents || []).forEach(agent => {
    const id  = agent._id || agent.id
    const row = [
      agent.employeeId, agent.name,
      agent.dept || 'Support',
      SHIFTS[agent.defaultShift]?.label || agent.defaultShift,
    ]
    let workDays = 0, offDays = 0, leaveDays = 0

    allDates.forEach(dateStr => {
      const onLeave = (allLeaves || []).some(l =>
        (l.userId === id) && l.status === 'approved' &&
        dateStr >= l.from && dateStr <= l.to
      )
      const weekKey = _getWeekKey(dateStr)
      const weekSched = schedulesByWeek?.[weekKey] || {}
      let code = onLeave ? 'LEAVE' : (weekSched?.[id]?.[dateStr] || agent.defaultShift || 'MC')

      row.push(SHIFTS[code]?.label || code)
      if      (code === 'LEAVE')                workDays > 0 ? leaveDays++ : leaveDays++
      else if (code === 'OFF' || code === 'COMP') offDays++
      else                                        workDays++
    })

    row.push(workDays, offDays, leaveDays)
    rows.push(row)
  })

  const ws = XLSX.utils.aoa_to_sheet(rows)
  autoWidths(ws, rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, `Report ${month}`)
  download(wb, `monthly_report_${month}.xlsx`)
}

// ── Internal helpers ──────────────────────────────────────────
function _getWeekKey(dateStr) {
  const d = new Date(dateStr), day = d.getDay()
  const mon = new Date(d); mon.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
  return mon.toISOString().slice(0, 10)
}

function _getShiftTypes() {
  return {
    MC:    { label: '7:00 AM - 3:30 PM (Morning Call)',    color: '#16a34a', textColor: '#fff', start:'07:00', end:'15:30', minAgents:4,  category:'Morning'   },
    MR:    { label: '7:00 AM - 3:30 PM (Reporting)',       color: '#15803d', textColor: '#fff', start:'07:00', end:'15:30', minAgents:2,  category:'Morning'   },
    BC:    { label: '7:00 AM - 3:30 PM (Biopsy)',          color: '#0d9488', textColor: '#fff', start:'07:00', end:'15:30', minAgents:1,  category:'Morning'   },
    S4:    { label: '9:00 AM - 5:30 PM (General)',         color: '#0891b2', textColor: '#fff', start:'09:00', end:'17:30', minAgents:2,  category:'General'   },
    BS:    { label: '9:00 AM - 5:30 PM (Biopsy)',          color: '#0e7490', textColor: '#fff', start:'09:00', end:'17:30', minAgents:1,  category:'General'   },
    AC:    { label: '11:30 AM - 8:00 PM (Call)',           color: '#2563eb', textColor: '#fff', start:'11:30', end:'20:00', minAgents:7,  category:'Afternoon' },
    AR:    { label: '11:30 AM - 8:00 PM (Reporting)',      color: '#1d4ed8', textColor: '#fff', start:'11:30', end:'20:00', minAgents:2,  category:'Afternoon' },
    BA:    { label: '11:30 AM - 8:00 PM (Biopsy)',         color: '#7c3aed', textColor: '#fff', start:'11:30', end:'20:00', minAgents:1,  category:'Afternoon' },
    S6:    { label: '12:30 PM - 9:00 PM',                  color: '#b45309', textColor: '#fff', start:'12:30', end:'21:00', minAgents:2,  category:'Afternoon' },
    EC:    { label: '2:30 PM - 11:00 PM (Call)',           color: '#9333ea', textColor: '#fff', start:'14:30', end:'23:00', minAgents:3,  category:'Evening'   },
    ER:    { label: '2:30 PM - 11:00 PM (Reporting)',      color: '#6d28d9', textColor: '#fff', start:'14:30', end:'23:00', minAgents:1,  category:'Evening'   },
    S75:   { label: '7:30 PM - 4:00 AM',                   color: '#be185d', textColor: '#fff', start:'19:30', end:'04:00', minAgents:1,  category:'Night'     },
    S5:    { label: '10:30 PM - 7:00 AM',                  color: '#374151', textColor: '#fff', start:'22:30', end:'07:00', minAgents:1,  category:'Night'     },
    COMP:  { label: 'Comp Off',                            color: '#dc2626', textColor: '#fff', start:null,    end:null,    minAgents:0,  category:'Off'       },
    LEAVE: { label: 'Leave',                               color: '#ea580c', textColor: '#fff', start:null,    end:null,    minAgents:0,  category:'Off'       },
    OFF:   { label: 'Week Off',                            color: '#6b7280', textColor: '#fff', start:null,    end:null,    minAgents:0,  category:'Off'       },
  }
}
