import React, { useState } from 'react';
import { AdminHeader } from './AdminHeader';
import { AdminSidebar, AdminRoutePath } from './AdminSidebar';
import { Menu, X } from 'lucide-react';

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
    <div className="min-h-screen bg-[#0D0D0D] text-white flex flex-col font-sans overflow-x-hidden w-full">
      {/* Header exclusivo de Administrador */}
      <AdminHeader />

      {/* Bar for Mobile Hamburger Menu */}
      <div className="md:hidden bg-[#141414] border-b border-[#262626] px-3 py-2 flex items-center justify-between z-20">
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="px-3 py-1.5 rounded-xl bg-[#1A1A1A] border border-[#333333] text-[#C9A55B] hover:text-white flex items-center gap-2 text-xs font-bold cursor-pointer transition-all"
        >
          {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          <span>Menú Panel Admin</span>
        </button>
        <span className="text-[11px] text-[#888888] font-mono">Panel Admin</span>
      </div>

      <div className="flex-1 flex flex-col md:flex-row relative w-full">
        {/* Mobile Backdrop Drawer */}
        {isMobileMenuOpen && (
          <div 
            onClick={() => setIsMobileMenuOpen(false)}
            className="md:hidden fixed inset-0 bg-black/70 backdrop-blur-xs z-30 transition-opacity"
          />
        )}

        {/* Menú Lateral exclusivo de Administrador */}
        <div className={`
          fixed md:relative top-0 left-0 bottom-0 z-40 md:z-auto w-64 bg-[#111111] border-r border-[#262626] 
          transform transition-transform duration-300 ease-in-out md:transform-none h-full md:h-auto shrink-0
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}>
          <div className="p-4 md:hidden flex justify-between items-center border-b border-[#262626]">
            <span className="font-bold text-xs text-[#C9A55B]">Navegación Admin</span>
            <button 
              onClick={() => setIsMobileMenuOpen(false)} 
              className="p-1 rounded-lg bg-[#1A1A1A] text-stone-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <AdminSidebar 
            currentRoute={currentRoute}
            onNavigate={handleNavigate}
          />
        </div>

        {/* Contenido Principal de Administrador */}
        <main className="flex-1 p-3 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto overflow-y-auto min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
};
