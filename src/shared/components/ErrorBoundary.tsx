import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null, showDetails: false };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary atrapó un error en la aplicación:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    if (this.props.onReset) {
      this.setState({ hasError: false, error: null, errorInfo: null, showDetails: false });
      this.props.onReset();
    } else {
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      const isDev = import.meta.env.DEV || import.meta.env.VITE_DEVELOPER_MODE === 'true';

      return (
        <div className="p-6 md:p-12 max-w-xl mx-auto my-8 bg-[var(--bg-card)] border border-red-500/30 rounded-3xl shadow-xl text-center space-y-5">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-red-500/10 border border-red-500/30 text-red-500 flex items-center justify-center">
            <AlertTriangle className="w-7 h-7" />
          </div>

          <div className="space-y-2">
            <h3 className="text-xl font-serif font-bold text-[var(--text-primary)]">
              {this.props.fallbackTitle || 'Hubo un inconveniente al cargar esta sección'}
            </h3>
            <p className="text-xs text-[var(--text-muted)] max-w-md mx-auto leading-relaxed">
              El módulo encontró un error de renderizado temporal. No te preocupes, tus datos en el sistema están seguros.
            </p>
          </div>

          {this.state.error && (
            <div className="text-left bg-[var(--bg-subcard)] p-3 rounded-xl border border-[var(--border-color)] overflow-x-auto text-[11px] font-mono text-red-400 space-y-2">
              <div className="font-bold flex items-center justify-between">
                <span>Error: {this.state.error.message || String(this.state.error)}</span>
                <button
                  onClick={() => this.setState(prev => ({ showDetails: !prev.showDetails }))}
                  className="text-[10px] bg-red-500/20 hover:bg-red-500/30 text-red-300 px-2 py-0.5 rounded cursor-pointer transition-all"
                >
                  {this.state.showDetails ? 'Ocultar Stack' : 'Ver Stack Trace'}
                </button>
              </div>

              {this.state.showDetails && (
                <div className="pt-2 border-t border-red-500/20 text-[10px] text-zinc-300 whitespace-pre-wrap max-h-48 overflow-y-auto">
                  <p className="font-bold text-red-300 mb-1">Error Stack:</p>
                  {this.state.error.stack || 'No stack trace available'}
                  
                  {this.state.errorInfo && this.state.errorInfo.componentStack && (
                    <>
                      <p className="font-bold text-red-300 mt-2 mb-1">Component Stack:</p>
                      {this.state.errorInfo.componentStack}
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <button
              onClick={this.handleReset}
              className="px-4 py-2.5 rounded-xl bg-[#C9A55B] text-black font-bold text-xs flex items-center gap-2 hover:bg-[#b5934e] transition-all cursor-pointer shadow-md"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Reintentar Carga</span>
            </button>
            <button
              onClick={() => {
                const path = typeof window !== 'undefined' ? window.location.pathname : '';
                if (path.startsWith('/terapeuta')) {
                  window.location.href = '/terapeuta';
                } else if (path.startsWith('/admin')) {
                  window.location.href = '/admin';
                } else {
                  window.location.href = '/cliente';
                }
              }}
              className="px-4 py-2.5 rounded-xl bg-[var(--bg-subcard)] border border-[var(--border-color)] text-[var(--text-primary)] font-semibold text-xs flex items-center gap-2 hover:bg-[var(--bg-active)] transition-all cursor-pointer"
            >
              <Home className="w-4 h-4 text-[#C9A55B]" />
              <span>Ir al Inicio</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
