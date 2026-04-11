// server/routes/schedules.js
const router   = require('express').Router()
const Schedule = require('../models/Schedule')
const Leave    = require('../models/Leave')
const User     = require('../models/User')
const { protect, adminOnly } = require('../middleware/auth')

router.use(protect)

// ── GET /api/schedules/:weekKey ───────────────────────────────
router.get('/:weekKey', async (req, res) => {
  try {
    const { weekKey } = req.params
    let doc = await Schedule.findOne({ weekKey })
    if (!doc) {
      // Return empty schedule with draft status
      return res.json({ ok: true, weekKey, status: 'draft', shifts: {} })
    }
    // Convert Map to plain object for JSON
    const shifts = {}
    if (doc.shifts) {
      for (const [uid, dayMap] of doc.shifts) {
        shifts[uid] = {}
        if (dayMap && typeof dayMap.entries === 'function') {
          for (const [d, s] of dayMap) shifts[uid][d] = s
        } else if (dayMap && typeof dayMap === 'object') {
          Object.assign(shifts[uid], dayMap)
        }
      }
    }
    res.json({ ok: true, weekKey, status: doc.status, shifts })
  } catch (err) {
    res.status(500).json({ ok: false, msg: err.message })
  }
})

// ── PUT /api/schedules/:weekKey/shift  (admin only) ──────────
// Body: { userId, dateStr, shiftCode }
router.put('/:weekKey/shift', adminOnly, async (req, res) => {
  try {
    const { weekKey } = req.params
    const { userId, dateStr, shiftCode } = req.body

    let doc = await Schedule.findOne({ weekKey })
    if (!doc) doc = new Schedule({ weekKey, shifts: new Map() })

    if (!doc.shifts) doc.shifts = new Map()
    if (!doc.shifts.get(userId)) doc.shifts.set(userId, new Map())
    doc.shifts.get(userId).set(dateStr, shiftCode)
    doc.markModified('shifts')
    await doc.save()

    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ ok: false, msg: err.message })
  }
})

// ── PUT /api/schedules/:weekKey/bulk  (admin only) ────────────
// Body: { shifts: { userId: { dateStr: shiftCode } } }
router.put('/:weekKey/bulk', adminOnly, async (req, res) => {
  try {
    const { weekKey } = req.params
    const { shifts }  = req.body   // plain object

    const shiftMap = new Map()
    for (const [uid, days] of Object.entries(shifts || {})) {
      shiftMap.set(uid, new Map(Object.entries(days)))
    }

    await Schedule.findOneAndUpdate(
      { weekKey },
      { weekKey, shifts: shiftMap },
      { upsert: true, new: true }
    )
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ ok: false, msg: err.message })
  }
})

// ── PUT /api/schedules/:weekKey/status ────────────────────────
// Body: { status }
router.put('/:weekKey/status', protect, async (req, res) => {
  try {
    const { weekKey } = req.params
    const { status }  = req.body

    // Agents can only set to 'pending', admins can set any
    if (req.user.role === 'agent' && status !== 'pending')
      return res.status(403).json({ ok: false, msg: 'Agents can only submit (pending)' })

    await Schedule.findOneAndUpdate(
      { weekKey },
      { weekKey, status },
      { upsert: true, new: true }
    )
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ ok: false, msg: err.message })
  }
})

// ── POST /api/schedules/:weekKey/auto-generate  (admin) ──────
router.post('/:weekKey/auto-generate', adminOnly, async (req, res) => {
  try {
    const { weekKey } = req.params
    const agents  = await User.find({ role: 'agent', isActive: true })
    const leaves  = await Leave.find({ status: 'approved' })
    const dates   = getWeekDates(weekKey)
    const shiftMap = new Map()

    agents.forEach(agent => {
      const dayMap = new Map()
      dates.forEach((dateStr, idx) => {
        const onLeave = leaves.some(l => l.userId.toString() === agent._id.toString() && dateStr >= l.from && dateStr <= l.to)
        if (onLeave)      dayMap.set(dateStr, 'LEAVE')
        else if (idx === 6) dayMap.set(dateStr, 'OFF')
        else                dayMap.set(dateStr, agent.defaultShift || 'MC')
      })
      shiftMap.set(agent._id.toString(), dayMap)
    })

    await Schedule.findOneAndUpdate(
      { weekKey },
      { weekKey, shifts: shiftMap, status: 'draft' },
      { upsert: true, new: true }
    )
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ ok: false, msg: err.message })
  }
})

// helper
function getWeekDates(weekKey) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekKey)
    d.setDate(d.getDate() + i)
    return d.toISOString().slice(0, 10)
  })
}

module.exports = router
