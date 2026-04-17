import * as XLSX from 'xlsx'
import { buildScheduleRows, buildShiftRequestRows, buildLeavesRows, buildMonthlyReportRows } from './store'

function dl(wb, filename) { XLSX.writeFile(wb, filename) }

function styleSheet(ws, colWidths) {
  ws['!cols'] = colWidths.map(w => ({ wch: w }))
  return ws
}

export function exportScheduleExcel(weekKey, agents, schedule, leaves) {
  const rows = buildScheduleRows(weekKey, agents, schedule, leaves)
  const ws = XLSX.utils.aoa_to_sheet(rows)
  styleSheet(ws, [8,22,12,20,...Array(7).fill(18)])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Schedule')
  dl(wb, `schedule_${weekKey}.xlsx`)
}

export function exportShiftRequestsExcel(requests, label) {
  const rows = buildShiftRequestRows(requests)
  const ws = XLSX.utils.aoa_to_sheet(rows)
  styleSheet(ws, [20,8,12,12,6,24,24,30,10,22,18,18])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Shift Requests')
  dl(wb, `shift_requests_${label||new Date().toISOString().slice(0,10)}.xlsx`)
}

export function exportLeavesExcel(leaves, label) {
  const rows = buildLeavesRows(leaves)
  const ws = XLSX.utils.aoa_to_sheet(rows)
  styleSheet(ws, [20,8,14,12,12,6,30,10,12,12,20])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Leaves')
  dl(wb, `leaves_${label||new Date().toISOString().slice(0,10)}.xlsx`)
}

// Monthly report — schedulesByWeek = { weekKey: { userId: { dateStr: code } } }
export function exportMonthlyReportExcel(month, agents, schedulesByWeek, leaves) {
  const rows = buildMonthlyReportRows(month, agents, schedulesByWeek, leaves)
  const ws = XLSX.utils.aoa_to_sheet(rows)
  const daysInMonth = rows[0].length - 4  // subtract empid,name,dept,default
  styleSheet(ws, [8,22,12,20,...Array(daysInMonth).fill(14),8,8,8])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, `Report ${month}`)
  dl(wb, `monthly_report_${month}.xlsx`)
}
