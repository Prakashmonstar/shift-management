// server/routes/shiftRequests.js
const router       = require('express').Router()
const ShiftRequest = require('../models/ShiftRequest')
const Schedule     = require('../models/Schedule')
const { protect, adminOnly } = require('../middleware/auth')

router.use(protect)

// ── GET /api/shift-requests ───────────────────────────────────
router.get('/', async (req, res) => {
  try {
    let query = {}
    if (req.user.role === 'agent') query.userId = req.user._id

    const reqs = await ShiftRequest.find(query)
      .populate('userId', 'name employeeId dept')
      .sort({ submittedAt: -1 })

    const result = reqs.map(r => ({
      id:             r._id.toString(),
      userId:         r.userId._id.toString(),
      userName:       r.userId.name,
      userEmpId:      r.userId.employeeId,
      userDept:       r.userId.dept,
      weekKey:        r.weekKey,
      dateStr:        r.dateStr,
      currentShift:   r.currentShift,
      requestedShift: r.requestedShift,
      reason:         r.reason,
      status:         r.status,
      adminNote:      r.adminNote,
      submittedAt:    r.submittedAt?.toISOString(),
      actionAt:       r.actionAt?.toISOString(),
    }))
    res.json({ ok: true, requests: result })
  } catch (err) {
    res.status(500).json({ ok: false, msg: err.message })
  }
})

// ── POST /api/shift-requests  (agent) ────────────────────────
router.post('/', async (req, res) => {
  try {
    const { weekKey, dateStr, currentShift, requestedShift, reason } = req.body
    if (!weekKey || !dateStr || !currentShift || !requestedShift || !reason)
      return res.status(400).json({ ok: false, msg: 'All fields required' })

    const sr = await ShiftRequest.create({
      userId: req.user._id, weekKey, dateStr,
      currentShift, requestedShift, reason,
    })
    res.status(201).json({
      ok: true,
      request: {
        id: sr._id.toString(),
        userId: req.user._id.toString(),
        weekKey, dateStr, currentShift, requestedShift, reason,
        status: 'pending',
        submittedAt: sr.submittedAt?.toISOString(),
      }
    })
  } catch (err) {
    res.status(500).json({ ok: false, msg: err.message })
  }
})

// ── PUT /api/shift-requests/:id/status  (admin only) ─────────
router.put('/:id/status', adminOnly, async (req, res) => {
  try {
    const { status, adminNote } = req.body
    const sr = await ShiftRequest.findByIdAndUpdate(
      req.params.id,
      { status, adminNote: adminNote || '', actionAt: new Date() },
      { new: true }
    )
    if (!sr) return res.status(404).json({ ok: false, msg: 'Request not found' })

    // If approved → apply the shift change to the schedule
    if (status === 'approved') {
      let doc = await Schedule.findOne({ weekKey: sr.weekKey })
      if (!doc) doc = new Schedule({ weekKey: sr.weekKey, shifts: new Map() })
      if (!doc.shifts) doc.shifts = new Map()
      const uid = sr.userId.toString()
      if (!doc.shifts.get(uid)) doc.shifts.set(uid, new Map())
      doc.shifts.get(uid).set(sr.dateStr, sr.requestedShift)
      doc.markModified('shifts')
      await doc.save()
    }

    res.json({ ok: true, request: { id: sr._id.toString(), status: sr.status } })
  } catch (err) {
    res.status(500).json({ ok: false, msg: err.message })
  }
})

module.exports = router
