import React from 'react';
import { NavLink } from 'react-router-dom';

interface SidebarProps {
  role?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ role = 'TEACHER' }) => {
  const isAdmin = role === 'ADMIN';

  const teacherNavItems = [
    { to: '/teacher', icon: 'dashboard', label: 'Mi Panel' },
    { to: '/teacher/quizzes/new', icon: 'add_circle', label: 'Crear Cuestionario' },
    { to: '/teacher/reports', icon: 'analytics', label: 'Reportes y Estadísticas' }
  ];

  const adminNavItems = [
    { to: '/admin', icon: 'admin_panel_settings', label: 'Panel Administrador' },
    { to: '/admin/users', icon: 'people', label: 'Gestión de Usuarios' },
    { to: '/admin/courses', icon: 'school', label: 'Cursos y Asignaturas' },
    { to: '/admin/audit', icon: 'history', label: 'Bitácora de Auditoría' }
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 p-4 flex flex-col justify-between shrink-0 hidden md:flex min-h-[calc(100vh-65px)]">
      <div className="space-y-6">
        <div>
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest px-3">
            {isAdmin ? 'Módulo Administrativo' : 'Módulo Docente'}
          </span>
          <nav className="mt-2 space-y-1">
            {(isAdmin ? adminNavItems : teacherNavItems).map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/teacher' || item.to === '/admin'}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-600/20 font-semibold'
                      : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                  }`
                }
              >
                <span className="material-icons text-xl">{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Quick Teacher / Student Toggle */}
        <div className="p-3.5 rounded-2xl bg-slate-800/50 border border-slate-700/50">
          <div className="flex items-center gap-2 text-cyan-400 mb-1.5">
            <span className="material-icons text-lg">info</span>
            <span className="text-xs font-semibold">Proyección en Aula</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed mb-2.5">
            Usa la vista especial para proyectores para visualizar estadísticas dinámicas sin recargar.
          </p>
          <div className="text-[10px] font-mono text-slate-500">PostgreSQL + Socket.IO</div>
        </div>
      </div>

      <div className="pt-4 border-t border-slate-800/80 text-center">
        <p className="text-xs text-slate-500 font-mono">AulaLive v1.0 &bull; 2026</p>
      </div>
    </aside>
  );
};

