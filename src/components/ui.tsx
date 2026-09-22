import type { ReactNode } from 'react';
import { useEffect } from 'react';
import type { Toast } from '../types';
import { IconCheck, IconInfo, IconX } from './icons';

export function StatusDot({ tier }: { tier: 'on' | 'paused' | 'off' }) {
  return <span className={`status-dot ${tier}`} aria-hidden="true" />;
}

export function Modal({
  title,
  onClose,
  children,
  width,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  width?: number;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={width ? { maxWidth: width } : undefined}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="modal-header">
          <h3>{title}</h3>
          <button className="icon-btn" onClick={onClose} title="Close">
            <IconX width={16} height={16} />
          </button>
        </header>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

export function Toasts({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  if (toasts.length === 0) return null;
  return (
    <div className="toasts">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.kind}`} role="status">
          <span className="toast-icon">
            {t.kind === 'success' ? (
              <IconCheck width={15} height={15} />
            ) : t.kind === 'error' ? (
              <IconX width={15} height={15} />
            ) : (
              <IconInfo width={15} height={15} />
            )}
          </span>
          <span className="toast-message">{t.message}</span>
          <button className="icon-btn toast-close" onClick={() => onDismiss(t.id)} title="Dismiss">
            <IconX width={12} height={12} />
          </button>
        </div>
      ))}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: ReactNode;
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <div className="empty-icon">{icon}</div>
      <h3>{title}</h3>
      <p>{body}</p>
      {action && <div className="empty-action">{action}</div>}
    </div>
  );
}