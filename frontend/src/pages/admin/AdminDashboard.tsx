import React, { useEffect, useState } from 'react';
import { API } from '../../services/api';
import Swal from 'sweetalert2';

export const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const [statsRes, usersRes, logsRes] = await Promise.all([
        API.getSystemStats(),
        API.getAdminUsers(),
        API.getAuditLogs()
      ]);

      if (statsRes.success) setStats(statsRes.stats);
      if (usersRes.success) setUsers(usersRes.users || []);
      if (logsRes.success) setAuditLogs(logsRes.logs || []);
    } catch (err: any) {
      console.error('Error fetching admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleToggleStatus = async (userId: string) => {
    try {
      const res = await API.toggleUserStatus(userId);
      if (res.success) {
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, isActive: res.isActive } : u));
        Swal.fire({
          icon: 'success',
          title: res.message,
          timer: 1200,
          showConfirmButton: false,
          background: '#0f172a',
          color: '#f8fafc'
        });
      }
    } catch (err: any) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.message });
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-slate-400">Cargando consola de administración...</div>;
  }

  return (
    <div className="space-y-6 pb-16">
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl">
        <h1 className="font-heading font-bold text-2xl text-white">Panel de Administración Global</h1>
        <p className="text-xs text-slate-400 mt-1">
          Supervisión de usuarios, cursos, seguridad, bitácoras de auditoría y estadísticas del sistema
        </p>
      </div>

      {/* KPI Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
            <span className="text-[11px] font-mono text-slate-400 uppercase">Usuarios</span>
            <div className="text-2xl font-bold font-mono text-white mt-1">{stats.totalUsers}</div>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
            <span className="text-[11px] font-mono text-slate-400 uppercase">Docentes</span>
            <div className="text-2xl font-bold font-mono text-cyan-400 mt-1">{stats.totalTeachers}</div>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
            <span className="text-[11px] font-mono text-slate-400 uppercase">Estudiantes</span>
            <div className="text-2xl font-bold font-mono text-blue-400 mt-1">{stats.totalStudents}</div>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
            <span className="text-[11px] font-mono text-slate-400 uppercase">Cuestionarios</span>
            <div className="text-2xl font-bold font-mono text-purple-400 mt-1">{stats.totalQuizzes}</div>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
            <span className="text-[11px] font-mono text-slate-400 uppercase">Sesiones</span>
            <div className="text-2xl font-bold font-mono text-amber-400 mt-1">{stats.totalSessions}</div>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
            <span className="text-[11px] font-mono text-slate-400 uppercase">Respuestas</span>
            <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">{stats.totalResponses}</div>
          </div>
        </div>
      )}

      {/* User Management Table */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
        <h2 className="font-heading font-bold text-base text-white">Gestión de Usuarios</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 font-mono text-slate-400 uppercase">
              <tr>
                <th className="p-3">Nombre</th>
                <th className="p-3">Correo</th>
                <th className="p-3">RUT</th>
                <th className="p-3">Rol</th>
                <th className="p-3">Estado</th>
                <th className="p-3 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-slate-800/40">
                  <td className="p-3 font-semibold text-white">{u.firstName} {u.lastName}</td>
                  <td className="p-3 font-mono text-slate-400">{u.email}</td>
                  <td className="p-3 font-mono">{u.rut || '-'}</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                      {u.role}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      u.isActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                    }`}>
                      {u.isActive ? 'ACTIVO' : 'INACTIVO'}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => handleToggleStatus(u.id)}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px]"
                    >
                      {u.isActive ? 'Desactivar' : 'Activar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
        <h2 className="font-heading font-bold text-base text-white">Bitácora de Auditoría Reciente</h2>
        <div className="overflow-x-auto max-h-72">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 font-mono text-slate-400 uppercase sticky top-0">
              <tr>
                <th className="p-3">Fecha</th>
                <th className="p-3">Acción</th>
                <th className="p-3">Usuario</th>
                <th className="p-3">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 font-mono text-[11px]">
              {auditLogs.map(l => (
                <tr key={l.id}>
                  <td className="p-3 text-slate-400">{new Date(l.createdAt).toLocaleString('es-CL')}</td>
                  <td className="p-3 text-cyan-400 font-bold">{l.action}</td>
                  <td className="p-3">{l.user ? `${l.user.firstName} ${l.user.lastName}` : 'Sistema'}</td>
                  <td className="p-3 text-slate-500">{l.ipAddress || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

