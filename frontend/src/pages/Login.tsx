import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { API, setAuthToken } from '../services/api';
import Swal from 'sweetalert2';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await API.login({ email, password });
      if (res.success && res.token) {
        setAuthToken(res.token);
        localStorage.setItem('aulalive_user', JSON.stringify(res.user));

        Swal.fire({
          icon: 'success',
          title: `¡Bienvenido, ${res.user.firstName}!`,
          text: `Has iniciado sesión como ${res.user.role}`,
          timer: 1500,
          showConfirmButton: false,
          background: '#0f172a',
          color: '#f8fafc'
        });

        if (res.user.role === 'ADMIN') {
          navigate('/admin');
        } else {
          navigate('/teacher');
        }
      }
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'Error de Autenticación',
        text: err.message || 'Credenciales incorrectas',
        background: '#0f172a',
        color: '#f8fafc'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
  };

  return (
    <div className="min-h-[calc(100vh-70px)] flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-3xl bg-slate-900/90 border border-slate-800 p-8 shadow-2xl backdrop-blur-xl">
        <div className="text-center mb-8">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-white shadow-xl shadow-cyan-500/20 mb-3">
            <span className="material-icons text-3xl">lock</span>
          </div>
          <h2 className="font-heading font-bold text-2xl text-white">Iniciar Sesión en AulaLive</h2>
          <p className="text-xs text-slate-400 mt-1">Acceso seguro para Docentes y Administradores</p>
        </div>

        {/* Quick Demo Credentials Banner */}
        <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60 mb-6 text-xs text-slate-300">
          <span className="font-semibold text-cyan-400 block mb-1 flex items-center gap-1">
            <span className="material-icons text-sm">vpn_key</span> Cuentas Demo Rápidas:
          </span>
          <div className="flex gap-2 mt-2">
            <button
              type="button"
              onClick={() => handleQuickLogin('docente@aulalive.edu', 'Docente1234*')}
              className="flex-1 py-1.5 px-2 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/30 font-mono text-[11px]"
            >
              Docente
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('admin@aulalive.edu', 'Admin1234*')}
              className="flex-1 py-1.5 px-2 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 font-mono text-[11px]"
            >
              Administrador
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Correo Electrónico</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="docente@aulalive.edu"
              required
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 text-sm transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 text-sm transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold text-sm shadow-lg shadow-cyan-600/25 transition-all disabled:opacity-50 mt-2"
          >
            {loading ? 'Validando...' : 'Ingresar al Panel'}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-slate-800 text-center">
          <p className="text-xs text-slate-400">
            ¿Eres estudiante y vas a responder?{' '}
            <Link to="/join" className="text-cyan-400 hover:underline font-semibold">
              Ingresa aquí con tu PIN o QR
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

