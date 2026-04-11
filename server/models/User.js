// server/models/User.js
const mongoose = require('mongoose')

const userSchema = new mongoose.Schema({
  employeeId:   { type: String, sparse: true },
  name:         { type: String, required: true, trim: true },
  email:        { type: String, required: true, unique: true, lowercase: true, trim: true },
  password:     { type: String, required: true, select: false }, // hidden by default
  role:         { type: String, enum: ['admin', 'agent'], default: 'agent' },
  dept:         { type: String, default: 'Support' },
  defaultShift: { type: String, default: 'MC' },
  highlight:    { type: String, default: '' },
  isActive:     { type: Boolean, default: true },
}, { timestamps: true })

// NOTE: No pre-save hook — password is hashed manually in routes
// This prevents accidental double-hashing

module.exports = mongoose.model('User', userSchema)
