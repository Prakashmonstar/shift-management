// server/models/Schedule.js
const mongoose = require('mongoose')

// Each document = one week's schedule for all agents
const scheduleSchema = new mongoose.Schema({
  weekKey: { type: String, required: true, unique: true }, // e.g. "2025-07-07"
  status:  { type: String, enum: ['draft','pending','approved','rejected'], default: 'draft' },
  // shifts: { userId: { "2025-07-07": "MC", "2025-07-08": "S4", ... } }
  shifts:  { type: Map, of: Map },
}, { timestamps: true })

module.exports = mongoose.model('Schedule', scheduleSchema)
