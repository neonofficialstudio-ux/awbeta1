
import React, { useEffect, useState } from 'react';
import { useAppContext } from '../constants';
import type { Toast } from '../types';
import { CheckIcon, CoinIcon, StarIcon } from '../constants';

const InfoIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const ErrorIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const ToastItem: React.FC<{ toast: Toast; onRemove: (id: string) => void }> = ({ toast, onRemove }) => {
    const [isExiting, setIsExiting] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            handleClose();
        }, toast.duration || 4000);

        return () => clearTimeout(timer);
    }, [toast.duration]);

    const handleClose = () => {
        setIsExiting(true);
        setTimeout(() => {
            onRemove(toast.id);
        }, 300); // Wait for exit animation
    };

    const getStyle = () => {
        switch (toast.type) {
            case 'success':
                return 'border-green-500 text-green-100 bg-black/90 shadow-green-500/20';
            case 'error':
                return 'border-red-500 text-red-100 bg-black/90 shadow-red-500/20';
            case 'info':
                return 'border-blue-500 text-blue-100 bg-black/90 shadow-blue-500/20';
            case 'levelup':
                return 'border-purple-500 text-purple-100 bg-gradient-to-r from-purple-900/80 to-black/90 shadow-purple-500/30';
            case 'coin':
                return 'border-goldenYellow-500 text-goldenYellow-100 bg-gradient-to-r from-goldenYellow-900/40 to-black/90 shadow-goldenYellow-500/30';
            default:
                return 'border-gray-500 text-gray-100 bg-black/90';
        }
    };

    const getIcon = () => {
        switch (toast.type) {
            case 'success': return <CheckIcon className="w-6 h-6 text-green-400" />;
            case 'error': return <ErrorIcon className="w-6 h-6 text-red-400" />;
            case 'info': return <InfoIcon className="w-6 h-6 text-blue-400" />;
            case 'levelup': return <StarIcon className="w-6 h-6 text-purple-400 animate-pulse" />;
            case 'coin': return <CoinIcon className="w-6 h-6 text-goldenYellow-400 animate-spin-slow" />;
            default: return null;
        }
    };

    return (
        <div 
            className={`
                flex items-start p-4 mb-3 rounded-r-lg border-l-4 shadow-lg backdrop-blur-md cursor-pointer select-none
                transform transition-all duration-300 ease-in-out w-80 md:w-96
                ${getStyle()}
                ${isExiting ? 'opacity-0 translate-x-full' : 'opacity-100 translate-x-0 animate-fade-in-item'}
            `}
            onClick={handleClose}
            role="alert"
        >
            <div className="mr-3 mt-0.5 flex-shrink-0">
                {getIcon()}
            </div>
            <div className="flex-grow">
                <h4 className="font-bold text-sm uppercase tracking-wide mb-1">{toast.title}</h4>
                <p className="text-sm opacity-90 leading-snug">{toast.message}</p>
            </div>
            {/* Timer Bar (Optional visual flair) */}
            <div className="absolute bottom-0 left-0 h-0.5 bg-current opacity-30 w-full animate-shrink-width" style={{ animationDuration: `${toast.duration || 4000}ms` }}></div>
        </div>
    );
};

const ToastSystem: React.FC = () => {
    const { state, dispatch } = useAppContext();
    const { toasts } = state;

    const removeToast = (id: string) => {
        dispatch({ type: 'REMOVE_TOAST', payload: { id } });
    };

    return (
        <div className="fixed top-24 right-4 z-[9000] flex flex-col items-end pointer-events-none">
            <div className="pointer-events-auto">
                {toasts.map((toast) => (
                    <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
                ))}
            </div>
        </div>
    );
};

export default ToastSystem;
