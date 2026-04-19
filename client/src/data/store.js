// client/src/data/store.js

// ─── SHIFT TYPES ─────────────────────────────────────────────
export const SHIFT_TYPES = {
  MC:    { label: '7:00 AM - 3:30 PM (Morning Call)',    color: '#16a34a', textColor: '#fff', start: '07:00', end: '15:30', minAgents: 4,  category: 'Morning'   },
  MR:    { label: '7:00 AM - 3:30 PM (Reporting)',       color: '#15803d', textColor: '#fff', start: '07:00', end: '15:30', minAgents: 2,  category: 'Morning'   },
  BC:    { label: '7:00 AM - 3:30 PM (Biopsy)',          color: '#0d9488', textColor: '#fff', start: '07:00', end: '15:30', minAgents: 1,  category: 'Morning'   },
  S4:    { label: '9:00 AM - 5:30 PM (General)',         color: '#0891b2', textColor: '#fff', start: '09:00', end: '17:30', minAgents: 2,  category: 'General'   },
  BS:    { label: '9:00 AM - 5:30 PM (Biopsy)',          color: '#0e7490', textColor: '#fff', start: '09:00', end: '17:30', minAgents: 1,  category: 'General'   },
  AC:    { label: '11:30 AM - 8:00 PM (Call)',           color: '#2563eb', textColor: '#fff', start: '11:30', end: '20:00', minAgents: 7,  category: 'Afternoon' },
  AR:    { label: '11:30 AM - 8:00 PM (Reporting)',      color: '#1d4ed8', textColor: '#fff', start: '11:30', end: '20:00', minAgents: 2,  category: 'Afternoon' },
  BA:    { label: '11:30 AM - 8:00 PM (Biopsy)',         color: '#7c3aed', textColor: '#fff', start: '11:30', end: '20:00', minAgents: 1,  category: 'Afternoon' },
  S6:    { label: '12:30 PM - 9:00 PM',                  color: '#b45309', textColor: '#fff', start: '12:30', end: '21:00', minAgents: 2,  category: 'Afternoon' },
  EC:    { label: '2:30 PM - 11:00 PM (Call)',           color: '#9333ea', textColor: '#fff', start: '14:30', end: '23:00', minAgents: 3,  category: 'Evening'   },
  ER:    { label: '2:30 PM - 11:00 PM (Reporting)',      color: '#6d28d9', textColor: '#fff', start: '14:30', end: '23:00', minAgents: 1,  category: 'Evening'   },
  S75:   { label: '7:30 PM - 4:00 AM',                   color: '#be185d', textColor: '#fff', start: '19:30', end: '04:00', minAgents: 1,  category: 'Night'     },
  S5:    { label: '10:30 PM - 7:00 AM',                  color: '#374151', textColor: '#fff', start: '22:30', end: '07:00', minAgents: 1,  category: 'Night'     },
  COMP:  { label: 'Comp Off',                            color: '#dc2626', textColor: '#fff', start: null,    end: null,    minAgents: 0,  category: 'Off'       },
  LEAVE: { label: 'Leave',                               color: '#ea580c', textColor: '#fff', start: null,    end: null,    minAgents: 0,  category: 'Off'       },
  OFF:   { label: 'Week Off',                            color: '#6b7280', textColor: '#fff', start: null,    end: null,    minAgents: 0,  category: 'Off'       },
}

export const otpStore = {}

// ─── API helper ───────────────────────────────────────────────
function getToken() { return localStorage.getItem('sf_jwt') || '' }

