import React, { createContext, useContext, useState, useCallback } from 'react';
import { Modal } from '../components/Modal';
import { Button } from '../components/Button';
import styles from './useConfirmation.module.css';

interface ConfirmationOptions {
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
}

interface ConfirmationContextType {
    showConfirmation: (options: ConfirmationOptions) => Promise<boolean>;
}

// CRITICAL: All user prompts must use this global modal. Do not use window.confirm/alert anywhere else.
const ConfirmationContext = createContext<ConfirmationContextType | undefined>(undefined);

export const ConfirmationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [modalState, setModalState] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        confirmLabel: string;
        cancelLabel: string;
        resolve: (value: boolean) => void;
    } | null>(null);

    const showConfirmation = useCallback((options: ConfirmationOptions) => {
        return new Promise<boolean>((resolve) => {
            setModalState({
                isOpen: true,
                title: options.title,
                message: options.message,
                confirmLabel: options.confirmLabel || 'Confirm',
                cancelLabel: options.cancelLabel || 'Cancel',
                resolve,
            });
        });
    }, []);

    const handleConfirm = () => {
        if (modalState) {
            modalState.resolve(true);
            setModalState(null);
        }
    };

    const handleCancel = () => {
        if (modalState) {
            modalState.resolve(false);
            setModalState(null);
        }
    };

    return (
        <ConfirmationContext.Provider value={{ showConfirmation }}>
            {children}
            {modalState && (
                <Modal
                    isOpen={modalState.isOpen}
                    onClose={handleCancel}
                    title={modalState.title}
                >
                    <div className={styles.body}>
                        <p className={styles.message}>
                            {modalState.message}
                        </p>
                        <div className={styles.actions}>
                            <Button variant="secondary" onClick={handleCancel}>
                                {modalState.cancelLabel}
                            </Button>
                            <Button variant="primary" onClick={handleConfirm}>
                                {modalState.confirmLabel}
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}
        </ConfirmationContext.Provider>
    );
};

export const useConfirmation = () => {
    const context = useContext(ConfirmationContext);
    if (!context) {
        throw new Error('useConfirmation must be used within a ConfirmationProvider');
    }
    return context;
};
