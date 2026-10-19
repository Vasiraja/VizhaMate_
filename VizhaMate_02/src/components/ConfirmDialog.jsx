import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, X } from 'lucide-react';

export default function ConfirmDialog({ title, message, confirmLabel = 'Confirm', danger = false, onConfirm, onClose }) {
    useEffect(() => {
        function closeOnEscape(event) {
            if (event.key === 'Escape') onClose();
        }
        document.addEventListener('keydown', closeOnEscape);
        return () => document.removeEventListener('keydown', closeOnEscape);
    }, [onClose]);

    return createPortal(
        <div className="dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
            <section className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
                <button className="icon-button dialog-close" aria-label="Close dialog" onClick={onClose}><X size={18} /></button>
                <div className={`dialog-icon ${danger ? 'danger' : ''}`}><AlertTriangle size={20} /></div>
                <h2 id="confirm-title">{title}</h2>
                <p>{message}</p>
                <div className="dialog-actions"><button className="button button-secondary" onClick={onClose}>Cancel</button><button className={`button ${danger ? 'button-danger' : 'button-primary'}`} onClick={onConfirm}>{confirmLabel}</button></div>
            </section>
        </div>,
        document.body,
    );
}