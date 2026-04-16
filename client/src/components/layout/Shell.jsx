// client/src/components/layout/Shell.jsx
import React, { useState } from 'react'
import { logout as storeLogout } from '../../data/store'

const ADMIN_NAV = [
  { id:'dashboard',      icon:'▦',  label:'Dashboard'       },
  { id:'schedule',       icon:'📅', label:'Schedule'        },
  { id:'coverage',       icon:'📊', label:'Coverage'        },
  { id:'shift-requests', icon:'🔄', label:'Shift Requests'  },
  { id:'leaves',         icon:'🌿', label:'Leaves'          },
  { id:'employees',      icon:'👥', label:'Employees'       },
  { id:'monthly-report', icon:'📈', label:'Monthly Report'  },
  { id:'settings',       icon:'⚙',  label:'Settings'        },
  { id:'profile',        icon:'👤', label:'Profile'         },
]
const AGENT_NAV = [
  { id:'my-schedule',   icon:'📅', label:'My Schedule'   },
  { id:'shift-request', icon:'🔄', label:'Request Shift' },
  { id:'apply-leave',   icon:'🌿', label:'Apply Leave'   },
  { id:'my-leaves',     icon:'📋', label:'My Leaves'     },
  { id:'profile',       icon:'👤', label:'Profile'       },
]

function ini(n=''){return n.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()}

export function Shell({ user, page, onNav, pendingLeaves, pendingRequests, children }) {
  const [open, setOpen] = useState(true)
  const nav = user.role==='admin' ? ADMIN_NAV : AGENT_NAV
  const handleLogout = () => { storeLogout(); window.location.reload() }

  return (
    <div className={`shell ${open?'shell-open':'shell-closed'}`}>
      <aside className="sidebar">
        <div className="sb-header">
          <span className="sb-logo-icon">⏱</span>
          {open&&<span className="sb-logo-text">ShiftApp<sup style={{color:'var(--accent)',fontSize:10}}>Pro</sup></span>}
          <button className="sb-toggle" onClick={()=>setOpen(o=>!o)}>{open?'◀':'▶'}</button>
        </div>
        <nav className="sb-nav">
          {nav.map(n=>{
            const badge = n.id==='leaves'?pendingLeaves : n.id==='shift-requests'?pendingRequests : 0
            return (
              <button key={n.id} className={`sb-item ${page===n.id?'active':''}`}
                onClick={()=>onNav(n.id)} title={n.label}>
                <span className="sb-icon">{n.icon}</span>
                {open&&<span className="sb-label">{n.label}</span>}
                {open&&badge>0&&<span className="sb-badge">{badge}</span>}
              </button>
            )
          })}
        </nav>
        <div className="sb-footer">
          <div className="sb-user">
            {user.profilePhoto
              ? <img src={user.profilePhoto} alt={user.name} style={{width:32,height:32,borderRadius:'50%',objectFit:'cover',flexShrink:0,border:'2px solid var(--border)'}}/>
              : <div className={`av ${user.highlight==='orange'?'av-orange':user.role==='admin'?'av-blue':'av-gray'}`} style={{width:32,height:32,fontSize:12,flexShrink:0}}>{ini(user.name)}</div>
            }
            {open&&<div style={{overflow:'hidden'}}>
              <div className="sb-uname">{user.name}</div>
              <div className={`sb-urole ${user.role==='admin'?'role-admin':'role-agent'}`}>{user.role}</div>
            </div>}
          </div>
          <button className="sb-logout" onClick={handleLogout} title="Logout">
            {open?'⏻ Logout':'⏻'}
          </button>
        </div>
      </aside>
      <main className="main-area">{children}</main>
    </div>
  )
}