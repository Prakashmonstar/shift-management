// server/index.js
require('dotenv').config()
const express  = require('express')
const mongoose = require('mongoose')
const cors     = require('cors')
const path     = require('path')
const bcrypt   = require('bcryptjs')

const app = express()

// ── Middleware ────────────────────────────────────────────────
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000', 'http://localhost:4173'],
  credentials: true,
}))
app.use(express.json({ limit: '10mb' }))

// ── Routes ────────────────────────────────────────────────────
app.use('/api/auth',           require('./routes/auth'))
app.use('/api/users',          require('./routes/users'))
app.use('/api/schedules',      require('./routes/schedules'))
app.use('/api/leaves',         require('./routes/leaves'))
app.use('/api/shift-requests', require('./routes/shiftRequests'))

// ── Health check ──────────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({ ok: true, time: new Date(), msg: 'ShiftApp Pro API running' }))

// ── Serve React build in production ──────────────────────────
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/dist')))
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'))
  })
}

// ── AUTO SEED (runs every startup, skips if data exists) ─────
const SEED_USERS = [
  { employeeId:'1001', name:'Admin',          email:'admin@shift.com',       password:'admin123', role:'admin',  dept:'Management', defaultShift:'MC',  highlight:'' },
  { employeeId:'1002', name:'Jothika',         email:'jothika@shift.com',     password:'pass123',  role:'agent',  dept:'Support',    defaultShift:'S4',  highlight:'' },
  { employeeId:'1003', name:'Lingajothi',      email:'lingajothi@shift.com',  password:'pass123',  role:'agent',  dept:'Support',    defaultShift:'S4',  highlight:'' },
  { employeeId:'1004', name:'Nisha',           email:'nisha@shift.com',       password:'pass123',  role:'agent',  dept:'Support',    defaultShift:'AC',  highlight:'' },
  { employeeId:'1005', name:'Narmadha',        email:'narmadha@shift.com',    password:'pass123',  role:'agent',  dept:'Support',    defaultShift:'AC',  highlight:'' },
  { employeeId:'1006', name:'Kaviya',          email:'kaviya@shift.com',      password:'pass123',  role:'agent',  dept:'Support',    defaultShift:'AC',  highlight:'' },
  { employeeId:'1007', name:'Latha',           email:'latha@shift.com',       password:'pass123',  role:'agent',  dept:'Support',    defaultShift:'S6',  highlight:'' },
  { employeeId:'1008', name:'Tharjath Begum',  email:'tharjath@shift.com',    password:'pass123',  role:'agent',  dept:'Support',    defaultShift:'MC',  highlight:'' },
  { employeeId:'1009', name:'Kalaiyarasi',     email:'kalaiyarasi@shift.com', password:'pass123',  role:'agent',  dept:'Support',    defaultShift:'MC',  highlight:'orange' },
  { employeeId:'1010', name:'Preethi',         email:'preethi@shift.com',     password:'pass123',  role:'agent',  dept:'Support',    defaultShift:'AC',  highlight:'orange' },
  { employeeId:'1011', name:'Gayathri',        email:'gayathri@shift.com',    password:'pass123',  role:'agent',  dept:'Support',    defaultShift:'AC',  highlight:'orange' },
  { employeeId:'1012', name:'Jaya Sri',        email:'jayasri@shift.com',     password:'pass123',  role:'agent',  dept:'Support',    defaultShift:'MC',  highlight:'orange' },
  { employeeId:'1013', name:'Kavitha',         email:'kavitha@shift.com',     password:'pass123',  role:'agent',  dept:'Support',    defaultShift:'MC',  highlight:'' },
  { employeeId:'1014', name:'Vichithra',       email:'vichithra@shift.com',   password:'pass123',  role:'agent',  dept:'Support',    defaultShift:'MC',  highlight:'' },
  { employeeId:'1015', name:'Sivasri',         email:'sivasri@shift.com',     password:'pass123',  role:'agent',  dept:'Support',    defaultShift:'S4',  highlight:'' },
  { employeeId:'1016', name:'Praveen',         email:'praveen@shift.com',     password:'pass123',  role:'agent',  dept:'Support',    defaultShift:'S6',  highlight:'' },
  { employeeId:'1017', name:'Hariharan',       email:'hariharan@shift.com',   password:'pass123',  role:'agent',  dept:'Support',    defaultShift:'S5',  highlight:'' },
  { employeeId:'1018', name:'Prakash',         email:'prakash@shift.com',     password:'pass123',  role:'agent',  dept:'Support',    defaultShift:'EC',  highlight:'' },
  { employeeId:'1019', name:'Santhosh',        email:'santhosh@shift.com',    password:'pass123',  role:'agent',  dept:'Support',    defaultShift:'EC',  highlight:'' },
  { employeeId:'1020', name:'Selvi Sri',       email:'selvisri@shift.com',    password:'pass123',  role:'agent',  dept:'Support',    defaultShift:'AC',  highlight:'' },
  { employeeId:'1021', name:'Oviya',           email:'oviya@shift.com',       password:'pass123',  role:'agent',  dept:'Support',    defaultShift:'MC',  highlight:'' },
  { employeeId:'1022', name:'Swathi',          email:'swathi@shift.com',      password:'pass123',  role:'agent',  dept:'Support',    defaultShift:'AC',  highlight:'' },
  { employeeId:'1023', name:'Aadhilakshmi',    email:'aadhilakshmi@shift.com',password:'pass123',  role:'agent',  dept:'Support',    defaultShift:'MC',  highlight:'' },
  { employeeId:'1024', name:'Afrina',          email:'afrina@shift.com',      password:'pass123',  role:'agent',  dept:'Support',    defaultShift:'MC',  highlight:'' },
  { employeeId:'1025', name:'Bhavani',         email:'bhavani@shift.com',     password:'pass123',  role:'agent',  dept:'Support',    defaultShift:'AC',  highlight:'' },
  { employeeId:'1026', name:'Ragul',           email:'ragul@shift.com',       password:'pass123',  role:'agent',  dept:'Support',    defaultShift:'EC',  highlight:'' },
  { employeeId:'1027', name:'Yathu Madhav',    email:'yathu@shift.com',       password:'pass123',  role:'agent',  dept:'Support',    defaultShift:'EC',  highlight:'' },
  { employeeId:'1028', name:'Sangeetha',       email:'sangeetha@shift.com',   password:'pass123',  role:'agent',  dept:'Support',    defaultShift:'AC',  highlight:'' },
  { employeeId:'1029', name:'Jeeva',           email:'jeeva@shift.com',       password:'pass123',  role:'agent',  dept:'Support',    defaultShift:'MC',  highlight:'' },
  { employeeId:'1030', name:'Ramcharan',       email:'ramcharan@shift.com',   password:'pass123',  role:'agent',  dept:'Support',    defaultShift:'EC',  highlight:'' },
  { employeeId:'1031', name:'Jawhar',          email:'jawhar@shift.com',      password:'pass123',  role:'agent',  dept:'Support',    defaultShift:'EC',  highlight:'' },
  { employeeId:'1032', name:'Suman',           email:'suman@shift.com',       password:'pass123',  role:'agent',  dept:'Support',    defaultShift:'S75', highlight:'' },
]

