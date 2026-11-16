import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { API } from '../../services/api';
import getSocket from '../../services/socket';
import { LiveStatsChart } from '../../components/LiveStatsChart';
import { QRCodeModal } from '../../components/QRCodeModal';
import confetti from 'canvas-confetti';

export const ProjectionScreen: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const socket = getSocket();

  const [session, setSession] = useState<any>(null);
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [stats, setStats] = useState<any>(null);
  const [participantsCount, setParticipantsCount] = useState(0);
  const [showQR, setShowQR] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [showCorrect, setShowCorrect] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [finalLeaderboard, setFinalLeaderboard] = useState<any[]>([]);

  useEffect(() => {
    if (!sessionId) return;

    API.getSessionState(sessionId).then(res => {
      if (res.success && res.session) {
        setSession(res.session);
        setParticipantsCount(res.session.participants?.length || 0);
        setTotalQuestions(res.session.quiz?.questions?.length || 0);
        setQuestionIndex(res.session.currentQuestionIndex || 0);
        setCurrentQuestion(res.session.quiz?.questions?.[res.session.currentQuestionIndex || 0]);

        if (res.session.currentQuestionId) {
          API.getQuestionLiveStats(sessionId, res.session.currentQuestionId).then(sRes => {
            if (sRes.success) setStats(sRes.stats);
          });
        }
      }
    });

    socket.emit('session:join_room', { sessionId, role: 'PROJECTION' });

    socket.on('session:started', (data) => {
      setQuestionIndex(data.questionIndex);
      setTotalQuestions(data.totalQuestions);
      setCurrentQuestion(data.question);
      setShowResults(false);
      setShowCorrect(false);
    });

    socket.on('session:question_changed', (data) => {
      setQuestionIndex(data.questionIndex);
      setTotalQuestions(data.totalQuestions);
      setCurrentQuestion(data.question);
      setShowResults(false);
      setShowCorrect(false);
    });

    socket.on('session:participant_joined', (data) => {
      setParticipantsCount(data.activeCount);
    });

    socket.on('session:stats_update', (newStats) => {
      setStats(newStats);
    });

    socket.on('session:results_toggled', (data) => {
      setShowResults(data.show);
    });

    socket.on('session:correct_revealed', (data) => {
      setShowCorrect(data.show);
    });

    socket.on('session:finished', (data) => {
      setIsFinished(true);
      setFinalLeaderboard(data.leaderboard || []);
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.5 } });
    });

    return () => {
      socket.off('session:started');
      socket.off('session:question_changed');
      socket.off('session:participant_joined');
      socket.off('session:stats_update');
      socket.off('session:results_toggled');
      socket.off('session:correct_revealed');
      socket.off('session:finished');
    };
  }, [sessionId, socket]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  if (!session) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 font-mono text-sm">
        Iniciando Proyección de AulaLive...
      </div>
    );
  }

  /* PODIUM VIEW */
  if (isFinished) {
    const top3 = finalLeaderboard.slice(0, 3);
    return (
      <div className="min-h-screen bg-slate-950 text-white p-8 flex flex-col justify-between">
        <header className="flex justify-between items-center pb-4 border-b border-slate-800">
          <div className="font-heading font-bold text-2xl text-cyan-400 flex items-center gap-2">
            <span className="material-icons text-3xl">sensors</span> AulaLive
          </div>
          <span className="text-sm font-mono text-slate-400 uppercase tracking-widest">
            PODIO OFICIAL DE LA CLASE
          </span>
        </header>

        <div className="max-w-4xl mx-auto my-auto text-center w-full">
          <div className="text-yellow-400 text-5xl mb-3 animate-bounce">🏆</div>
          <h1 className="font-heading font-bold text-4xl mb-8">¡Ganadores de la Sesión Interactiva!</h1>

          <div className="grid grid-cols-3 gap-6 items-end">
            {/* 2nd Place */}
            {top3[1] && (
              <div className="p-6 rounded-3xl bg-slate-900 border border-slate-700 text-center shadow-xl">
                <div className="text-3xl mb-1">🥈</div>
                <div className="font-bold text-xl text-slate-200">{top3[1].nickname}</div>
                <div className="font-mono text-cyan-400 text-sm mt-1">{top3[1].totalScore} pts</div>
                <div className="h-32 rounded-2xl bg-slate-800 mt-4 flex items-center justify-center font-bold font-mono text-2xl text-slate-400">
                  #2
                </div>
              </div>
            )}

            {/* 1st Place */}
            {top3[0] && (
              <div className="p-8 rounded-3xl bg-gradient-to-b from-amber-950/40 to-slate-900 border-2 border-amber-500 text-center shadow-2xl relative">
                <div className="text-5xl mb-1">👑</div>
                <div className="font-bold text-2xl text-amber-300">{top3[0].nickname}</div>
                <div className="font-mono text-amber-400 text-lg mt-1 font-bold">{top3[0].totalScore} pts</div>
                <div className="h-44 rounded-2xl bg-gradient-to-t from-amber-600 to-yellow-500 mt-4 flex items-center justify-center font-bold font-mono text-4xl text-slate-950 shadow-lg">
                  #1
                </div>
              </div>
            )}

            {/* 3rd Place */}
            {top3[2] && (
              <div className="p-6 rounded-3xl bg-slate-900 border border-slate-700 text-center shadow-xl">
                <div className="text-3xl mb-1">🥉</div>
                <div className="font-bold text-xl text-slate-200">{top3[2].nickname}</div>
                <div className="font-mono text-cyan-400 text-sm mt-1">{top3[2].totalScore} pts</div>
                <div className="h-24 rounded-2xl bg-slate-800 mt-4 flex items-center justify-center font-bold font-mono text-2xl text-slate-400">
                  #3
                </div>
              </div>
            )}
          </div>
        </div>

        <footer className="text-center text-xs text-slate-500 font-mono">
          Resultados consolidados en PostgreSQL
        </footer>
      </div>
    );
  }

  /* ACTIVE PROJECTION */
  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between p-6 sm:p-10 select-none">
      {/* Top Projector Banner */}
      <header className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-cyan-600 flex items-center justify-center text-white shadow-lg shadow-cyan-600/30">
            <span className="material-icons text-3xl">sensors</span>
          </div>
          <div>
            <h1 className="font-heading font-bold text-2xl text-white">AulaLive &bull; Proyección</h1>
            <p className="text-xs text-slate-400">{session.quiz.title}</p>
          </div>
        </div>

        {/* Big PIN & QR Toggle */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 px-5 py-2.5 rounded-2xl bg-slate-900 border border-slate-800">
            <span className="text-xs font-mono text-slate-400 uppercase tracking-widest">INGRESAR CON PIN:</span>
            <span className="font-mono font-bold text-3xl tracking-widest text-amber-400">{session.pinCode}</span>
          </div>

          <button
            onClick={() => setShowQR(true)}
            className="p-3 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-amber-400 transition-colors"
            title="Ver Código QR Grande"
          >
            <span className="material-icons text-2xl">qr_code_2</span>
          </button>

          <button
            onClick={toggleFullscreen}
            className="p-3 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 transition-colors"
            title="Pantalla Completa"
          >
            <span className="material-icons text-2xl">fullscreen</span>
          </button>
        </div>
      </header>

      {/* Main Content: Big Question + Dynamic Charts */}
      <main className="my-auto py-8 max-w-5xl mx-auto w-full">
        {currentQuestion ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <span className="px-3.5 py-1 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-mono font-bold text-xs">
                PREGUNTA {questionIndex + 1} DE {totalQuestions}
              </span>
              <div className="flex items-center gap-2 text-sm text-slate-400 font-mono">
                <span className="material-icons text-cyan-400 text-lg">how_to_reg</span>
                <span>{stats?.totalResponses || 0} de {participantsCount} respuestas recibidas</span>
              </div>
            </div>

            <h2 className="font-heading font-bold text-3xl sm:text-4xl text-white leading-tight">
              {currentQuestion.text}
            </h2>

            {/* Live Chart */}
            <div className="pt-4">
              <LiveStatsChart
                options={currentQuestion.answerOptions}
                distribution={stats?.distribution || {}}
                totalResponses={stats?.totalResponses || 0}
                showCorrect={showCorrect}
              />
            </div>

            {/* Explanation box on reveal */}
            {showCorrect && currentQuestion.explanation && (
              <div className="p-4 rounded-2xl bg-slate-900/90 border border-emerald-500/40 text-emerald-300 text-sm animate-fade-in">
                <strong className="block text-emerald-400 mb-0.5">Explicación Oficial:</strong>
                {currentQuestion.explanation}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="w-20 h-20 mx-auto rounded-3xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center mb-4">
              <span className="material-icons text-4xl">cast_connected</span>
            </div>
            <h2 className="font-heading font-bold text-3xl text-white">Esperando que el Docente Inicie</h2>
            <p className="text-sm text-slate-400 mt-2">
              Conéctate escaneando el código QR o ingresando el PIN <strong className="text-amber-400 font-mono">{session.pinCode}</strong>
            </p>
          </div>
        )}
      </main>

      {/* Footer Status */}
      <footer className="flex justify-between items-center pt-4 border-t border-slate-800 text-xs text-slate-400 font-mono">
        <div>AulaLive Big Screen System</div>
        <div>{participantsCount} alumnos en el aula</div>
      </footer>

      <QRCodeModal pinCode={session.pinCode} isOpen={showQR} onClose={() => setShowQR(false)} />
    </div>
  );
};

