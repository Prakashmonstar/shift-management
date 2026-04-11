// client/src/data/excelExport.js
import * as XLSX from 'xlsx'
import { buildScheduleRows, buildShiftRequestRows, buildLeavesRows } from './store'

function dl(wb, filename) { XLSX.writeFile(wb, filename) }

export function exportScheduleExcel(weekKey, agents, schedule, leaves) {
  const rows = buildScheduleRows(weekKey, agents, schedule, leaves)
  const ws   = XLSX.utils.aoa_to_sheet(rows)
  ws['!cols'] = [{ wch:8 },{ wch:22 },{ wch:12 },{ wch:20 },...Array(7).fill({ wch:18 })]
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Schedule')
  dl(wb, `schedule_${weekKey}.xlsx`)
}

export function exportShiftRequestsExcel(requests) {
  const rows = buildShiftRequestRows(requests)
  const ws   = XLSX.utils.aoa_to_sheet(rows)
  ws['!cols'] = [{ wch:20 },{ wch:8 },{ wch:12 },{ wch:12 },{ wch:6 },
    { wch:22 },{ wch:22 },{ wch:30 },{ wch:10 },{ wch:20 },{ wch:18 },{ wch:18 }]
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Shift Requests')
  dl(wb, `shift_requests_${new Date().toISOString().slice(0,10)}.xlsx`)
}

export function exportLeavesExcel(leaves) {
  const rows = buildLeavesRows(leaves)
  const ws   = XLSX.utils.aoa_to_sheet(rows)
  ws['!cols'] = [{ wch:20 },{ wch:8 },{ wch:14 },{ wch:12 },
    { wch:12 },{ wch:6 },{ wch:30 },{ wch:10 },{ wch:12 },{ wch:12 },{ wch:20 }]
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Leaves')
  dl(wb, `leaves_${new Date().toISOString().slice(0,10)}.xlsx`)
}
