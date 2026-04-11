// server/routes/users.js
const router = require('express').Router()
const bcrypt = require('bcryptjs')
const User   = require('../models/User')
const { protect, adminOnly } = require('../middleware/auth')

router.use(protect)

// Helper: sanitize user for response (remove password)
function sanitize(user) {
  const obj = user.toObject ? user.toObject() : { ...user }
  delete obj.password
  return { ...obj, id: obj._id?.toString() }
}

// ── GET /api/users ────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    if (req.user.role === 'admin') {
      const users = await User.find({ isActive: { $ne: false } }).sort({ employeeId: 1 })
      return res.json({ ok: true, users: users.map(sanitize) })
    }
    res.json({ ok: true, users: [sanitize(req.user)] })
  } catch (err) {
    res.status(500).json({ ok: false, msg: err.message })
  }
})

// ── GET /api/users/agents ─────────────────────────────────────
router.get('/agents', async (req, res) => {
  try {
    const agents = await User.find({ role: 'agent', isActive: { $ne: false } }).sort({ employeeId: 1 })
    res.json({ ok: true, users: agents.map(sanitize) })
  } catch (err) {
    res.status(500).json({ ok: false, msg: err.message })
  }
})

// ── POST /api/users (admin creates user) ─────────────────────
router.post('/', adminOnly, async (req, res) => {
  try {
    const { name, email, password, role, dept, defaultShift, highlight, employeeId } = req.body

    if (!name || !email || !password)
      return res.status(400).json({ ok: false, msg: 'Name, email, password required' })

    const exists = await User.findOne({ email: email.toLowerCase().trim() })
    if (exists)
      return res.status(400).json({ ok: false, msg: 'Email already exists' })

    let empId = employeeId
    if (!empId) {
      const last = await User.find({ employeeId: { $regex: /^\d+$/ } }).sort({ employeeId: -1 }).limit(1)
      empId = last.length > 0 ? String(parseInt(last[0].employeeId) + 1) : '1033'
    }

    const salt   = await bcrypt.genSalt(10)
    const hashed = await bcrypt.hash(password, salt)

    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashed,
      role: role || 'agent',
      dept: dept || 'Support',
      defaultShift: defaultShift || 'MC',
      highlight: highlight || '',
      employeeId: empId,
    })

    res.status(201).json({ ok: true, user: sanitize(user) })
  } catch (err) {
    res.status(500).json({ ok: false, msg: err.message })
  }
})

// ── PUT /api/users/:id ────────────────────────────────────────
router.put('/:id', adminOnly, async (req, res) => {
  try {
    const { password, ...updates } = req.body

    // If password is being changed via this route, hash it
    if (password && password.length >= 6) {
      const salt = await bcrypt.genSalt(10)
      updates.password = await bcrypt.hash(password, salt)
    }

    const user = await User.findByIdAndUpdate(
      req.params.id, updates, { new: true, runValidators: true }
    )
    if (!user) return res.status(404).json({ ok: false, msg: 'User not found' })
    res.json({ ok: true, user: sanitize(user) })
  } catch (err) {
    res.status(500).json({ ok: false, msg: err.message })
  }
})

// ── DELETE /api/users/:id (soft delete) ──────────────────────
router.delete('/:id', adminOnly, async (req, res) => {
  try {
    if (req.params.id === req.user._id.toString())
      return res.status(400).json({ ok: false, msg: 'Cannot delete yourself' })

    const admins = await User.countDocuments({ role: 'admin', isActive: { $ne: false } })
    const target = await User.findById(req.params.id)
    if (target?.role === 'admin' && admins <= 1)
      return res.status(400).json({ ok: false, msg: 'Cannot remove the last admin' })

    await User.findByIdAndUpdate(req.params.id, { isActive: false })
    res.json({ ok: true, msg: 'User removed' })
  } catch (err) {
    res.status(500).json({ ok: false, msg: err.message })
  }
})

module.exports = router
