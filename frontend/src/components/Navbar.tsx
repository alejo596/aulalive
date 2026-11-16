import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { clearAuthToken } from '../services/api';

interface NavbarProps {
  user?: {
    firstName: string;
    lastName: string;
    role: string;
    email: string;
  } | null;
}

export const Navbar: React.FC<NavbarProps> = ({ user }) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    clearAuthToken();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 px-4 lg:px-8 py-3">
      <div className="flex items-center justify-between">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20">
            <span className="material-icons text-2xl">sensors</span>
          </div>
          <div>
            <span className="font-heading font-bold text-xl tracking-tight text-white flex items-center gap-1.5">
              Aula<span className="text-cyan-400">Live</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-mono font-normal">
                v1.0
              </span>
            </span>
            <p className="text-xs text-slate-400 hidden sm:block">Plataforma Interactiva en Tiempo Real</p>
          </div>
        </Link>

        {/* Quick Links & User Capsule */}
        <div className="flex items-center gap-3">
          <Link
            to="/join"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-semibold hover:bg-amber-500/20 transition-all"
          >
            <span className="material-icons text-base">qr_code_scanner</span>
            <span>Ingreso PIN Alumno</span>
          </Link>

          {user ? (
            <div className="flex items-center gap-3 pl-3 border-l border-slate-800">
              <div className="hidden md:block text-right">
                <div className="text-sm font-semibold text-slate-200">{user.firstName} {user.lastName}</div>
                <div className="text-xs text-cyan-400 font-mono uppercase tracking-wider">{user.role}</div>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-red-400 hover:bg-slate-700/60 transition-colors"
                title="Cerrar Sesión"
              >
                <span className="material-icons text-xl">logout</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-md shadow-cyan-600/30 transition-all"
              >
                Iniciar Sesión
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