async function autoSeed() {
  try {
    const User = require('./models/User')
    const count = await User.countDocuments()
    if (count > 0) {
      console.log(`✅ Database ready — ${count} users loaded`)
      return
    }
    console.log('🌱 First run — seeding default users...')
    for (const u of SEED_USERS) {
      const salt = await bcrypt.genSalt(10)
      const hashed = await bcrypt.hash(u.password, salt)
      await User.create({ ...u, password: hashed })
      process.stdout.write('.')
    }
    console.log(`\n✅ Seeded ${SEED_USERS.length} users automatically!`)
    console.log('   Admin : admin@shift.com / admin123')
    console.log('   Agents: (name)@shift.com / pass123')
  } catch (err) {
    console.error('❌ Auto-seed error:', err.message)
  }
}

// ── MongoDB connection + start ────────────────────────────────
const PORT = process.env.PORT || 5000

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('✅ MongoDB connected:', process.env.MONGO_URI)
    await autoSeed()  // ← Seeds automatically on first run
    app.listen(PORT, () => {
      console.log(`\n🚀 ShiftApp Pro running on http://localhost:${PORT}`)
      console.log(`📋 Open frontend:  http://localhost:5173`)
      console.log(`🔑 Admin login:    admin@shift.com / admin123\n`)
    })
  })
  .catch(err => {
    console.error('❌ MongoDB connection failed:', err.message)
    console.error('\n💡 Fix: Make sure MongoDB is running!')
    console.error('   Windows: net start MongoDB')
    console.error('   Mac/Linux: mongod\n')
    process.exit(1)
  })
