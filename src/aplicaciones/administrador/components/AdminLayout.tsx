import React, { useState } from 'react';
import { AdminHeader } from './AdminHeader';
import { AdminSidebar, AdminRoutePath } from './AdminSidebar';
import { AdminNavigation } from './AdminNavigation';
import { Menu, X, LayoutGrid } from 'lucide-react';
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
      {/* Header exclusivo de Administrador */}
      <AdminHeader />

      {/* Barra de Navegación Horizontal Accesible (Mobile & Desktop) */}
      <AdminNavigation 
        currentRoute={currentRoute} 
        onNavigate={handleNavigate} 
      />

      {/* Bar for Mobile Hamburger Menu if user wants full drawer */}
      <div className="md:hidden bg-[var(--bg-card)] border-b border-[var(--border-color)] px-4 py-2 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="px-3 py-1.5 rounded-xl bg-[var(--bg-subcard)] border border-[var(--border-color)] text-[#C9A55B] hover:text-[var(--text-primary)] flex items-center gap-2 text-xs font-bold cursor-pointer transition-all"
        >
          {isMobileMenuOpen ? <X className="w-4 h-4" /> : <LayoutGrid className="w-4 h-4" />}
          <span>Ver Menú Detallado</span>
        </button>
        <span className="text-[11px] text-[var(--text-muted)] font-mono">Panel Administrador</span>
      </div>

      <div className="flex-1 flex flex-col md:flex-row relative w-full">
        {/* Mobile Backdrop Drawer */}
        {isMobileMenuOpen && (
          <div 
            onClick={() => setIsMobileMenuOpen(false)}
            className="md:hidden fixed inset-0 bg-black/70 backdrop-blur-xs z-[65] transition-opacity cursor-pointer"
          />
        )}

        {/* Mobile Sidebar Drawer */}
        <div className={`
          md:hidden fixed inset-y-0 left-0 z-[70] w-72 bg-[var(--bg-card)] border-r border-[var(--border-color)] shadow-2xl
          transform transition-transform duration-300 ease-in-out overflow-y-auto flex flex-col
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full pointer-events-none'}
        `}>
          <div className="p-4 flex justify-between items-center border-b border-[var(--border-color)] bg-[var(--bg-subcard)] sticky top-0 z-10">
            <span className="font-bold text-xs text-[#C9A55B] tracking-wider uppercase">Menú Administrativo</span>
            <button 
              type="button"
              onClick={() => setIsMobileMenuOpen(false)} 
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
        <aside className="hidden md:flex flex-col w-64 bg-[var(--bg-card)] border-r border-[var(--border-color)] shrink-0 min-h-[calc(100vh-140px)]">
          <AdminSidebar 
            currentRoute={currentRoute}
            onNavigate={handleNavigate}
          />
        </aside>

        {/* Contenido Principal de Administrador */}
        <main className="flex-1 p-3 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto overflow-y-auto min-w-0">
          <ErrorBoundary fallbackTitle="Error al cargar el módulo administrativo">
            {children}
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
};