export async function apiFetch(path, options = {}) {
  const res = await fetch(`/api${path}`, {
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
    const data = await apiFetch('/auth/login', { method: 'POST', body: { email, password } })
    localStorage.setItem('sf_jwt',  data.token)
    localStorage.setItem('sf_user', JSON.stringify(data.user))
    return { ok: true, user: data.user }
  } catch (err) { return { ok: false, msg: err.message } }
}

export function logout() {
  localStorage.removeItem('sf_jwt')
  localStorage.removeItem('sf_user')
}

export function getSession() {
  try { const raw = localStorage.getItem('sf_user'); return raw ? JSON.parse(raw) : null }
  catch { return null }
}

export async function changePassword(_uid, oldPwd, newPwd) {
  try {
    await apiFetch('/auth/change-password', { method: 'PUT', body: { oldPassword: oldPwd, newPassword: newPwd } })
    return { ok: true }
  } catch (err) { return { ok: false, msg: err.message } }
}



// ─── USERS ────────────────────────────────────────────────────
export async function fetchUsers()            { const d = await apiFetch('/users');        return d.users || [] }
export async function fetchAgents()           { const d = await apiFetch('/users/agents'); return d.users || [] }
export async function addUser(user)           { const d = await apiFetch('/users', { method: 'POST', body: user }); return d.user }
export async function updateUser(id, changes) { const d = await apiFetch(`/users/${id}`, { method: 'PUT', body: changes }); return d.user }
export async function deleteUser(id)          { await apiFetch(`/users/${id}`, { method: 'DELETE' }) }

// ─── DATE / WEEK HELPERS ──────────────────────────────────────
export function getWeekKey(date) {
  const d = new Date(date), day = d.getDay()
  const mon = new Date(d); mon.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
  return mon.toISOString().slice(0, 10)
}
export function getCurrentWeekKey() { return getWeekKey(new Date()) }
export function getNextWeekKey(k)   { const d = new Date(k); d.setDate(d.getDate() + 7); return d.toISOString().slice(0, 10) }
export function getPrevWeekKey(k)   { const d = new Date(k); d.setDate(d.getDate() - 7); return d.toISOString().slice(0, 10) }
export function getWeekDates(weekKey) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekKey); d.setDate(d.getDate() + i); return d.toISOString().slice(0, 10)
  })
}
export function formatDate(dateStr) {
  const d = new Date(dateStr)
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`
}
export function getDayName(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-GB', { weekday: 'short' })
}

// ─── SCHEDULE ─────────────────────────────────────────────────
export async function fetchWeekSchedule(weekKey) {
  const data = await apiFetch(`/schedules/${weekKey}`)
  return { status: data.status, shifts: data.shifts || {} }
}
export async function setAgentShift(weekKey, userId, dateStr, shiftCode, prevCode) {
  return await apiFetch(`/schedules/${weekKey}/shift`, { method: 'PUT', body: { userId, dateStr, shiftCode, prevCode } })
}
export async function bulkSetWeek(weekKey, shifts) {
  await apiFetch(`/schedules/${weekKey}/bulk`, { method: 'PUT', body: { shifts } })
}
export async function setWeekStatus(weekKey, status) {
  await apiFetch(`/schedules/${weekKey}/status`, { method: 'PUT', body: { status } })
}
export async function autoGenerateWeek(weekKey) {
  await apiFetch(`/schedules/${weekKey}/auto-generate`, { method: 'POST' })
}

// ─── LEAVES ───────────────────────────────────────────────────
export async function fetchLeaves(month) {
  const qs = month ? `?month=${month}` : ''
  const d  = await apiFetch(`/leaves${qs}`)
  return d.leaves || []
}
export async function applyLeave(req) {
  const d = await apiFetch('/leaves', { method: 'POST', body: req })
  return d.leave
}
export async function updateLeaveStatus(id, status, remark = '') {
  await apiFetch(`/leaves/${id}/status`, { method: 'PUT', body: { status, remark } })
}
export async function cancelLeave(id) {
  await apiFetch(`/leaves/${id}`, { method: 'DELETE' })
}

// ─── SHIFT REQUESTS ───────────────────────────────────────────
export async function fetchShiftRequests(month) {
  const qs = month ? `?month=${month}` : ''
  const d  = await apiFetch(`/shift-requests${qs}`)
  return d.requests || []
}
export async function submitShiftRequest(req) {
  const d = await apiFetch('/shift-requests', { method: 'POST', body: req })
  return d.request
}
export async function updateShiftRequestStatus(id, status, adminNote = '') {
  await apiFetch(`/shift-requests/${id}/status`, { method: 'PUT', body: { status, adminNote } })
}
export async function cancelShiftRequest(id) {
  await apiFetch(`/shift-requests/${id}`, { method: 'DELETE' })
}

// ─── COVERAGE ─────────────────────────────────────────────────
export function analyzeWeekCoverage(weekKey, schedule, agents, leaves) {
  const dates    = getWeekDates(weekKey)
  const warnings = []
  const coverage = {}
  Object.keys(SHIFT_TYPES).forEach(sc => { coverage[sc] = {}; dates.forEach(d => { coverage[sc][d] = 0 }) })

  ;(agents || []).forEach(agent => {
    const id = agent._id || agent.id
    dates.forEach(dateStr => {
      const onLeave = (leaves || []).some(l =>
        (l.userId === id) && l.status === 'approved' && dateStr >= l.from && dateStr <= l.to
      )
      const code = onLeave ? 'LEAVE' : (schedule?.[id]?.[dateStr] || agent.defaultShift || 'MC')
      if (coverage[code]) coverage[code][dateStr] = (coverage[code][dateStr] || 0) + 1
    })
  })

  dates.forEach(dateStr => {
    const dn = getDayName(dateStr), isWE = dn === 'Sat' || dn === 'Sun'
    Object.entries(SHIFT_TYPES).forEach(([sc, def]) => {
      if (def.minAgents === 0) return
      const count    = coverage[sc]?.[dateStr] || 0
      const required = isWE ? Math.max(1, def.minAgents - 1) : def.minAgents
      if (count < required) warnings.push({ dateStr, shiftCode: sc, count, required, dn })
    })
  })
  return { coverage, warnings }
}

export function initStore()       {}



export async function updateProfile(updates) {
  try {
    const data = await apiFetch('/auth/profile', { method: 'PUT', body: updates })
    if (data.ok && data.user) {
      localStorage.setItem('sf_user', JSON.stringify(data.user))
      return { ok: true, user: data.user }
    }
    return { ok: false, msg: data.msg || 'Failed to update profile' }
  } catch (err) { 
    return { ok: false, msg: err.message } 
  }
}
export function resetToDefaults() { logout(); window.location.reload() }
