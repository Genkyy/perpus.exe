// eslint-disable-next-line jsx-a11y/no-inline-styles
import { createContext, useContext, useState, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';

// Types
type AlertType = 'success' | 'error' | 'warning' | 'info';
type AlertOptions = {
    title?: string;
    confirmText?: string;
    cancelText?: string;
    type?: AlertType;
};

interface AlertContextType {
    showAlert: (message: string, type?: AlertType) => Promise<void>;
    showConfirm: (message: string, options?: AlertOptions) => Promise<boolean>;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export const useAlert = () => {
    const context = useContext(AlertContext);
    if (!context) {
        throw new Error('useAlert must be used within an AlertProvider');
    }
    return context;
};

export const AlertProvider = ({ children }: { children: ReactNode }) => {
    const [alertState, setAlertState] = useState<{
        visible: boolean;
        message: string;
        type: AlertType;
        isConfirm: boolean;
        options?: AlertOptions;
        resolve?: (value: any) => void;
    }>({
        visible: false,
        message: '',
        type: 'info',
        isConfirm: false
    });

    const showAlert = (message: string, type: AlertType = 'info') => {
        return new Promise<void>((resolve) => {
            setAlertState({
                visible: true,
                message,
                type,
                isConfirm: false,
                resolve
            });
        });
    };

    const showConfirm = (message: string, options: AlertOptions = {}) => {
        return new Promise<boolean>((resolve) => {
            setAlertState({
                visible: true,
                message,
                type: options.type || 'warning',
                isConfirm: true,
                options,
                resolve
            });
        });
    };

    const handleClose = (result: boolean) => {
        setAlertState(prev => ({ ...prev, visible: false }));
        if (alertState.resolve) {
            alertState.resolve(result);
        }
    };

    const getColors = (type: AlertType) => {
        switch (type) {
            case 'success': return { bg: '#dcfce7', text: '#166534', accent: '#22c55e', button: '#16a34a' };
            case 'error': return { bg: '#fee2e2', text: '#991b1b', accent: '#ef4444', button: '#dc2626' };
            case 'warning': return { bg: '#ffedd5', text: '#9a3412', accent: '#f97316', button: '#ea580c' };
            default: return { bg: '#dbeafe', text: '#1e40af', accent: '#3b82f6', button: '#2563eb' };
        }
    };

    const colors = getColors(alertState.type);

    return (
        <AlertContext.Provider value={{ showAlert, showConfirm }}>
            {children}
            {createPortal(
                <AnimatePresence>
                    {alertState.visible && (
                        <div style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            zIndex: 9999,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '16px'
                        }}>
                            {/* Backdrop */}
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    bottom: 0,
                                    background: 'rgba(0,0,0,0.5)',
                                    backdropFilter: 'blur(4px)',
                                    zIndex: -1
                                }}
                                onClick={() => !alertState.isConfirm && handleClose(true)}
                            />

                            {/* Modal Card */}
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                                style={{
                                    position: 'relative',
                                    width: '100%',
                                    maxWidth: '420px',
                                    backgroundColor: 'white',
                                    borderRadius: '16px',
                                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                                    overflow: 'hidden',
                                    display: 'flex',
                                    flexDirection: 'column'
                                }}
                            >
                                {/* Top Color Bar */}
                                <div style={{ height: '8px', width: '100%', backgroundColor: colors.accent }}></div>

                                <div style={{ padding: '24px' }}>
                                    <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
                                        <div style={{
                                            padding: '12px',
                                            borderRadius: '12px',
                                            backgroundColor: colors.bg,
                                            color: colors.text,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}>
                                            <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>
                                                {alertState.type === 'success' ? 'check_circle' :
                                                    alertState.type === 'error' ? 'error' :
                                                        alertState.type === 'warning' ? 'warning' :
                                                            'info'}
                                            </span>
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#111827', margin: '0 0 4px 0' }}>
                                                {alertState.options?.title || (
                                                    alertState.type === 'success' ? 'Berhasil' :
                                                        alertState.type === 'error' ? 'Terjadi Kesalahan' :
                                                            alertState.type === 'warning' ? 'Konfirmasi' :
                                                                'Informasi'
                                                )}
                                            </h3>
                                            <p style={{ fontSize: '0.875rem', color: '#4b5563', lineHeight: '1.5', margin: 0 }}>
                                                {alertState.message}
                                            </p>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                                        {alertState.isConfirm && (
                                            <button
                                                onClick={() => handleClose(false)}
                                                style={{
                                                    padding: '10px 16px',
                                                    borderRadius: '8px',
                                                    border: '1px solid #e5e7eb',
                                                    backgroundColor: 'white',
                                                    color: '#374151',
                                                    fontSize: '0.875rem',
                                                    fontWeight: 600,
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                {alertState.options?.cancelText || 'Batal'}
                                            </button>
                                        )}
                                        <button
                                            onClick={() => handleClose(true)}
                                            style={{
                                                padding: '10px 24px',
                                                borderRadius: '8px',
                                                border: 'none',
                                                backgroundColor: colors.button,
                                                color: 'white',
                                                fontSize: '0.875rem',
                                                fontWeight: 700,
                                                cursor: 'pointer',
                                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                            }}
                                        >
                                            {alertState.options?.confirmText || 'OK'}
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </AlertContext.Provider>
    );
};
