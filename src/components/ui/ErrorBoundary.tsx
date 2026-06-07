import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error (caught by ErrorBoundary):', error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return this.props.fallback || (
                <div className="flex flex-col items-center justify-center min-h-screen bg-transparent text-white p-10 text-center">
                    <div className="bg-red-500/10 border border-red-500/20 p-8 rounded-3xl max-w-lg">
                        <h1 className="text-2xl font-black mb-4 tracking-tighter text-red-400">¡Vaya! Algo se ha desconectado 🔌</h1>
                        <p className="text-white/60 mb-6 text-sm">
                            La interfaz ha tenido un problema inesperado. No te preocupes, tus datos están a salvo.
                        </p>
                        <button
                            onClick={() => window.location.reload()}
                            className="bg-white text-black px-8 py-3 rounded-2xl font-bold hover:bg-white/90 transition-all"
                        >
                            Reiniciar Interfaz
                        </button>
                        {this.state.error && (
                            <pre className="mt-8 text-[10px] text-white/20 text-left overflow-auto max-h-40 p-4 bg-black/40 rounded-xl">
                                {this.state.error.stack}
                            </pre>
                        )}
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
