import React, { useId } from 'react';
import { Button } from './Button';
import styles from './Modal.module.css';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    panelClassName?: string;
}

export const Modal = ({ isOpen, onClose, title, children, panelClassName }: ModalProps) => {
    if (!isOpen) return null;
    const titleId = useId();

    return (
        <div className="modal-backdrop">
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                className={`modal-panel${panelClassName ? ` ${panelClassName}` : ''}`}
            >
                <div className="modal-header">
                    <h2 id={titleId} className="modal-title">{title}</h2>
                    <Button variant="secondary" size="sm" onClick={onClose} className={styles.closeButton} aria-label="Close dialog">✕</Button>
                </div>
                <div>
                    {children}
                </div>
            </div>
        </div>
    );
};
