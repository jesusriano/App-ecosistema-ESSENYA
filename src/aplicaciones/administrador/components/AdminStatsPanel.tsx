import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import { TrendingUp, Users, Calendar, Award } from 'lucide-react';

interface AdminStatsPanelProps {
  bookings?: any[];
  therapists?: any[];
}

const monthlyData = [
  { month: 'Ene', reservas: 42, ingresos: 63000 },
  { month: 'Feb', reservas: 58, ingresos: 87000 },
  { month: 'Mar', reservas: 74, ingresos: 111000 },
  { month: 'Abr', reservas: 65, ingresos: 97500 },
  { month: 'May', reservas: 88, ingresos: 132000 },
  { month: 'Jun', reservas: 104, ingresos: 156000 },
  { month: 'Jul', reservas: 95, ingresos: 142500 },
  { month: 'Ago', reservas: 120, ingresos: 180000 },
];

const therapistOccupancyData = [
  { name: 'Sofia Valdés', ocupacion: 92, servicios: 38 },
  { name: 'Elena Moreau', ocupacion: 85, services: 34 },
  { name: 'Camila Rossi', ocupacion: 78, services: 29 },
  { name: 'Valeria Dupond', ocupacion: 88, services: 35 },
  { name: 'Lucía Benítez', ocupacion: 65, services: 22 },
];

export const AdminStatsPanel: React.FC<AdminStatsPanelProps> = () => {
  return (
    <div className="space-y-6">
      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 space-y-2">
          <div className="flex justify-between items-center text-[#C9A55B]">
            <span className="text-[10px] font-mono uppercase tracking-wider font-bold">Volumen Anual</span>
            <Calendar className="w-4 h-4" />
          </div>
          <div className="text-2xl font-serif font-bold text-[var(--text-primary)]">646 <span className="text-xs font-sans text-emerald-400 font-normal">+18.4%</span></div>
          <p className="text-[11px] text-[var(--text-muted)]">Total reservas confirmadas YTD</p>
        </div>

        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 space-y-2">
          <div className="flex justify-between items-center text-[#C9A55B]">
            <span className="text-[10px] font-mono uppercase tracking-wider font-bold">Ocupación Promedio</span>
            <Users className="w-4 h-4" />
          </div>
          <div className="text-2xl font-serif font-bold text-[var(--text-primary)]">83.6% <span className="text-xs font-sans text-emerald-400 font-normal">Alta demanda</span></div>
          <p className="text-[11px] text-[var(--text-muted)]">Eficiencia operativa de terapeutas</p>
        </div>

        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 space-y-2">
          <div className="flex justify-between items-center text-[#C9A55B]">
            <span className="text-[10px] font-mono uppercase tracking-wider font-bold">Ingresos Estimados</span>
            <TrendingUp className="w-4 h-4" />
          </div>
          <div className="text-2xl font-serif font-bold text-[var(--text-primary)]">$968,500 <span className="text-xs font-sans text-emerald-400 font-normal">MXN</span></div>
          <p className="text-[11px] text-[var(--text-muted)]">Facturación acumulada del periodo</p>
        </div>

        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 space-y-2">
          <div className="flex justify-between items-center text-[#C9A55B]">
            <span className="text-[10px] font-mono uppercase tracking-wider font-bold">Calidad & Satisfacción</span>
            <Award className="w-4 h-4" />
          </div>
          <div className="text-2xl font-serif font-bold text-[var(--text-primary)]">4.98 / 5.0</div>
          <p className="text-[11px] text-[var(--text-muted)]">Basado en 512 valoraciones de clientes</p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Monthly Booking Volume Chart */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl p-6 space-y-4 shadow-xl">
          <div className="flex justify-between items-center">
            <div>
              <span className="text-[10px] font-mono text-[#C9A55B] font-bold uppercase tracking-wider">Demanda & Tendencia</span>
              <h3 className="text-base font-serif font-bold text-[var(--text-primary)]">Volumen de Reservas Mensuales</h3>
            </div>
            <span className="text-xs text-[var(--text-muted)] font-mono">2026 YTD</span>
          </div>

          <div className="h-72 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                <XAxis dataKey="month" stroke="#888888" fontSize={11} tickLine={false} />
                <YAxis stroke="#888888" fontSize={11} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1A1A1A', borderColor: '#333', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                  formatter={(val: any) => [`${val} servicios`, 'Reservas']}
                />
                <Bar dataKey="reservas" fill="#C9A55B" radius={[6, 6, 0, 0]}>
                  {monthlyData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={index === monthlyData.length - 1 ? '#D8B46B' : '#C9A55B'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Therapist Occupancy Chart */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl p-6 space-y-4 shadow-xl">
          <div className="flex justify-between items-center">
            <div>
              <span className="text-[10px] font-mono text-[#C9A55B] font-bold uppercase tracking-wider">Rendimiento de Personal</span>
              <h3 className="text-base font-serif font-bold text-[var(--text-primary)]">Índice de Ocupación por Terapeuta</h3>
            </div>
            <span className="text-xs text-[var(--text-muted)] font-mono">% Agenda Activa</span>
          </div>

          <div className="h-72 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={therapistOccupancyData} layout="vertical" margin={{ top: 10, right: 10, left: 30, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} stroke="#888888" fontSize={11} tickLine={false} unit="%" />
                <YAxis type="category" dataKey="name" stroke="#AAAAAA" fontSize={11} tickLine={false} width={90} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1A1A1A', borderColor: '#333', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                  formatter={(val: any) => [`${val}%`, 'Ocupación']}
                />
                <Bar dataKey="ocupacion" fill="#C9A55B" radius={[0, 6, 6, 0]}>
                  {therapistOccupancyData.map((_, index) => (
                    <Cell key={`cell-occ-${index}`} fill={index % 2 === 0 ? '#C9A55B' : '#E5C482'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
};
