// server/routes/leaves.js
const router = require('express').Router()
const Leave  = require('../models/Leave')
const User   = require('../models/User')
const { protect, adminOnly } = require('../middleware/auth')

router.use(protect)

// ── GET /api/leaves ───────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    let query = {}
    if (req.user.role === 'agent') query.userId = req.user._id

    const leaves = await Leave.find(query)
      .populate('userId', 'name employeeId email dept')
      .sort({ appliedAt: -1 })

    // Flatten for frontend compatibility
    const result = leaves.map(l => ({
      id:         l._id.toString(),
      _id:        l._id.toString(),
      userId:     l.userId._id.toString(),
      userName:   l.userId.name,
      userEmpId:  l.userId.employeeId,
      leaveType:  l.leaveType,
      from:       l.from,
      to:         l.to,
      reason:     l.reason,
      status:     l.status,
      remark:     l.remark,
      appliedAt:  l.appliedAt?.toISOString(),
      actionAt:   l.actionAt?.toISOString(),
    }))
    res.json({ ok: true, leaves: result })
  } catch (err) {
    res.status(500).json({ ok: false, msg: err.message })
  }
})

// ── POST /api/leaves  (agent applies) ────────────────────────
router.post('/', async (req, res) => {
  try {
    const { leaveType, from, to, reason } = req.body
    if (!from || !to || !reason)
      return res.status(400).json({ ok: false, msg: 'from, to, reason required' })

    const leave = await Leave.create({
      userId: req.user._id, leaveType: leaveType || 'Casual',
      from, to, reason
    })
    const pop = await leave.populate('userId', 'name employeeId')
    res.status(201).json({
      ok: true,
      leave: {
        id: leave._id.toString(),
        userId: req.user._id.toString(),
        userName: pop.userId.name,
        userEmpId: pop.userId.employeeId,
        leaveType: leave.leaveType, from, to, reason,
        status: 'pending',
        appliedAt: leave.appliedAt?.toISOString(),
      }
    })
  } catch (err) {
    res.status(500).json({ ok: false, msg: err.message })
  }
})

// ── PUT /api/leaves/:id/status  (admin only) ─────────────────
router.put('/:id/status', adminOnly, async (req, res) => {
  try {
    const { status, remark } = req.body
    const leave = await Leave.findByIdAndUpdate(
      req.params.id,
      { status, remark: remark || '', actionAt: new Date() },
      { new: true }
    ).populate('userId', 'name employeeId')

    if (!leave) return res.status(404).json({ ok: false, msg: 'Leave not found' })
    res.json({ ok: true, leave: { id: leave._id.toString(), status: leave.status } })
  } catch (err) {
    res.status(500).json({ ok: false, msg: err.message })
  }
})

// ── DELETE /api/leaves/:id  (agent cancels pending) ──────────
router.delete('/:id', async (req, res) => {
  try {
    const leave = await Leave.findById(req.params.id)
    if (!leave) return res.status(404).json({ ok: false, msg: 'Leave not found' })
    if (leave.userId.toString() !== req.user._id.toString() && req.user.role !== 'admin')
      return res.status(403).json({ ok: false, msg: 'Not authorized' })
    if (leave.status !== 'pending')
      return res.status(400).json({ ok: false, msg: 'Can only cancel pending leaves' })
    await leave.deleteOne()
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ ok: false, msg: err.message })
  }
})

module.exports = router
