
import React, { ErrorInfo, ReactNode } from 'react';
import { LogEngineV4 } from '../../api/admin/logEngineV4';

interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class GlobalErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false
  };
  
  // Explicitly declaring props property to satisfy strict TypeScript environments
  // where inference from React.Component might fail or is overridden.
  declare props: Readonly<ErrorBoundaryProps>;

  constructor(props: ErrorBoundaryProps) {
    super(props);
  }

  static getDerivedStateFromError(_: Error): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    
    let errorMsg = "Unknown Error";
    try {
        // Handle cases where error is an object but not Error instance
        if (error && typeof error === 'object') {
             errorMsg = (error as any).message || JSON.stringify(error, Object.getOwnPropertyNames(error));
        } else {
             errorMsg = String(error);
        }
    } catch (e) {
        errorMsg = "Unserializable Error";
    }

    LogEngineV4.log({
        action: 'app_crash',
        category: 'system',
        payload: { 
            error: errorMsg, 
            stack: errorInfo.componentStack 
        }
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0B0F17] flex items-center justify-center p-4">
            <div className="bg-[#1B1E23] border border-red-500/30 rounded-xl p-8 text-center max-w-md shadow-2xl">
                <h1 className="text-2xl font-bold text-white mb-4 font-chakra">Algo deu errado</h1>
                <p className="text-gray-400 mb-6">
                    Ocorreu um erro inesperado. Nossa equipe técnica foi notificada automaticamente.
                </p>
                <button
                    onClick={() => window.location.reload()}
                    className="bg-[#FFD447] text-black font-bold py-3 px-6 rounded-lg hover:bg-[#E9BD3C] transition-colors uppercase tracking-wider text-sm"
                >
                    Recarregar Aplicação
                </button>
            </div>
        </div>
      );
    }

    const { children } = this.props;
    return <>{children}</>;
  }
}
