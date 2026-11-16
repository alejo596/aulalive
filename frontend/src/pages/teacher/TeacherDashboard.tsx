import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { API } from '../../services/api';
import Swal from 'sweetalert2';

interface QuizItem {
  id: string;
  title: string;
  description: string;
  code: string;
  isPublished: boolean;
  timeLimitSec: number;
  subject?: { name: string; code: string };
  _count: { questions: number; liveSessions: number };
}

export const TeacherDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState<QuizItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchQuizzes = async () => {
    setLoading(true);
    try {
      const res = await API.getTeacherQuizzes();
      if (res.success) {
        setQuizzes(res.quizzes || []);
      }
    } catch (err: any) {
      console.error('Error fetching quizzes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuizzes();
  }, []);

  const handleStartSession = async (quizId: string) => {
    try {
      const res = await API.createSession(quizId);
      if (res.success && res.session) {
        navigate(`/teacher/session/${res.session.id}`);
      }
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'Error al iniciar sesión',
        text: err.message,
        background: '#0f172a',
        color: '#f8fafc'
      });
    }
  };

  const handleDuplicate = async (quizId: string) => {
    try {
      const res = await API.duplicateQuiz(quizId);
      if (res.success) {
        Swal.fire({
          icon: 'success',
          title: 'Cuestionario Duplicado',
          timer: 1500,
          showConfirmButton: false,
          background: '#0f172a',
          color: '#f8fafc'
        });
        fetchQuizzes();
      }
    } catch (err: any) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.message });
    }
  };

  const handleDelete = async (quizId: string) => {
    const result = await Swal.fire({
      title: '¿Eliminar cuestionario?',
      text: 'Esta acción no se puede deshacer.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#ef4444',
      background: '#0f172a',
      color: '#f8fafc'
    });

    if (result.isConfirmed) {
      try {
        await API.deleteQuiz(quizId);
        setQuizzes(prev => prev.filter(q => q.id !== quizId));
      } catch (err: any) {
        Swal.fire({ icon: 'error', title: 'Error', text: err.message });
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-gradient-to-r from-slate-900 to-slate-800/80 border border-slate-800 shadow-xl">
        <div>
          <h1 className="font-heading font-bold text-2xl sm:text-3xl text-white">
            Panel del Docente
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Crea cuestionarios, lanza sesiones interactivas con PIN y proyecta estadísticas en vivo
          </p>
        </div>
        <Link
          to="/teacher/quizzes/new"
          className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold text-sm shadow-lg shadow-cyan-600/30 transition-all shrink-0"
        >
          <span className="material-icons text-xl">add</span>
          <span>Crear Cuestionario</span>
        </Link>
      </div>

      {/* Quizzes List */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading font-bold text-lg text-white flex items-center gap-2">
            <span className="material-icons text-cyan-400">quiz</span>
            <span>Mis Cuestionarios ({quizzes.length})</span>
          </h2>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400">Cargando cuestionarios...</div>
        ) : quizzes.length === 0 ? (
          <div className="p-12 rounded-3xl bg-slate-900/60 border border-slate-800 text-center">
            <span className="material-icons text-5xl text-slate-600 mb-2">menu_book</span>
            <p className="text-slate-400 text-sm">No tienes cuestionarios creados aún.</p>
            <Link to="/teacher/quizzes/new" className="text-cyan-400 text-xs font-semibold hover:underline mt-2 inline-block">
              Crear mi primer cuestionario ahora
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {quizzes.map((quiz) => (
              <div
                key={quiz.id}
                className="rounded-3xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 p-5 flex flex-col justify-between shadow-xl transition-all group"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[10px] font-mono font-semibold">
                      {quiz._count.questions} PREGUNTAS
                    </span>
                    <span className="text-[11px] font-mono text-slate-500">
                      {quiz._count.liveSessions} sesiones
                    </span>
                  </div>

                  <h3 className="font-heading font-bold text-base text-white group-hover:text-cyan-300 transition-colors line-clamp-2">
                    {quiz.title}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                    {quiz.description || 'Sin descripción adicional.'}
                  </p>
                </div>

                <div className="mt-5 pt-4 border-t border-slate-800/80">
                  <button
                    onClick={() => handleStartSession(quiz.id)}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-bold text-xs shadow-md shadow-amber-500/20 flex items-center justify-center gap-1.5 transition-all mb-2"
                  >
                    <span className="material-icons text-base">play_arrow</span>
                    <span>Lanzar Sesión en Vivo</span>
                  </button>

                  <div className="flex items-center justify-between gap-1">
                    <Link
                      to={`/teacher/quizzes/${quiz.id}/edit`}
                      className="flex-1 py-1.5 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium text-center transition-colors"
                    >
                      Editar
                    </Link>
                    <button
                      onClick={() => handleDuplicate(quiz.id)}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                      title="Duplicar cuestionario"
                    >
                      <span className="material-icons text-base">content_copy</span>
                    </button>
                    <button
                      onClick={() => handleDelete(quiz.id)}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-900/50 hover:text-red-400 text-slate-400 transition-colors"
                      title="Eliminar cuestionario"
                    >
                      <span className="material-icons text-base">delete</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

