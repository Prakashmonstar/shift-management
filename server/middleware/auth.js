// server/middleware/auth.js
const jwt  = require('jsonwebtoken')
const User = require('../models/User')

exports.protect = async (req, res, next) => {
  try {
    const header = req.headers.authorization
    if (!header || !header.startsWith('Bearer '))
      return res.status(401).json({ ok: false, msg: 'No token — please login' })

    const token   = header.split(' ')[1]
    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    const user = await User.findById(decoded.id)
    if (!user || user.isActive === false)
      return res.status(401).json({ ok: false, msg: 'User not found or deactivated' })

    req.user = user
    next()
  } catch (err) {
    return res.status(401).json({ ok: false, msg: 'Invalid or expired token — please login again' })
  }
}

exports.adminOnly = (req, res, next) => {
  if (req.user?.role !== 'admin')
    return res.status(403).json({ ok: false, msg: 'Admin access required' })
  next()
}

exports.signToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '7d' })
}
