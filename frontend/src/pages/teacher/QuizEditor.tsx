import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { API } from '../../services/api';
import Swal from 'sweetalert2';

interface Option {
  id?: string;
  orderNum: number;
  text: string;
  isCorrect: boolean;
  weight?: number;
}

interface Question {
  id?: string;
  orderNum: number;
  text: string;
  type: string;
  points: number;
  timeLimitSec: number;
  explanation?: string;
  answerOptions: Option[];
}

export const QuizEditor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [timeLimitSec, setTimeLimitSec] = useState(25);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [allowInstantFeedback, setAllowInstantFeedback] = useState(true);

  const [questions, setQuestions] = useState<Question[]>([
    {
      orderNum: 1,
      text: '¿Cuál método de la clase String elimina espacios en blanco al inicio y al final?',
      type: 'SINGLE_CHOICE',
      points: 100,
      timeLimitSec: 20,
      explanation: 'trim() elimina espacios iniciales y finales en Java.',
      answerOptions: [
        { orderNum: 1, text: 'String.stripAll()', isCorrect: false },
        { orderNum: 2, text: 'String.trim()', isCorrect: true },
        { orderNum: 3, text: 'String.clean()', isCorrect: false },
        { orderNum: 4, text: 'String.cut()', isCorrect: false }
      ]
    }
  ]);

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isEditing && id) {
      API.getQuizById(id).then(res => {
        if (res.success && res.quiz) {
          setTitle(res.quiz.title);
          setDescription(res.quiz.description || '');
          setTimeLimitSec(res.quiz.timeLimitSec);
          setIsAnonymous(res.quiz.isAnonymous);
          setAllowInstantFeedback(res.quiz.allowInstantFeedback);
          if (res.quiz.questions && res.quiz.questions.length > 0) {
            setQuestions(res.quiz.questions);
          }
        }
      });
    }
  }, [id, isEditing]);

  const addQuestion = (type = 'SINGLE_CHOICE') => {
    const newQ: Question = {
      orderNum: questions.length + 1,
      text: 'Nueva Pregunta Interactiva',
      type,
      points: 100,
      timeLimitSec: 20,
      explanation: '',
      answerOptions: type === 'TRUE_FALSE' ? [
        { orderNum: 1, text: 'Verdadero', isCorrect: true },
        { orderNum: 2, text: 'Falso', isCorrect: false }
      ] : type === 'SHORT_ANSWER' ? [
        { orderNum: 1, text: 'Respuesta esperada', isCorrect: true }
      ] : [
        { orderNum: 1, text: 'Opción 1', isCorrect: true },
        { orderNum: 2, text: 'Opción 2', isCorrect: false },
        { orderNum: 3, text: 'Opción 3', isCorrect: false },
        { orderNum: 4, text: 'Opción 4', isCorrect: false }
      ]
    };
    setQuestions([...questions, newQ]);
  };

  const removeQuestion = (idx: number) => {
    if (questions.length <= 1) return;
    setQuestions(questions.filter((_, i) => i !== idx));
  };

  const updateQuestion = (idx: number, field: keyof Question, value: any) => {
    const updated = [...questions];
    updated[idx] = { ...updated[idx], [field]: value };
    setQuestions(updated);
  };

  const updateOption = (qIdx: number, optIdx: number, field: keyof Option, value: any) => {
    const updated = [...questions];
    const opts = [...updated[qIdx].answerOptions];
    opts[optIdx] = { ...opts[optIdx], [field]: value };
    updated[qIdx].answerOptions = opts;
    setQuestions(updated);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;
    setLoading(true);

    try {
      const payload = {
        title,
        description,
        timeLimitSec,
        isAnonymous,
        allowInstantFeedback,
        isPublished: true,
        questions
      };

      if (isEditing && id) {
        await API.updateQuiz(id, payload);
      } else {
        await API.createQuiz(payload);
      }

      Swal.fire({
        icon: 'success',
        title: isEditing ? 'Cuestionario Actualizado' : 'Cuestionario Creado',
        timer: 1500,
        showConfirmButton: false,
        background: '#0f172a',
        color: '#f8fafc'
      });

      navigate('/teacher');
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'Error al guardar',
        text: err.message,
        background: '#0f172a',
        color: '#f8fafc'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-6 max-w-4xl mx-auto pb-16">
      <div className="flex items-center justify-between gap-4 p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl">
        <div>
          <h1 className="font-heading font-bold text-2xl text-white">
            {isEditing ? 'Editar Cuestionario' : 'Crear Nuevo Cuestionario'}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Personaliza tipos de preguntas, opciones, temporizador y retroalimentación inmediata
          </p>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-3 rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-sm shadow-lg shadow-cyan-600/30 transition-all"
        >
          {loading ? 'Guardando...' : 'Guardar Cuestionario'}
        </button>
      </div>

      {/* General Settings */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
        <h2 className="font-heading font-bold text-base text-white">Configuración General</h2>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">Título del Cuestionario</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ej: Evaluación Unidad II: Persistencia y JUnit"
            required
            className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">Descripción (Opcional)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Objetivos pedagógicos o instrucciones de la actividad"
            rows={2}
            className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer">
            <input
              type="checkbox"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
              className="w-4 h-4 rounded text-cyan-600 bg-slate-900 border-slate-700"
            />
            <div>
              <div className="text-xs font-semibold text-white">Participación Anónima</div>
              <div className="text-[11px] text-slate-400">Los estudiantes no requieren nombre real</div>
            </div>
          </label>

          <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer">
            <input
              type="checkbox"
              checked={allowInstantFeedback}
              onChange={(e) => setAllowInstantFeedback(e.target.checked)}
              className="w-4 h-4 rounded text-cyan-600 bg-slate-900 border-slate-700"
            />
            <div>
              <div className="text-xs font-semibold text-white">Retroalimentación Instantánea</div>
              <div className="text-[11px] text-slate-400">Informa acierto/fallo en el teléfono del alumno</div>
            </div>
          </label>
        </div>
      </div>

      {/* Questions Builder */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-heading font-bold text-lg text-white">
            Preguntas ({questions.length})
          </h2>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => addQuestion('SINGLE_CHOICE')}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 text-xs font-semibold flex items-center gap-1"
            >
              <span className="material-icons text-base">add</span> Selección Única
            </button>
            <button
              type="button"
              onClick={() => addQuestion('TRUE_FALSE')}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs font-semibold flex items-center gap-1"
            >
              <span className="material-icons text-base">add</span> V/F
            </button>
            <button
              type="button"
              onClick={() => addQuestion('WORD_CLOUD')}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-purple-400 text-xs font-semibold flex items-center gap-1"
            >
              <span className="material-icons text-base">add</span> Nube
            </button>
          </div>
        </div>

        {questions.map((q, qIdx) => (
          <div key={qIdx} className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-3 relative group">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold font-mono text-cyan-400">
                PREGUNTA #{qIdx + 1}
              </span>
              <div className="flex items-center gap-2">
                <select
                  value={q.type}
                  onChange={(e) => updateQuestion(qIdx, 'type', e.target.value)}
                  className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 font-mono"
                >
                  <option value="SINGLE_CHOICE">Selección Única</option>
                  <option value="MULTIPLE_CHOICE">Selección Múltiple</option>
                  <option value="TRUE_FALSE">Verdadero o Falso</option>
                  <option value="SHORT_ANSWER">Respuesta Corta</option>
                  <option value="WORD_CLOUD">Nube de Palabras</option>
                  <option value="LIKERT">Escala Likert</option>
                  <option value="POLL">Encuesta de Opinión</option>
                  <option value="ORDERING">Ordenamiento</option>
                </select>

                <div className="flex items-center gap-1 text-xs text-slate-400 font-mono">
                  <span>⏱</span>
                  <input
                    type="number"
                    value={q.timeLimitSec}
                    onChange={(e) => updateQuestion(qIdx, 'timeLimitSec', Number(e.target.value))}
                    className="w-14 px-1.5 py-1 rounded bg-slate-950 border border-slate-800 text-center"
                    min={5}
                    max={120}
                  />
                  <span>seg</span>
                </div>

                <button
                  type="button"
                  onClick={() => removeQuestion(qIdx)}
                  className="p-1 text-slate-500 hover:text-red-400"
                  title="Eliminar pregunta"
                >
                  <span className="material-icons text-base">delete</span>
                </button>
              </div>
            </div>

            <div>
              <input
                type="text"
                value={q.text}
                onChange={(e) => updateQuestion(qIdx, 'text', e.target.value)}
                placeholder="Escribe el enunciado de la pregunta aquí..."
                required
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-semibold text-sm"
              />
            </div>

            {/* Answer Options */}
            <div className="space-y-2 pt-2">
              <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">
                Alternativas y Respuestas Correctas:
              </span>
              {q.answerOptions.map((opt, optIdx) => (
                <div key={optIdx} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={opt.isCorrect}
                    onChange={(e) => updateOption(qIdx, optIdx, 'isCorrect', e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-500 bg-slate-900 border-slate-700"
                    title="Marcar como respuesta correcta"
                  />
                  <input
                    type="text"
                    value={opt.text}
                    onChange={(e) => updateOption(qIdx, optIdx, 'text', e.target.value)}
                    placeholder={`Alternativa ${optIdx + 1}`}
                    className={`flex-1 px-3 py-1.5 rounded-lg bg-slate-950 border text-xs text-white ${
                      opt.isCorrect ? 'border-emerald-500/60 ring-1 ring-emerald-500/30' : 'border-slate-800'
                    }`}
                  />
                </div>
              ))}
            </div>

            <div>
              <input
                type="text"
                value={q.explanation || ''}
                onChange={(e) => updateQuestion(qIdx, 'explanation', e.target.value)}
                placeholder="Explicación pedagógica para retroalimentar al alumno..."
                className="w-full px-3 py-1.5 rounded-lg bg-slate-950/60 border border-slate-800/80 text-xs text-slate-400"
              />
            </div>
          </div>
        ))}
      </div>
    </form>
  );
};

