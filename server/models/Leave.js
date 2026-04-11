// server/models/Leave.js
const mongoose = require('mongoose')

const leaveSchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  leaveType: { type: String, default: 'Casual' },
  from:      { type: String, required: true },   // "YYYY-MM-DD"
  to:        { type: String, required: true },
  reason:    { type: String, required: true },
  status:    { type: String, enum: ['pending','approved','rejected'], default: 'pending' },
  remark:    { type: String, default: '' },
  appliedAt: { type: Date, default: Date.now },
  actionAt:  { type: Date },
}, { timestamps: true })

module.exports = mongoose.model('Leave', leaveSchema)
