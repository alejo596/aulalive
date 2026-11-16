import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { API } from '../../services/api';
import getSocket from '../../services/socket';
import { LiveStatsChart } from '../../components/LiveStatsChart';
import { QRCodeModal } from '../../components/QRCodeModal';
import Swal from 'sweetalert2';

export const LiveSessionControl: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const socket = getSocket();

  const [session, setSession] = useState<any>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [showQR, setShowQR] = useState(false);
  const [loading, setLoading] = useState(true);

  // Control state
  const [isShowingResults, setIsShowingResults] = useState(false);
  const [isShowingCorrect, setIsShowingCorrect] = useState(false);

  const fetchSession = async () => {
    if (!sessionId) return;
    try {
      const res = await API.getSessionState(sessionId);
      if (res.success && res.session) {
        setSession(res.session);
        setParticipants(res.session.participants || []);
        setIsShowingResults(res.session.isShowingResults);
        setIsShowingCorrect(res.session.isShowingCorrect);

        // Fetch initial stats if active
        if (res.session.currentQuestionId) {
          const statsRes = await API.getQuestionLiveStats(sessionId, res.session.currentQuestionId);
          if (statsRes.success) setStats(statsRes.stats);
        }
      }
    } catch (err: any) {
      console.error('Error fetching session:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSession();

    if (!sessionId) return;

    // Join Teacher Socket Room
    socket.emit('session:join_room', {
      sessionId,
      role: 'TEACHER'
    });

    // Real-Time Listeners
    socket.on('session:participant_joined', (data) => {
      setParticipants(data.participants || []);
    });

    socket.on('session:participant_left', (data) => {
      setParticipants(prev => prev.filter(p => p.id !== data.participantId));
    });

    socket.on('session:stats_update', (newStats) => {
      setStats(newStats);
    });

    socket.on('session:results_toggled', (data) => {
      setIsShowingResults(data.show);
    });

    socket.on('session:correct_revealed', (data) => {
      setIsShowingCorrect(data.show);
    });

    socket.on('session:finished', () => {
      fetchSession();
    });

    return () => {
      socket.off('session:participant_joined');
      socket.off('session:participant_left');
      socket.off('session:stats_update');
      socket.off('session:results_toggled');
      socket.off('session:correct_revealed');
      socket.off('session:finished');
    };
  }, [sessionId, socket]);

  // Master Actions
  const handleStartSession = () => {
    if (!sessionId) return;
    socket.emit('teacher:start_session', { sessionId });
    setSession((prev: any) => ({ ...prev, status: 'ACTIVE', currentQuestionIndex: 0 }));
  };

  const handleNextQuestion = () => {
    if (!sessionId || !session) return;
    const nextIdx = session.currentQuestionIndex + 1;
    socket.emit('teacher:next_question', { sessionId, nextIndex: nextIdx });
    setSession((prev: any) => ({ ...prev, currentQuestionIndex: nextIdx }));
    setIsShowingResults(false);
    setIsShowingCorrect(false);
  };

  const handleToggleResults = () => {
    if (!sessionId) return;
    const nextShow = !isShowingResults;
    socket.emit('teacher:toggle_results', { sessionId, show: nextShow });
    setIsShowingResults(nextShow);
  };

  const handleToggleCorrect = () => {
    if (!sessionId) return;
    const nextShow = !isShowingCorrect;
    socket.emit('teacher:toggle_correct', { sessionId, show: nextShow });
    setIsShowingCorrect(nextShow);
  };

  const handleFinishSession = async () => {
    const result = await Swal.fire({
      title: '¿Finalizar sesión interactiva?',
      text: 'Se consolidarán los puntajes finales y notas de los alumnos.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, finalizar sesión',
      cancelButtonText: 'Continuar sesión',
      confirmButtonColor: '#f59e0b',
      background: '#0f172a',
      color: '#f8fafc'
    });

    if (result.isConfirmed) {
      socket.emit('teacher:finish_session', { sessionId });
      setSession((prev: any) => ({ ...prev, status: 'FINISHED' }));
    }
  };

  if (loading || !session) {
    return <div className="p-12 text-center text-slate-400">Cargando consola de control en vivo...</div>;
  }

  const currentQ = session.quiz?.questions?.[session.currentQuestionIndex];
  const isLobby = session.status === 'LOBBY';
  const isFinished = session.status === 'FINISHED';

  return (
    <div className="space-y-6 pb-20">
      {/* Top Session Control Ribbon */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider ${
              session.status === 'ACTIVE'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : session.status === 'LOBBY'
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                : 'bg-slate-700 text-slate-300'
            }`}>
              {session.status}
            </span>
            <span className="text-xs text-slate-400 font-mono">
              PIN DE AULA: <strong className="text-amber-400 text-sm tracking-widest">{session.pinCode}</strong>
            </span>
          </div>
          <h1 className="font-heading font-bold text-xl sm:text-2xl text-white">
            {session.quiz.title}
          </h1>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowQR(true)}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 border border-amber-500/30 font-semibold text-xs flex items-center gap-1.5 transition-all"
          >
            <span className="material-icons text-base">qr_code</span>
            <span>Ver QR</span>
          </button>

          <Link
            to={`/projection/${sessionId}`}
            target="_blank"
            className="px-3.5 py-2 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/30 font-semibold text-xs flex items-center gap-1.5 transition-all"
          >
            <span className="material-icons text-base">open_in_new</span>
            <span>Abrir Proyección (Big Screen)</span>
          </Link>

          {isLobby && (
            <button
              onClick={handleStartSession}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/25 flex items-center gap-1.5 transition-all"
            >
              <span className="material-icons text-base">play_arrow</span>
              <span>Comenzar Cuestionario</span>
            </button>
          )}

          {!isLobby && !isFinished && (
            <>
              <button
                onClick={handleToggleResults}
                className={`px-3.5 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  isShowingResults
                    ? 'bg-cyan-600 text-white border-cyan-500 shadow-md shadow-cyan-600/30'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                }`}
              >
                <span className="material-icons text-base">bar_chart</span>
                <span>{isShowingResults ? 'Ocultar Gráficos' : 'Mostrar Gráficos'}</span>
              </button>

              <button
                onClick={handleToggleCorrect}
                className={`px-3.5 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  isShowingCorrect
                    ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-600/30'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                }`}
              >
                <span className="material-icons text-base">verified</span>
                <span>{isShowingCorrect ? 'Ocultar Correcta' : 'Revelar Respuesta'}</span>
              </button>

              <button
                onClick={handleNextQuestion}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 text-white font-bold text-xs shadow-md shadow-cyan-600/25 flex items-center gap-1.5 transition-all"
              >
                <span>Siguiente</span>
                <span className="material-icons text-base">arrow_forward</span>
              </button>

              <button
                onClick={handleFinishSession}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-red-900/60 hover:text-red-300 text-slate-400 border border-slate-700 text-xs font-semibold transition-all"
              >
                Finalizar
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Grid: Question & Stats vs Participants */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Question Statement & Live Stats Chart */}
        <div className="lg:col-span-2 space-y-6">
          {currentQ ? (
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <span className="text-xs font-mono font-bold text-cyan-400">
                  PREGUNTA {session.currentQuestionIndex + 1} DE {session.quiz.questions.length} &bull; {currentQ.points} PTS
                </span>
                <span className="px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 text-[10px] font-mono font-bold uppercase">
                  {currentQ.type.replace('_', ' ')}
                </span>
              </div>

              <h2 className="font-heading font-bold text-xl text-white">
                {currentQ.text}
              </h2>

              {/* Live Distribution Chart */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-3 text-xs text-slate-400">
                  <span className="font-semibold uppercase tracking-wider font-mono">
                    Respuestas en Tiempo Real ({stats?.totalResponses || 0} de {participants.length})
                  </span>
                  <span className="font-bold text-cyan-400 font-mono">
                    {stats?.participationPercentage || 0}% Participación
                  </span>
                </div>

                <LiveStatsChart
                  options={currentQ.answerOptions}
                  distribution={stats?.distribution || {}}
                  totalResponses={stats?.totalResponses || 0}
                  showCorrect={isShowingCorrect}
                />
              </div>

              {/* Word Cloud View if applicable */}
              {currentQ.type === 'WORD_CLOUD' && stats?.wordCloud && stats.wordCloud.length > 0 && (
                <div className="mt-4 p-4 rounded-2xl bg-slate-950 border border-slate-800">
                  <span className="text-xs font-mono text-purple-400 uppercase tracking-wider block mb-2 font-bold">
                    Nube de Palabras en Vivo:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {stats.wordCloud.map((w: any, idx: number) => (
                      <span
                        key={idx}
                        className="px-3 py-1.5 rounded-xl bg-purple-500/10 text-purple-300 border border-purple-500/20 font-semibold"
                        style={{ fontSize: `${Math.min(22, 11 + w.count * 3)}px` }}
                      >
                        {w.text} <small className="opacity-60 text-xs">({w.count})</small>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-12 rounded-3xl bg-slate-900 border border-slate-800 text-center text-slate-400">
              {isFinished ? 'Sesión interactiva finalizada.' : 'Esperando inicio del cuestionario...'}
            </div>
          )}
        </div>

        {/* Right Col: Connected Students Lobby & Live Rankings */}
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-heading font-bold text-base text-white flex items-center gap-2">
                <span className="material-icons text-cyan-400">people</span>
                <span>Alumnos Conectados ({participants.length})</span>
              </h3>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" title="En vivo"></span>
            </div>

            <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
              {participants.length === 0 ? (
                <div className="text-xs text-slate-500 text-center py-6">
                  Esperando que los alumnos ingresen el PIN <strong>{session.pinCode}</strong>...
                </div>
              ) : (
                participants.map((p, idx) => (
                  <div
                    key={p.id || idx}
                    className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-cyan-600/20 text-cyan-400 font-mono font-bold flex items-center justify-center text-[10px]">
                        {idx + 1}
                      </span>
                      <span className="font-medium text-white">{p.nickname}</span>
                    </div>
                    {p.studentIdentifier && (
                      <span className="font-mono text-[10px] text-slate-400">{p.studentIdentifier}</span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <QRCodeModal pinCode={session.pinCode} isOpen={showQR} onClose={() => setShowQR(false)} />
    </div>
  );
};

