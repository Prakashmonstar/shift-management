// server/routes/leaves.js
const router = require('express').Router()
const Leave  = require('../models/Leave')
const User   = require('../models/User')
const { protect, adminOnly } = require('../middleware/auth')

router.use(protect)

function fmt(l) {
  return {
    id: l._id.toString(), _id: l._id.toString(),
    userId: l.userId._id ? l.userId._id.toString() : l.userId.toString(),
    userName: l.userId.name || '',
    userEmpId: l.userId.employeeId || '',
    leaveType: l.leaveType, from: l.from, to: l.to, reason: l.reason,
    status: l.status, remark: l.remark,
    appliedAt: l.appliedAt?.toISOString(),
    actionAt: l.actionAt?.toISOString(),
  }
}

router.get('/', async (req, res) => {
  try {
    let query = {}
    if (req.user.role === 'agent') query.userId = req.user._id
    // Support month filter: ?month=2025-07
    if (req.query.month) {
      const [y, m] = req.query.month.split('-')
      const from = `${y}-${m}-01`
      const to   = `${y}-${m}-31`
      query.from = { $lte: to }
      query.to   = { $gte: from }
    }
    const leaves = await Leave.find(query).populate('userId', 'name employeeId email dept').sort({ appliedAt: -1 })
    res.json({ ok: true, leaves: leaves.map(fmt) })
  } catch (err) { res.status(500).json({ ok: false, msg: err.message }) }
})

router.post('/', async (req, res) => {
  try {
    const { leaveType, from, to, reason } = req.body
    if (!from || !to || !reason) return res.status(400).json({ ok: false, msg: 'from, to, reason required' })
    const leave = await Leave.create({ userId: req.user._id, leaveType: leaveType || 'Casual', from, to, reason })
    const pop = await leave.populate('userId', 'name employeeId')
    res.status(201).json({
      ok: true,
      leave: { id: leave._id.toString(), userId: req.user._id.toString(), userName: pop.userId.name, userEmpId: pop.userId.employeeId, leaveType: leave.leaveType, from, to, reason, status: 'pending', appliedAt: leave.appliedAt?.toISOString() }
    })
  } catch (err) { res.status(500).json({ ok: false, msg: err.message }) }
})

// Admin approve/reject
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
  } catch (err) { res.status(500).json({ ok: false, msg: err.message }) }
})

// Agent cancel pending leave (DELETE = cancel, not hard delete; sets status=cancelled)
router.delete('/:id', async (req, res) => {
  try {
    const leave = await Leave.findById(req.params.id)
    if (!leave) return res.status(404).json({ ok: false, msg: 'Leave not found' })
    const uid = leave.userId.toString()
    if (uid !== req.user._id.toString() && req.user.role !== 'admin')
      return res.status(403).json({ ok: false, msg: 'Not authorized' })
    if (leave.status !== 'pending')
      return res.status(400).json({ ok: false, msg: 'Can only cancel pending leaves' })
    // Mark as cancelled instead of deleting so history is preserved
    leave.status = 'cancelled'
    leave.actionAt = new Date()
    await leave.save()
    res.json({ ok: true })
  } catch (err) { res.status(500).json({ ok: false, msg: err.message }) }
})

module.exports = router
