import { useState, useEffect } from 'react';

export default function Toast({ messages, onDismiss }) {
  return (
    <div style={{
      position: 'fixed',
      top: 16,
      right: 16,
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      maxWidth: 400,
    }}>
      {messages.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onDismiss }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onDismiss(toast.id), 300);
    }, 5000);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  const isError = toast.type === 'error';

  return (
    <div style={{
      padding: '10px 14px',
      background: isError
        ? 'linear-gradient(135deg, rgba(239,68,68,0.15), rgba(30,20,20,0.95))'
        : 'linear-gradient(135deg, rgba(0,210,255,0.1), rgba(22,28,40,0.95))',
      border: `1px solid ${isError ? 'rgba(239,68,68,0.3)' : 'rgba(0,210,255,0.2)'}`,
      borderRadius: 'var(--radius-md)',
      backdropFilter: 'blur(16px)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      color: isError ? '#fca5a5' : 'var(--text-primary)',
      fontSize: 12,
      lineHeight: 1.5,
      display: 'flex',
      alignItems: 'flex-start',
      gap: 8,
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateX(0)' : 'translateX(20px)',
      transition: 'all 0.3s ease',
      cursor: 'pointer',
    }} onClick={() => onDismiss(toast.id)}>
      <span style={{ flexShrink: 0 }}>{isError ? '⚠️' : 'ℹ️'}</span>
      <span style={{ wordBreak: 'break-word' }}>{toast.message}</span>
    </div>
  );
}
