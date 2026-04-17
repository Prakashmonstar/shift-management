// server/resetDB.js
// ─────────────────────────────────────────────────────────────
// Run this to wipe ALL data and re-seed fresh demo credentials
//   docker exec -it <backend-container-name> node resetDB.js
//   OR locally: cd server && node resetDB.js
// ─────────────────────────────────────────────────────────────
require('dotenv').config()
const mongoose = require('mongoose')
const bcrypt   = require('bcryptjs')
const User     = require('./models/User')

const SEED_USERS = [
  { employeeId:'1001', name:'Admin',         email:'admin@shift.com',        password:'admin123', role:'admin',  dept:'Management', defaultShift:'MC',  highlight:'' },
  { employeeId:'1002', name:'Jothika',        email:'jothika@shift.com',      password:'pass123',  role:'agent',  dept:'Support',    defaultShift:'S4',  highlight:'' },
  { employeeId:'1003', name:'Lingajothi',     email:'lingajothi@shift.com',   password:'pass123',  role:'agent',  dept:'Support',    defaultShift:'S4',  highlight:'' },
  { employeeId:'1004', name:'Nisha',          email:'nisha@shift.com',        password:'pass123',  role:'agent',  dept:'Support',    defaultShift:'AC',  highlight:'' },
  { employeeId:'1005', name:'Narmadha',       email:'narmadha@shift.com',     password:'pass123',  role:'agent',  dept:'Support',    defaultShift:'AC',  highlight:'' },
  { employeeId:'1006', name:'Kaviya',         email:'kaviya@shift.com',       password:'pass123',  role:'agent',  dept:'Support',    defaultShift:'AC',  highlight:'' },
  { employeeId:'1007', name:'Latha',          email:'latha@shift.com',        password:'pass123',  role:'agent',  dept:'Support',    defaultShift:'S6',  highlight:'' },
  { employeeId:'1008', name:'Tharjath Begum', email:'tharjath@shift.com',     password:'pass123',  role:'agent',  dept:'Support',    defaultShift:'MC',  highlight:'' },
  { employeeId:'1009', name:'Kalaiyarasi',    email:'kalaiyarasi@shift.com',  password:'pass123',  role:'agent',  dept:'Support',    defaultShift:'MC',  highlight:'orange' },
  { employeeId:'1010', name:'Preethi',        email:'preethi@shift.com',      password:'pass123',  role:'agent',  dept:'Support',    defaultShift:'AC',  highlight:'orange' },
  { employeeId:'1011', name:'Gayathri',       email:'gayathri@shift.com',     password:'pass123',  role:'agent',  dept:'Support',    defaultShift:'AC',  highlight:'orange' },
  { employeeId:'1012', name:'Jaya Sri',       email:'jayasri@shift.com',      password:'pass123',  role:'agent',  dept:'Support',    defaultShift:'MC',  highlight:'orange' },
  { employeeId:'1013', name:'Kavitha',        email:'kavitha@shift.com',      password:'pass123',  role:'agent',  dept:'Support',    defaultShift:'MC',  highlight:'' },
  { employeeId:'1014', name:'Vichithra',      email:'vichithra@shift.com',    password:'pass123',  role:'agent',  dept:'Support',    defaultShift:'MC',  highlight:'' },
  { employeeId:'1015', name:'Sivasri',        email:'sivasri@shift.com',      password:'pass123',  role:'agent',  dept:'Support',    defaultShift:'S4',  highlight:'' },
  { employeeId:'1016', name:'Praveen',        email:'praveen@shift.com',      password:'pass123',  role:'agent',  dept:'Support',    defaultShift:'S6',  highlight:'' },
  { employeeId:'1017', name:'Hariharan',      email:'hariharan@shift.com',    password:'pass123',  role:'agent',  dept:'Support',    defaultShift:'S5',  highlight:'' },
  { employeeId:'1018', name:'Prakash',        email:'prakash@shift.com',      password:'pass123',  role:'agent',  dept:'Support',    defaultShift:'EC',  highlight:'' },
  { employeeId:'1019', name:'Santhosh',       email:'santhosh@shift.com',     password:'pass123',  role:'agent',  dept:'Support',    defaultShift:'EC',  highlight:'' },
  { employeeId:'1020', name:'Selvi Sri',      email:'selvisri@shift.com',     password:'pass123',  role:'agent',  dept:'Support',    defaultShift:'AC',  highlight:'' },
  { employeeId:'1021', name:'Oviya',          email:'oviya@shift.com',        password:'pass123',  role:'agent',  dept:'Support',    defaultShift:'MC',  highlight:'' },
  { employeeId:'1022', name:'Swathi',         email:'swathi@shift.com',       password:'pass123',  role:'agent',  dept:'Support',    defaultShift:'AC',  highlight:'' },
  { employeeId:'1023', name:'Aadhilakshmi',   email:'aadhilakshmi@shift.com', password:'pass123',  role:'agent',  dept:'Support',    defaultShift:'MC',  highlight:'' },
  { employeeId:'1024', name:'Afrina',         email:'afrina@shift.com',       password:'pass123',  role:'agent',  dept:'Support',    defaultShift:'MC',  highlight:'' },
  { employeeId:'1025', name:'Bhavani',        email:'bhavani@shift.com',      password:'pass123',  role:'agent',  dept:'Support',    defaultShift:'AC',  highlight:'' },
  { employeeId:'1026', name:'Ragul',          email:'ragul@shift.com',        password:'pass123',  role:'agent',  dept:'Support',    defaultShift:'EC',  highlight:'' },
  { employeeId:'1027', name:'Yathu Madhav',   email:'yathu@shift.com',        password:'pass123',  role:'agent',  dept:'Support',    defaultShift:'EC',  highlight:'' },
  { employeeId:'1028', name:'Sangeetha',      email:'sangeetha@shift.com',    password:'pass123',  role:'agent',  dept:'Support',    defaultShift:'AC',  highlight:'' },
  { employeeId:'1029', name:'Jeeva',          email:'jeeva@shift.com',        password:'pass123',  role:'agent',  dept:'Support',    defaultShift:'MC',  highlight:'' },
  { employeeId:'1030', name:'Ramcharan',      email:'ramcharan@shift.com',    password:'pass123',  role:'agent',  dept:'Support',    defaultShift:'EC',  highlight:'' },
  { employeeId:'1031', name:'Jawhar',         email:'jawhar@shift.com',       password:'pass123',  role:'agent',  dept:'Support',    defaultShift:'EC',  highlight:'' },
  { employeeId:'1032', name:'Suman',          email:'suman@shift.com',        password:'pass123',  role:'agent',  dept:'Support',    defaultShift:'S75', highlight:'' },
]

