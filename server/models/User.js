const mongoose = require('mongoose')

const userSchema = new mongoose.Schema({
  employeeId:   { type: String, sparse: true },
  name:         { type: String, required: true, trim: true },
  email:        { type: String, required: true, unique: true, lowercase: true, trim: true },
  password:     { type: String, required: true, select: false },
  role:         { type: String, enum: ['admin', 'agent'], default: 'agent' },
  dept:         { type: String, default: 'Support' },
  defaultShift: { type: String, default: 'MC' },
  highlight:    { type: String, default: '' },
  isActive:     { type: Boolean, default: true },
  profilePhoto: { type: String, default: '' },
}, { timestamps: true })

<<<<<<< HEAD
module.exports = mongoose.model('User', userSchema)
=======
module.exports = mongoose.model('User', userSchema)
>>>>>>> 19554c3b5960310184e6a75bf65f3601e97e7674
