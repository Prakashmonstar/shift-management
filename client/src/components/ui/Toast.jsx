// client/src/components/ui/Toast.jsx
import React from 'react'
const COLORS = { success:'#16a34a', danger:'#dc2626', warning:'#d97706', info:'#2563eb' }
const ICONS  = { success:'✓', danger:'✕', warning:'!', info:'i' }

export function ToastContainer({ toasts }) {
  return (
    <div className="toast-wrap">
      {toasts.map(t=>(
        <div key={t.id} className="toast-item">
          <div className="toast-icon" style={{background:COLORS[t.type]||'#2563eb'}}>{ICONS[t.type]||'i'}</div>
          <span>{t.msg}</span>
        </div>
      ))}
    </div>
  )
}
