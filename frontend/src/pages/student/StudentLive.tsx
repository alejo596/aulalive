import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import getSocket from '../../services/socket';
import { CountdownTimer } from '../../components/CountdownTimer';
import confetti from 'canvas-confetti';

interface Question {
  id: string;
  text: string;
  type: string;
  points: number;
  timeLimitSec: number;
  imageUrl?: string | null;
  answerOptions: {
    id: string;
    text: string;
    orderNum: number;
  }[];
}

export const StudentLive: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const socket = getSocket();

  const [participant, setParticipant] = useState<any>(null);
  const [sessionStatus, setSessionStatus] = useState<string>('LOBBY');
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [questionIndex, setQuestionIndex] = useState<number>(0);
  const [totalQuestions, setTotalQuestions] = useState<number>(0);

  const [selectedOptionId, setSelectedOptionId] = useState<string>('');
  const [selectedOptionIds, setSelectedOptionIds] = useState<string[]>([]);
  const [textAnswer, setTextAnswer] = useState<string>('');
  const [orderingList, setOrderingList] = useState<string[]>([]);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState<boolean>(false);
  const [submissionFeedback, setSubmissionFeedback] = useState<any>(null);

  const [correctOptionIds, setCorrectOptionIds] = useState<string[]>([]);
  const [showResults, setShowResults] = useState<boolean>(false);
  const [showCorrect, setShowCorrect] = useState<boolean>(false);

  const [finalLeaderboard, setFinalLeaderboard] = useState<any[]>([]);
  const [totalScore, setTotalScore] = useState<number>(0);

  const [startTime, setStartTime] = useState<number>(Date.now());

  useEffect(() => {
    const savedP = sessionStorage.getItem('aulalive_participant');
    if (!savedP || !sessionId) {
      navigate('/join');
      return;
    }
    const p = JSON.parse(savedP);
    setParticipant(p);

    socket.emit('session:join_room', {
      sessionId,
      participantId: p.id,
      role: 'STUDENT'
    });

    socket.on('session:started', (data) => {
      setSessionStatus('ACTIVE');
      setQuestionIndex(data.questionIndex);
      setTotalQuestions(data.totalQuestions);
      setCurrentQuestion(data.question);
      resetQuestionState(data.question);
    });

    socket.on('session:question_changed', (data) => {
      setQuestionIndex(data.questionIndex);
      setTotalQuestions(data.totalQuestions);
      setCurrentQuestion(data.question);
      resetQuestionState(data.question);
    });

    socket.on('student:answer_confirmed', (data) => {
      setIsAnswerSubmitted(true);
      setSubmissionFeedback(data);
      if (data.pointsEarned > 0) {
        setTotalScore(prev => prev + data.pointsEarned);
        confetti({ particleCount: 40, spread: 55, origin: { y: 0.7 } });
      }
    });

    socket.on('session:results_toggled', (data) => {
      setShowResults(data.show);
    });

    socket.on('session:correct_revealed', (data) => {
      setShowCorrect(data.show);
      setCorrectOptionIds(data.correctOptionIds || []);
    });

    socket.on('session:finished', (data) => {
      setSessionStatus('FINISHED');
      setFinalLeaderboard(data.leaderboard || []);
      confetti({ particleCount: 90, spread: 80, origin: { y: 0.5 } });
    });

    return () => {
      socket.off('session:started');
      socket.off('session:question_changed');
      socket.off('student:answer_confirmed');
      socket.off('session:results_toggled');
      socket.off('session:correct_revealed');
      socket.off('session:finished');
    };
  }, [sessionId, navigate, socket]);

  const resetQuestionState = (q: Question) => {
    setSelectedOptionId('');
    setSelectedOptionIds([]);
    setTextAnswer('');
    setIsAnswerSubmitted(false);
    setSubmissionFeedback(null);
    setShowResults(false);
    setShowCorrect(false);
    setCorrectOptionIds([]);
    setStartTime(Date.now());

    if (q.type === 'ORDERING') {
      setOrderingList(q.answerOptions.map(o => o.id));
    }
  };

  const handleSubmitAnswer = () => {
    if (!currentQuestion || !participant || isAnswerSubmitted) return;

    const responseTimeMs = Date.now() - startTime;

    socket.emit('student:submit_answer', {
      sessionId,
      participantId: participant.id,
      questionId: currentQuestion.id,
      selectedOptionId: selectedOptionId || undefined,
      textResponse: textAnswer || undefined,
      orderingResponse: currentQuestion.type === 'ORDERING' ? orderingList : undefined,
      responseTimeMs
    });
  };

  const moveOrderItem = (index: number, direction: 'up' | 'down') => {
    const newList = [...orderingList];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= newList.length) return;

    const temp = newList[index];
    newList[index] = newList[targetIdx];
    newList[targetIdx] = temp;
    setOrderingList(newList);
  };

  if (sessionStatus === 'LOBBY') {
    return (
      <div className="min-h-[calc(100vh-70px)] relative flex items-center justify-center p-4 overflow-hidden">
        <div className="absolute -top-24 -left-24 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative w-full max-w-sm rounded-3xl bg-slate-900/90 border border-slate-800/80 p-8 text-center shadow-2xl backdrop-blur-2xl">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 flex items-center justify-center mb-4 ring-4 ring-cyan-500/10 animate-pulse">
            <span className="material-icons text-3xl">hourglass_top</span>
          </div>
          <h2 className="font-heading font-extrabold text-2xl text-white tracking-tight">Sala de Espera</h2>
          <div className="my-5 p-3.5 rounded-2xl bg-slate-950 border border-slate-800/80 shadow-inner">
            <span className="text-[10px] text-slate-400 block font-mono uppercase tracking-wider">Estudiante Conectado:</span>
            <span className="text-base font-bold text-cyan-300 tracking-wide">{participant?.nickname}</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Mira la proyección del docente. La primera pregunta comenzará automáticamente en esta pantalla.
          </p>
        </div>
      </div>
    );
  }

  if (sessionStatus === 'FINISHED') {
    const myRank = finalLeaderboard.find(l => l.participantId === participant?.id);
    return (
      <div className="min-h-[calc(100vh-70px)] relative flex items-center justify-center p-4 overflow-hidden">
        <div className="absolute -top-24 -left-24 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative w-full max-w-md rounded-3xl bg-slate-900/90 border border-slate-800/80 p-8 text-center shadow-2xl backdrop-blur-2xl">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-tr from-amber-400 to-orange-500 flex items-center justify-center text-white shadow-xl shadow-amber-500/25 mb-4 ring-4 ring-amber-500/10">
            <span className="material-icons text-4xl">emoji_events</span>
          </div>
          <h2 className="font-heading font-extrabold text-2xl text-white tracking-tight">¡Evaluación Finalizada!</h2>
          <p className="text-xs text-slate-400 mt-1 mb-6">Tus resultados han sido almacenados de forma segura en PostgreSQL</p>

          <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800/80 mb-6 shadow-inner">
            <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">PUNTAJE TOTAL ACUMULADO</div>
            <div className="text-4xl font-extrabold font-mono text-amber-400 my-1.5">{totalScore} pts</div>
            {myRank && (
              <div className="text-xs text-cyan-300 font-semibold mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-500/30">
                <span className="material-icons text-xs text-cyan-400">military_tech</span>
                <span>Ranking #{myRank.rank} &bull; {myRank.correctAnswers} aciertos</span>
              </div>
            )}
          </div>

          <button
            onClick={() => navigate('/join')}
            className="w-full py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm transition-all border border-slate-700 shadow-md"
          >
            Volver al Inicio
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto p-4 sm:p-6 pb-20">
      <div className="flex items-center justify-between gap-2 mb-4 p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800/80 shadow-xl backdrop-blur-xl">
        <div className="flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-xl bg-cyan-500/15 text-cyan-400 flex items-center justify-center text-xs font-bold font-mono border border-cyan-500/30">
            {questionIndex + 1}/{totalQuestions}
          </span>
          <div className="text-left">
            <div className="text-xs font-bold text-white truncate max-w-[140px] sm:max-w-[220px]">
              {participant?.nickname}
            </div>
            <div className="text-[10px] text-amber-400 font-mono font-bold">{totalScore} pts</div>
          </div>
        </div>

        {currentQuestion && (
          <CountdownTimer
            initialSeconds={currentQuestion.timeLimitSec}
            isRunning={!isAnswerSubmitted}
            onTimeUp={() => {
              if (!isAnswerSubmitted) handleSubmitAnswer();
            }}
          />
        )}
      </div>

      {currentQuestion && (
        <div className="rounded-3xl bg-slate-900/90 border border-slate-800/80 p-5 sm:p-7 shadow-2xl backdrop-blur-xl mb-6">
          <span className="inline-block px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[10px] font-bold uppercase tracking-wider mb-2 font-mono">
            {currentQuestion.type.replace('_', ' ')} &bull; {currentQuestion.points} pts
          </span>
          <h2 className="font-heading font-extrabold text-lg sm:text-xl text-white mb-4 leading-snug tracking-tight">
            {currentQuestion.text}
          </h2>

          {currentQuestion.imageUrl && (
            <div className="rounded-2xl overflow-hidden mb-4 border border-slate-800 max-h-56">
              <img src={currentQuestion.imageUrl} alt="Pregunta" className="w-full h-full object-cover" />
            </div>
          )}

          <div className="space-y-3 mt-4">
            {(currentQuestion.type === 'SINGLE_CHOICE' || currentQuestion.type === 'TRUE_FALSE') && (
              currentQuestion.answerOptions.map((opt, idx) => {
                const letters = ['A', 'B', 'C', 'D'];
                const isSelected = selectedOptionId === opt.id;
                const isCorrect = showCorrect && correctOptionIds.includes(opt.id);

                return (
                  <button
                    key={opt.id}
                    disabled={isAnswerSubmitted}
                    onClick={() => setSelectedOptionId(opt.id)}
                    className={`w-full p-4 rounded-2xl border text-left font-medium text-sm flex items-center justify-between transition-all group ${
                      isCorrect
                        ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300 ring-2 ring-emerald-500'
                        : isSelected
                        ? 'bg-cyan-600/25 border-cyan-400 text-white ring-2 ring-cyan-500/50 shadow-md'
                        : 'bg-slate-950 border-slate-800/80 text-slate-200 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-7 h-7 rounded-lg font-mono font-bold text-xs flex items-center justify-center transition-colors ${
                        isSelected ? 'bg-cyan-500 text-white' : 'bg-slate-800 text-cyan-400'
                      }`}>
                        {letters[idx] || (idx + 1)}
                      </span>
                      <span>{opt.text}</span>
                    </div>
                    {isSelected && (
                      <span className="material-icons text-cyan-400 text-xl">check_circle</span>
                    )}
                  </button>
                );
              })
            )}

            {(currentQuestion.type === 'SHORT_ANSWER' || currentQuestion.type === 'WORD_CLOUD') && (
              <div>
                <input
                  type="text"
                  disabled={isAnswerSubmitted}
                  value={textAnswer}
                  onChange={(e) => setTextAnswer(e.target.value)}
                  placeholder="Escribe tu respuesta aquí..."
                  className="w-full p-4 rounded-2xl bg-slate-950 border border-slate-800/80 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 text-sm font-medium transition-all"
                />
              </div>
            )}

            {currentQuestion.type === 'LIKERT' && (
              <div className="flex justify-between gap-2">
                {[1, 2, 3, 4, 5].map((val) => {
                  const opt = currentQuestion.answerOptions[val - 1] || { id: `likert_${val}`, text: `${val}` };
                  const isSelected = selectedOptionId === opt.id;
                  return (
                    <button
                      key={val}
                      disabled={isAnswerSubmitted}
                      onClick={() => setSelectedOptionId(opt.id)}
                      className={`flex-1 py-4 rounded-2xl border font-bold text-center font-mono text-base transition-all ${
                        isSelected
                          ? 'bg-gradient-to-b from-cyan-500 to-blue-600 border-cyan-400 text-white shadow-lg shadow-cyan-500/30 scale-105'
                          : 'bg-slate-950 border-slate-800/80 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      {val}
                    </button>
                  );
                })}
              </div>
            )}

            {currentQuestion.type === 'ORDERING' && (
              <div className="space-y-2">
                {orderingList.map((optId, idx) => {
                  const opt = currentQuestion.answerOptions.find(o => o.id === optId);
                  if (!opt) return null;
                  return (
                    <div
                      key={opt.id}
                      className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800/80 flex items-center justify-between text-sm shadow-sm"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-md bg-slate-800 text-cyan-400 font-mono text-xs flex items-center justify-center font-bold">
                          {idx + 1}
                        </span>
                        <span>{opt.text}</span>
                      </div>
                      {!isAnswerSubmitted && (
                        <div className="flex gap-1">
                          <button
                            onClick={() => moveOrderItem(idx, 'up')}
                            disabled={idx === 0}
                            className="p-1 rounded-lg bg-slate-800 text-slate-300 disabled:opacity-30 hover:bg-slate-700 transition-colors"
                          >
                            <span className="material-icons text-base">arrow_upward</span>
                          </button>
                          <button
                            onClick={() => moveOrderItem(idx, 'down')}
                            disabled={idx === orderingList.length - 1}
                            className="p-1 rounded-lg bg-slate-800 text-slate-300 disabled:opacity-30 hover:bg-slate-700 transition-colors"
                          >
                            <span className="material-icons text-base">arrow_downward</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {!isAnswerSubmitted && (
            <button
              onClick={handleSubmitAnswer}
              disabled={
                (!selectedOptionId && !textAnswer && currentQuestion.type !== 'ORDERING')
              }
              className="w-full mt-6 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:via-blue-500 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-cyan-500/25 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <span className="material-icons text-lg">send</span>
              <span>Confirmar y Enviar Respuesta</span>
            </button>
          )}

          {isAnswerSubmitted && (
            <div className="mt-6 p-4 rounded-2xl bg-cyan-950/40 border border-cyan-500/40 text-center">
              <span className="material-icons text-cyan-400 text-3xl mb-1">done_all</span>
              <div className="font-bold text-white text-sm">¡Respuesta Registrada con Éxito!</div>
              <p className="text-xs text-slate-400 mt-0.5">
                {submissionFeedback?.pointsEarned > 0
                  ? `+${submissionFeedback.pointsEarned} puntos obtenidos`
                  : 'Esperando a que el docente revele los resultados'}
              </p>
              {submissionFeedback?.explanation && showCorrect && (
                <div className="mt-3 p-3 rounded-xl bg-slate-900 border border-slate-800 text-left text-xs text-slate-300">
                  <span className="text-cyan-400 font-bold block mb-1 flex items-center gap-1">
                    <span className="material-icons text-xs">info</span>
                    Explicación Docente:
                  </span>
                  {submissionFeedback.explanation}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
