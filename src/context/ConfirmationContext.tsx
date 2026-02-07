import React, { createContext, useContext, useState, useCallback } from 'react';
import { Modal } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';

interface ConfirmationOptions {
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
}

interface ConfirmationContextType {
    showConfirmation: (options: ConfirmationOptions) => Promise<boolean>;
}

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
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '1rem', lineHeight: '1.5' }}>
                            {modalState.message}
                        </p>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
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
