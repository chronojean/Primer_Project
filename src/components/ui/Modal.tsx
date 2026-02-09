import React, { useId } from 'react';
import { Button } from './Button';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
}

export const Modal = ({ isOpen, onClose, title, children }: ModalProps) => {
    if (!isOpen) return null;
    const titleId = useId();

    return (
        <div className="modal-backdrop">
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                className="modal-panel"
            >
                <div className="modal-header">
                    <h2 id={titleId} className="modal-title">{title}</h2>
                    <Button variant="secondary" size="sm" onClick={onClose} style={{ marginLeft: 'auto' }} aria-label="Close dialog">✕</Button>
                </div>
                <div>
                    {children}
                </div>
            </div>
        </div>
    );
};
