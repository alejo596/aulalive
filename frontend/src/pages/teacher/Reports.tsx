import React, { useEffect, useState } from 'react';
import { API } from '../../services/api';

export const Reports: React.FC = () => {
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [sessionData, setSessionData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    API.getTeacherQuizzes().then(res => {
      if (res.success && res.quizzes) {
        setQuizzes(res.quizzes);
        // Find first quiz that has sessions
        for (const q of res.quizzes) {
          if (q.liveSessions && q.liveSessions.length > 0) {
            setSelectedSessionId(q.liveSessions[0].id);
            break;
          }
        }
      }
    });
  }, []);

  useEffect(() => {
    if (selectedSessionId) {
      setLoading(true);
      API.getSessionState(selectedSessionId).then(res => {
        if (res.success) {
          setSessionData(res.session);
        }
        setLoading(false);
      });
    }
  }, [selectedSessionId]);

  return (
    <div className="space-y-6 pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl">
        <div>
          <h1 className="font-heading font-bold text-2xl text-white">Reportes y Estadísticas de Aprendizaje</h1>
          <p className="text-xs text-slate-400 mt-1">
            Exporta actas en PDF, hojas de cálculo Excel y CSV con notas y trazabilidad de respuestas
          </p>
        </div>

        {selectedSessionId && (
          <div className="flex flex-wrap gap-2">
            <a
              href={API.getExcelExportUrl(selectedSessionId)}
              download
              className="px-3.5 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 font-semibold text-xs flex items-center gap-1.5 transition-all"
            >
              <span className="material-icons text-base">table_view</span>
              <span>Exportar Excel (.xlsx)</span>
            </a>
            <a
              href={API.getCSVExportUrl(selectedSessionId)}
              download
              className="px-3.5 py-2 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-400 border border-cyan-500/30 font-semibold text-xs flex items-center gap-1.5 transition-all"
            >
              <span className="material-icons text-base">description</span>
              <span>Exportar CSV</span>
            </a>
            <a
              href={API.getPDFExportUrl(selectedSessionId)}
              target="_blank"
              rel="noreferrer"
              className="px-3.5 py-2 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 border border-rose-500/30 font-semibold text-xs flex items-center gap-1.5 transition-all"
            >
              <span className="material-icons text-base">picture_as_pdf</span>
              <span>Descargar PDF</span>
            </a>
          </div>
        )}
      </div>

      {/* Session Data View */}
      {sessionData ? (
        <div className="space-y-6">
          {/* Summary KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-xs font-mono text-slate-400 uppercase">Total Alumnos</span>
              <div className="text-2xl font-bold font-mono text-white mt-1">
                {sessionData.participants?.length || 0}
              </div>
            </div>
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-xs font-mono text-slate-400 uppercase">PIN de Sesión</span>
              <div className="text-2xl font-bold font-mono text-amber-400 mt-1">
                {sessionData.pinCode}
              </div>
            </div>
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-xs font-mono text-slate-400 uppercase">Estado</span>
              <div className="text-sm font-bold font-mono text-cyan-400 mt-1 uppercase">
                {sessionData.status}
              </div>
            </div>
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-xs font-mono text-slate-400 uppercase">Total Preguntas</span>
              <div className="text-2xl font-bold font-mono text-white mt-1">
                {sessionData.quiz?.questions?.length || 0}
              </div>
            </div>
          </div>

          {/* Student Scores Table */}
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
            <h2 className="font-heading font-bold text-base text-white">
              Planilla de Calificaciones (Escala 1.0 a 7.0 al 60% de Exigencia)
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 font-mono text-slate-400 uppercase">
                  <tr>
                    <th className="p-3">#</th>
                    <th className="p-3">Estudiante / Pareja</th>
                    <th className="p-3">RUT / Identificador</th>
                    <th className="p-3">Aciertos</th>
                    <th className="p-3">Puntaje</th>
                    <th className="p-3">Nota Final</th>
                    <th className="p-3">Condición</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {sessionData.participants?.map((p: any, idx: number) => {
                    const grade = p.score?.finalGrade || 1.0;
                    const isApproved = grade >= 4.0;
                    return (
                      <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-3 font-mono text-slate-400">#{idx + 1}</td>
                        <td className="p-3 font-semibold text-white">{p.nickname}</td>
                        <td className="p-3 font-mono text-slate-400">{p.studentIdentifier || '-'}</td>
                        <td className="p-3 font-mono text-cyan-400">{p.score?.correctAnswers || 0}</td>
                        <td className="p-3 font-mono font-bold text-amber-400">{p.score?.totalScore || 0}</td>
                        <td className={`p-3 font-mono font-bold ${isApproved ? 'text-cyan-400' : 'text-red-400'}`}>
                          {grade.toFixed(1)}
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isApproved
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-red-500/20 text-red-400 border border-red-500/30'
                          }`}>
                            {isApproved ? 'APROBADO' : 'REPROBADO'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-12 rounded-3xl bg-slate-900 border border-slate-800 text-center text-slate-400">
          No hay sesiones seleccionadas o disponibles para auditar.
        </div>
      )}
    </div>
  );
};

