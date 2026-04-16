// client/src/data/store.js
// ── API-backed store — replaces localStorage ─────────────────
// All functions return Promises. Components use useStore() hook.

// ─── SHIFT TYPES (unchanged from v1) ─────────────────────────
export const SHIFT_TYPES = {
  MC:   { label: '7:00 AM - 3:30 PM - Call',      start: '07:00', end: '15:30', minAgents: 4, category: 'Morning',   color: '#16a34a', textColor: '#fff' },
  MR:   { label: '7:00 AM - 3:30 PM - Reporting',    start: '07:00', end: '15:30', minAgents: 2, category: 'Morning',   color: '#15803d', textColor: '#fff' },
  S4:   { label: '9:00 AM – 5:30 PM',   start: '09:00', end: '17:30', minAgents: 2, category: 'General',   color: '#0891b2', textColor: '#fff' },
  AC:   { label: '11:00 AM - 7:30 PM - Call',        start: '11:00', end: '19:30', minAgents: 7, category: 'Afternoon', color: '#2563eb', textColor: '#fff' },
  AC:   { label: '11:30 AM - 8:00 PM - Call',        start: '11:30', end: '20:00', minAgents: 7, category: 'Afternoon', color: '#2563eb', textColor: '#fff' },
  AR:   { label: '11:30 AM - 8:00 PM - Reporting',      start: '11:30', end: '20:00', minAgents: 2, category: 'Afternoon', color: '#1d4ed8', textColor: '#fff' },
  S6:   { label: '12:30 PM – 9:00 PM',  start: '12:30', end: '21:00', minAgents: 2, category: 'Afternoon', color: '#b45309', textColor: '#fff' },
  EC:   { label: '2:30 PM - 11:00 PM - Call',      start: '14:30', end: '23:00', minAgents: 3, category: 'Evening',   color: '#7c3aed', textColor: '#fff' },
  ER:   { label: '2:30 PM - 11:00 PM - Reporting',    start: '14:30', end: '23:00', minAgents: 1, category: 'Evening',   color: '#6d28d9', textColor: '#fff' },
  S75:  { label: '7:30 PM – 4:00 AM',   start: '19:30', end: '04:00', minAgents: 1, category: 'Night',     color: '#be185d', textColor: '#fff' },
  S5:   { label: '10:30 PM – 7:00 AM',  start: '22:30', end: '07:00', minAgents: 1, category: 'Night',     color: '#374151', textColor: '#fff' },
  COMP: { label: 'Comp Off',             start: null,    end: null,    minAgents: 0, category: 'Off',       color: '#dc2626', textColor: '#fff' },
  LEAVE:{ label: 'Leave',               start: null,    end: null,    minAgents: 0, category: 'Off',       color: '#ea580c', textColor: '#fff' },
  OFF:  { label: 'Casual Leave',      start: null,    end: null,    minAgents: 0, category: 'Off',       color: '#6b7280', textColor: '#fff' },

  OFF:  { label: 'Week Off',            start: null,    end: null,    minAgents: 0, category: 'Off',       color: '#6b7280', textColor: '#fff' },
}



export const otpStore = {}

// ─── API helper ───────────────────────────────────────────────
const BASE = '/api'

function getToken() {
  return localStorage.getItem('sf_jwt') || ''
}

