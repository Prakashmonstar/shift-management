// server/models/ShiftRequest.js
const mongoose = require('mongoose')

const shiftRequestSchema = new mongoose.Schema({
  userId:         { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  weekKey:        { type: String, required: true },
  dateStr:        { type: String, required: true },
  currentShift:   { type: String, required: true },
  requestedShift: { type: String, required: true },
  reason:         { type: String, required: true },
  status:         { type: String, enum: ['pending','approved','rejected'], default: 'pending' },
  adminNote:      { type: String, default: '' },
  submittedAt:    { type: Date, default: Date.now },
  actionAt:       { type: Date },
}, { timestamps: true })

module.exports = mongoose.model('ShiftRequest', shiftRequestSchema)
