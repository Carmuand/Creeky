import type { ReactNode } from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  maxWidth?: number;
}

export function Modal({ open, onClose, title, children, maxWidth = 480 }: ModalProps) {
  if (!open) return null;
  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-container" style={{ maxWidth }}>
        {title ? (
          <header className="modal-header">
            <h2>{title}</h2>
            <button className="modal-close" aria-label="Cerrar" onClick={onClose}>×</button>
          </header>
        ) : (
          <button className="modal-close" aria-label="Cerrar" onClick={onClose} style={{ position: "absolute", right: 12, top: 12, zIndex: 1 }}>×</button>
        )}
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}
