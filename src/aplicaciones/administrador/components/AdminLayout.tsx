import React, { useState } from 'react';
import { AdminHeader } from './AdminHeader';
import { AdminSidebar, AdminRoutePath } from './AdminSidebar';
import { AdminNavigation } from './AdminNavigation';
import { X, Shield } from 'lucide-react';
import { ErrorBoundary } from '../../../shared/components/ErrorBoundary';

interface AdminLayoutProps {
  children: React.ReactNode;
  currentRoute: AdminRoutePath;
  onNavigate: (route: AdminRoutePath) => void;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  children,
  currentRoute,
  onNavigate,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleNavigate = (route: AdminRoutePath) => {
    onNavigate(route);
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-[var(--bg-main)] text-[var(--text-primary)] flex flex-col font-sans overflow-x-hidden w-full">
      {/* Header exclusivo de Administrador con botón de menú móvil integrado */}
      <AdminHeader 
        onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        isMobileMenuOpen={isMobileMenuOpen}
      />

      {/* Barra de Navegación Horizontal Accesible (Mobile touch-scroll & Desktop) */}
      <AdminNavigation 
        currentRoute={currentRoute} 
        onNavigate={handleNavigate} 
      />

      <div className="flex-1 flex flex-col md:flex-row relative w-full min-w-0">
        {/* Mobile Backdrop Drawer */}
        {isMobileMenuOpen && (
          <div 
            onClick={() => setIsMobileMenuOpen(false)}
            aria-hidden="true"
            className="md:hidden fixed inset-0 bg-black/75 backdrop-blur-xs z-[65] transition-opacity cursor-pointer"
          />
        )}

        {/* Mobile Sidebar Drawer */}
        <div 
          role="dialog"
          aria-modal="true"
          aria-label="Menú Administrativo"
          className={`
            md:hidden fixed inset-y-0 left-0 z-[70] w-72 max-w-[85vw] bg-[var(--bg-card)] border-r border-[var(--border-color)] shadow-2xl
            transform transition-transform duration-300 ease-in-out overflow-y-auto flex flex-col
            ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full pointer-events-none'}
          `}
        >
          <div className="p-4 flex justify-between items-center border-b border-[var(--border-color)] bg-[var(--bg-subcard)] sticky top-0 z-10">
            <div className="flex items-center space-x-2">
              <Shield className="w-4 h-4 text-[#C9A55B]" />
              <span className="font-bold text-xs text-[#C9A55B] tracking-wider uppercase">Menú Administrativo</span>
            </div>
            <button 
              type="button"
              onClick={() => setIsMobileMenuOpen(false)} 
              aria-label="Cerrar menú"
              className="p-1.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 p-2">
            <AdminSidebar 
              currentRoute={currentRoute}
              onNavigate={handleNavigate}
            />
          </div>
        </div>

        {/* Desktop Sidebar */}
        <aside className="hidden md:flex flex-col w-64 bg-[var(--bg-card)] border-r border-[var(--border-color)] shrink-0 min-h-[calc(100vh-120px)]">
          <AdminSidebar 
            currentRoute={currentRoute}
            onNavigate={handleNavigate}
          />
        </aside>

        {/* Contenido Principal de Administrador */}
        <main className="flex-1 p-3 sm:p-5 lg:p-8 max-w-7xl w-full mx-auto overflow-y-auto min-w-0">
          <ErrorBoundary fallbackTitle="Error al cargar el módulo administrativo">
            {children}
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
};

