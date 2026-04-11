// server/routes/auth.js
const router  = require('express').Router()
const bcrypt  = require('bcryptjs')
const User    = require('../models/User')
const { protect, adminOnly, signToken } = require('../middleware/auth')

// ── POST /api/auth/login ──────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password)
      return res.status(400).json({ ok: false, msg: 'Email and password required' })

    // Find user with password field (it's select:false by default)
    const user = await User.findOne({
      email: email.toLowerCase().trim(),
      isActive: { $ne: false }
    }).select('+password')

    if (!user)
      return res.status(401).json({ ok: false, msg: 'Email not found. Please check your email or contact admin.' })

    // Compare password (bcrypt)
    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch)
      return res.status(401).json({ ok: false, msg: 'Incorrect password. Please try again.' })

    const token = signToken(user._id)

    // Return user without password
    const userObj = user.toObject()
    delete userObj.password

    res.json({ ok: true, token, user: { ...userObj, id: userObj._id.toString() } })
  } catch (err) {
    console.error('Login error:', err)
    res.status(500).json({ ok: false, msg: 'Server error: ' + err.message })
  }
})

// ── POST /api/auth/create-account (Public - for new user registration) ──
// Anyone can create an AGENT account. Admin accounts need admin approval.
router.post('/create-account', async (req, res) => {
  try {
    const { name, email, password, dept, defaultShift } = req.body

    if (!name || !name.trim())
      return res.status(400).json({ ok: false, msg: 'Full name is required' })
    if (!email || !email.trim())
      return res.status(400).json({ ok: false, msg: 'Email is required' })
    if (!password || password.length < 6)
      return res.status(400).json({ ok: false, msg: 'Password must be at least 6 characters' })

    // Check duplicate email
    const exists = await User.findOne({ email: email.toLowerCase().trim() })
    if (exists)
      return res.status(400).json({ ok: false, msg: 'An account with this email already exists. Please login.' })

    // Auto-assign employee ID
    const allUsers = await User.find({ employeeId: { $regex: /^\d+$/ } }).sort({ employeeId: -1 }).limit(1)
    const lastEmpId = allUsers.length > 0 ? parseInt(allUsers[0].employeeId) : 1032
    const newEmpId  = String(lastEmpId + 1)

    // Hash password
    const salt   = await bcrypt.genSalt(10)
    const hashed = await bcrypt.hash(password, salt)

    const user = await User.create({
      name:         name.trim(),
      email:        email.toLowerCase().trim(),
      password:     hashed,
      role:         'agent',   // Public registration always creates agent
      dept:         dept || 'Support',
      defaultShift: defaultShift || 'MC',
      highlight:    '',
      employeeId:   newEmpId,
      isActive:     true,
    })

    const token   = signToken(user._id)
    const userObj = user.toObject()
    delete userObj.password

    console.log(`✅ New account created: ${user.name} (${user.email}) — EmpID: ${newEmpId}`)

    res.status(201).json({
      ok:    true,
      token,
      user:  { ...userObj, id: userObj._id.toString() },
      msg:   `Account created! Welcome, ${user.name}!`
    })
  } catch (err) {
    console.error('Create account error:', err)
    res.status(500).json({ ok: false, msg: 'Server error: ' + err.message })
  }
})

// ── POST /api/auth/register (admin only — create any role) ────
router.post('/register', protect, adminOnly, async (req, res) => {
  try {
    const { name, email, password, role, dept, defaultShift, highlight, employeeId } = req.body

    if (!name || !email || !password)
      return res.status(400).json({ ok: false, msg: 'Name, email, password required' })

    const exists = await User.findOne({ email: email.toLowerCase().trim() })
    if (exists)
      return res.status(400).json({ ok: false, msg: 'Email already registered' })

    let empId = employeeId
    if (!empId) {
      const last = await User.find({ employeeId: { $regex: /^\d+$/ } }).sort({ employeeId: -1 }).limit(1)
      empId = last.length > 0 ? String(parseInt(last[0].employeeId) + 1) : '1001'
    }

    const salt   = await bcrypt.genSalt(10)
    const hashed = await bcrypt.hash(password, salt)

    const user = await User.create({
      name, email: email.toLowerCase().trim(),
      password: hashed,
      role: role || 'agent',
      dept: dept || 'Support',
      defaultShift: defaultShift || 'MC',
      highlight: highlight || '',
      employeeId: empId,
    })

    const userObj = user.toObject()
    delete userObj.password

    res.status(201).json({ ok: true, user: { ...userObj, id: userObj._id.toString() } })
  } catch (err) {
    res.status(500).json({ ok: false, msg: err.message })
  }
})

// ── GET /api/auth/me ──────────────────────────────────────────
router.get('/me', protect, async (req, res) => {
  const userObj = req.user.toObject()
  delete userObj.password
  res.json({ ok: true, user: { ...userObj, id: userObj._id.toString() } })
})

// ── PUT /api/auth/profile ─────────────────────────────────────
router.put('/profile', protect, async (req, res) => {
  try {
    const { name, email } = req.body
    const user = await User.findByIdAndUpdate(
      req.user._id, { name, email: email?.toLowerCase() },
      { new: true, runValidators: true }
    )
    const userObj = user.toObject()
    delete userObj.password
    res.json({ ok: true, user: { ...userObj, id: userObj._id.toString() } })
  } catch (err) {
    res.status(500).json({ ok: false, msg: err.message })
  }
})

// ── PUT /api/auth/change-password ─────────────────────────────
router.put('/change-password', protect, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body
    if (!oldPassword || !newPassword)
      return res.status(400).json({ ok: false, msg: 'Both passwords required' })
    if (newPassword.length < 6)
      return res.status(400).json({ ok: false, msg: 'New password min 6 characters' })

    const user = await User.findById(req.user._id).select('+password')
    const isMatch = await bcrypt.compare(oldPassword, user.password)
    if (!isMatch)
      return res.status(400).json({ ok: false, msg: 'Current password is incorrect' })

    const salt   = await bcrypt.genSalt(10)
    const hashed = await bcrypt.hash(newPassword, salt)
    await User.findByIdAndUpdate(req.user._id, { password: hashed })

    res.json({ ok: true, msg: 'Password changed successfully' })
  } catch (err) {
    res.status(500).json({ ok: false, msg: err.message })
  }
})

module.exports = router
