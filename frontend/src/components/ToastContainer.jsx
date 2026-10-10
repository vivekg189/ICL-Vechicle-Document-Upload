import React, { useState, useCallback, useEffect, useRef } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

/* ─────────────────────────────────────────
   Singleton toast bus — lets any component
   call toast() without prop-drilling
   ───────────────────────────────────────── */
let _emit = null;

export function toast(message, type = 'info', duration = 4000) {
  if (_emit) _emit(message, type, duration);
}

const ICONS = {
  success: { Icon: CheckCircle2, color: '#059669', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.3)' },
  warning: { Icon: AlertTriangle, color: '#d97706', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.3)' },
  error:   { Icon: XCircle,      color: '#dc2626', bg: 'rgba(239,68,68,0.1)',  border: 'rgba(239,68,68,0.3)' },
  info:    { Icon: Info,         color: '#2563eb', bg: 'rgba(37,99,235,0.1)',  border: 'rgba(37,99,235,0.2)' },
};

let uid = 0;

export default function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    _emit = (message, type, duration) => {
      const id = ++uid;
      setToasts((prev) => [...prev, { id, message, type, duration }]);
    };
    return () => { _emit = null; };
  }, []);

  const remove = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <div style={{
      position: 'fixed', bottom: '1.5rem', right: '1.5rem',
      display: 'flex', flexDirection: 'column', gap: '0.6rem',
      zIndex: 9999, pointerEvents: 'none',
    }}>
      {toasts.map((t) => (
        <Toast key={t.id} {...t} onDismiss={remove} />
      ))}
    </div>
  );
}

function Toast({ id, message, type, duration, onDismiss }) {
  const config = ICONS[type] || ICONS.info;
  const { Icon, color, bg, border } = config;
  const timerRef = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Slide in
    const show = setTimeout(() => setVisible(true), 10);
    // Auto-dismiss
    timerRef.current = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onDismiss(id), 300);
    }, duration);
    return () => { clearTimeout(show); clearTimeout(timerRef.current); };
  }, []);

  return (
    <div
      onClick={() => { setVisible(false); setTimeout(() => onDismiss(id), 300); }}
      style={{
        display: 'flex', alignItems: 'center', gap: '0.75rem',
        padding: '0.875rem 1.1rem',
        background: 'rgba(255,255,255,0.97)',
        border: `1px solid ${border}`,
        borderRadius: '14px',
        boxShadow: '0 8px 32px rgba(15,23,42,0.12), 0 2px 8px rgba(15,23,42,0.08)',
        minWidth: '280px', maxWidth: '400px',
        cursor: 'pointer',
        pointerEvents: 'all',
        backdropFilter: 'blur(12px)',
        transform: visible ? 'translateX(0)' : 'translateX(120%)',
        opacity: visible ? 1 : 0,
        transition: 'transform 0.3s cubic-bezier(0.34,1.56,0.64,1), opacity 0.3s ease',
      }}
    >
      <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: bg, color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={17} />
      </div>
      <span style={{ flex: 1, fontSize: '0.875rem', fontWeight: 600, color: '#0f172a', lineHeight: 1.4 }}>{message}</span>
      <X size={14} color="#94a3b8" />
    </div>
  );
}
