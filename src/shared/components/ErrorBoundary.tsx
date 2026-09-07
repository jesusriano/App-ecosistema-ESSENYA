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
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary atrapó un error en la aplicación:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public render() {
    if (this.state.hasError) {
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
            <div className="text-left bg-[var(--bg-subcard)] p-3 rounded-xl border border-[var(--border-color)] overflow-x-auto text-[11px] font-mono text-red-400">
              {this.state.error.message || String(this.state.error)}
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
                window.location.href = '/admin/dashboard';
              }}
              className="px-4 py-2.5 rounded-xl bg-[var(--bg-subcard)] border border-[var(--border-color)] text-[var(--text-primary)] font-semibold text-xs flex items-center gap-2 hover:bg-[var(--bg-active)] transition-all cursor-pointer"
            >
              <Home className="w-4 h-4 text-[#C9A55B]" />
              <span>Ir al Dashboard</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