export async function apiFetch(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getToken()}`,
      ...(options.headers || {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.msg || 'Request failed')
  return data
}

// ─── AUTH ─────────────────────────────────────────────────────
export async function login(email, password) {
  try {
    const data = await apiFetch('/auth/login', {
      method: 'POST', body: { email, password }
    })
    localStorage.setItem('sf_jwt', data.token)
    localStorage.setItem('sf_user', JSON.stringify(data.user))
    return { ok: true, user: data.user }
  } catch (err) {
    return { ok: false, msg: err.message }
  }
}

export function logout() {
  localStorage.removeItem('sf_jwt')
  localStorage.removeItem('sf_user')
}

export function getSession() {
  try {
    const raw = localStorage.getItem('sf_user')
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

export async function changePassword(userId, oldPwd, newPwd) {
  try {
    await apiFetch('/auth/change-password', {
      method: 'PUT', body: { oldPassword: oldPwd, newPassword: newPwd }
    })
    return { ok: true }
  } catch (err) {
    return { ok: false, msg: err.message }
  }
}

// ─── USERS ────────────────────────────────────────────────────
// These are async now — components use the useStore() hook which caches results

export async function fetchUsers() {
  const data = await apiFetch('/users')
  return data.users || []
}

export async function fetchAgents() {
  const data = await apiFetch('/users/agents')
  return data.users || []
}

export async function addUser(user) {
  const data = await apiFetch('/users', { method: 'POST', body: user })
  return data.user
}

export async function updateUser(id, changes) {
  const data = await apiFetch(`/users/${id}`, { method: 'PUT', body: changes })
  return data.user
}

export async function deleteUser(id) {
  await apiFetch(`/users/${id}`, { method: 'DELETE' })
}

export async function getUserByEmail(email) {
  const users = await fetchUsers()
  return users.find(u => u.email.toLowerCase() === email.toLowerCase())
}

// ─── DATE / WEEK HELPERS (pure — unchanged) ───────────────────
export function getWeekKey(date) {
  const d   = new Date(date)
  const day = d.getDay()
  const mon = new Date(d)
  mon.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
  return mon.toISOString().slice(0, 10)
}

export function getCurrentWeekKey() { return getWeekKey(new Date()) }

export function getNextWeekKey(k) {
  const d = new Date(k); d.setDate(d.getDate() + 7); return d.toISOString().slice(0, 10)
}

export function getPrevWeekKey(k) {
  const d = new Date(k); d.setDate(d.getDate() - 7); return d.toISOString().slice(0, 10)
}

export function getWeekDates(weekKey) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekKey); d.setDate(d.getDate() + i); return d.toISOString().slice(0, 10)
  })
}

export function formatDate(dateStr) {
  const d = new Date(dateStr)
  return String(d.getDate()).padStart(2,'0') + '/' + String(d.getMonth()+1).padStart(2,'0')
}

export function getDayName(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-GB', { weekday: 'short' })
}

// ─── SCHEDULE ─────────────────────────────────────────────────
export async function fetchWeekSchedule(weekKey) {
  const data = await apiFetch(`/schedules/${weekKey}`)
  return { status: data.status, shifts: data.shifts || {} }
}

export async function setAgentShift(weekKey, userId, dateStr, shiftCode) {
  await apiFetch(`/schedules/${weekKey}/shift`, {
    method: 'PUT', body: { userId, dateStr, shiftCode }
  })
}

export async function bulkSetWeek(weekKey, shifts) {
  await apiFetch(`/schedules/${weekKey}/bulk`, {
    method: 'PUT', body: { shifts }
  })
}

export async function setWeekStatus(weekKey, status) {
  await apiFetch(`/schedules/${weekKey}/status`, {
    method: 'PUT', body: { status }
  })
}

export async function autoGenerateWeek(weekKey) {
  await apiFetch(`/schedules/${weekKey}/auto-generate`, { method: 'POST' })
}

// ─── LEAVES ───────────────────────────────────────────────────
export async function fetchLeaves() {
  const data = await apiFetch('/leaves')
  return data.leaves || []
}

export async function applyLeave(req) {
  const data = await apiFetch('/leaves', { method: 'POST', body: req })
  return data.leave
}

export async function updateLeaveStatus(id, status, remark = '') {
  await apiFetch(`/leaves/${id}/status`, { method: 'PUT', body: { status, remark } })
}

export async function cancelLeave(id) {
  await apiFetch(`/leaves/${id}`, { method: 'DELETE' })
}

// ─── SHIFT REQUESTS ───────────────────────────────────────────
export async function fetchShiftRequests() {
  const data = await apiFetch('/shift-requests')
  return data.requests || []
}

export async function submitShiftRequest(req) {
  const data = await apiFetch('/shift-requests', { method: 'POST', body: req })
  return data.request
}

export async function updateShiftRequestStatus(id, status, adminNote = '') {
  await apiFetch(`/shift-requests/${id}/status`, {
    method: 'PUT', body: { status, adminNote }
  })
}

// ─── COVERAGE ANALYSIS (client-side, uses cached data) ────────
export function analyzeWeekCoverage(weekKey, schedule, agents, leaves) {
  const dates    = getWeekDates(weekKey)
  const warnings = []
  const coverage = {}

  Object.keys(SHIFT_TYPES).forEach(sc => {
    coverage[sc] = {}
    dates.forEach(d => { coverage[sc][d] = 0 })
  })

  ;(agents || []).forEach(agent => {
    dates.forEach(dateStr => {
      const onLeave = (leaves || []).some(l =>
        l.userId === agent._id || l.userId === agent.id
          ? dateStr >= l.from && dateStr <= l.to
          : false
      )
      const code = onLeave
        ? 'LEAVE'
        : (schedule?.[agent._id || agent.id]?.[dateStr] || agent.defaultShift || 'MC')
      if (coverage[code]) coverage[code][dateStr]++
    })
  })

  dates.forEach(dateStr => {
    const dn = getDayName(dateStr)
    const isWE = dn === 'Sat' || dn === 'Sun'
    Object.entries(SHIFT_TYPES).forEach(([sc, def]) => {
      if (def.minAgents === 0) return
      const count    = coverage[sc]?.[dateStr] || 0
      const required = isWE ? Math.max(1, def.minAgents - 1) : def.minAgents
      if (count < required) warnings.push({ dateStr, shiftCode: sc, count, required, dn })
    })
  })

  return { coverage, warnings }
}

// ─── EXCEL EXPORT helpers (client-side) ──────────────────────
export function buildScheduleRows(weekKey, agents, schedule, leaves) {
  const dates   = getWeekDates(weekKey)
  const headers = ['Emp ID', 'Employee Name', 'Department', 'Default Shift',
    ...dates.map(d => `${getDayName(d)} ${formatDate(d)}`)]
  const rows = [headers]

  ;(agents || []).forEach(agent => {
    const id  = agent._id || agent.id
    const row = [agent.employeeId, agent.name, agent.dept || 'Support',
      SHIFT_TYPES[agent.defaultShift]?.label || agent.defaultShift]
    dates.forEach(dateStr => {
      const onLeave = (leaves || []).some(l =>
        (l.userId === id) && dateStr >= l.from && dateStr <= l.to
      )
      const code = onLeave ? 'LEAVE' : (schedule?.[id]?.[dateStr] || agent.defaultShift)
      row.push(SHIFT_TYPES[code]?.label || code)
    })
    rows.push(row)
  })
  return rows
}

export function buildShiftRequestRows(requests) {
  const headers = ['Agent Name','Emp ID','Week','Date','Day','Current Shift','Requested Shift','Reason','Status','Admin Note','Submitted','Actioned']
  const rows    = [headers]
  ;(requests || []).forEach(r => {
    rows.push([
      r.userName || '?', r.userEmpId || '?',
      r.weekKey, r.dateStr, getDayName(r.dateStr),
      SHIFT_TYPES[r.currentShift]?.label || r.currentShift,
      SHIFT_TYPES[r.requestedShift]?.label || r.requestedShift,
      r.reason, r.status, r.adminNote || '',
      r.submittedAt?.slice(0,16) || '',
      r.actionAt?.slice(0,16) || '',
    ])
  })
  return rows
}

export function buildLeavesRows(leaves) {
  const headers = ['Agent Name','Emp ID','Leave Type','From','To','Days','Reason','Status','Applied','Actioned','Remark']
  const rows    = [headers]
  ;(leaves || []).forEach(l => {
    const days = Math.ceil((new Date(l.to) - new Date(l.from)) / 86400000) + 1
    rows.push([
      l.userName || '?', l.userEmpId || '?',
      l.leaveType, l.from, l.to, days,
      l.reason, l.status,
      l.appliedAt?.slice(0,10) || '',
      l.actionAt?.slice(0,10) || '',
      l.remark || '',
    ])
  })
  return rows
}

// ─── initStore — no-op (seeding done by server/seed.js) ───────
export function initStore() {}
export function resetToDefaults() {
  logout()
  window.location.reload()
}