async function resetAndSeed() {
  try {
    if (!process.env.MONGO_URI) { console.error('❌ MONGO_URI not set'); process.exit(1) }

    await mongoose.connect(process.env.MONGO_URI)
    console.log('✅ MongoDB connected')

    // ── Wipe ALL collections ──
    const db = mongoose.connection.db
    const collections = await db.listCollections().toArray()
    for (const col of collections) {
      await db.collection(col.name).deleteMany({})
      console.log(`🗑  Cleared: ${col.name}`)
    }
    console.log('✅ All data cleared\n')

    // ── Re-seed users ──
    console.log('🌱 Seeding users...')
    for (const u of SEED_USERS) {
      const salt   = await bcrypt.genSalt(10)
      const hashed = await bcrypt.hash(u.password, salt)
      await User.create({ ...u, password: hashed, profilePhoto: '', isActive: true })
      process.stdout.write('.')
    }

    console.log(`\n\n✅ Seeded ${SEED_USERS.length} users\n`)
    console.log('═══════════════════════════════════')
    console.log('  DEMO CREDENTIALS')
    console.log('═══════════════════════════════════')
    console.log('  Admin : admin@shift.com / admin123')
    console.log('  Agents: (name)@shift.com / pass123')
    console.log('  e.g.  : jothika@shift.com / pass123')
    console.log('═══════════════════════════════════\n')

    await mongoose.disconnect()
    console.log('✅ Done — DB is fresh!')
    process.exit(0)
  } catch (err) {
    console.error('❌ Error:', err.message)
    process.exit(1)
  }
}

resetAndSeed()
