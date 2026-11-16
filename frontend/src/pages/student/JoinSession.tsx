import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { API } from '../../services/api';
import Swal from 'sweetalert2';

export const JoinSession: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const nameInputRef = useRef<HTMLInputElement>(null);

  const getQueryPin = () => {
    const raw = searchParams.get('pin') || searchParams.get('pinCode') || searchParams.get('pincode') || '';
    return raw.replace(/\D/g, '').slice(0, 6);
  };

  const [pinCode, setPinCode] = useState(getQueryPin());
  const [nickname, setNickname] = useState('');
  const [studentIdentifier, setStudentIdentifier] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('🎓');
  const [loading, setLoading] = useState(false);
  const [isLockedByQR, setIsLockedByQR] = useState(Boolean(getQueryPin()));

  const avatars = ['🎓', '💻', '🚀', '⚡', '🦊', '🐯', '🦁', '🦉'];

  useEffect(() => {
    const detected = getQueryPin();
    if (detected) {
      setPinCode(detected);
      setIsLockedByQR(true);
      setTimeout(() => {
        nameInputRef.current?.focus();
      }, 250);
    }
  }, [searchParams]);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPin = pinCode.trim();
    const cleanName = nickname.trim();

    if (cleanPin.length < 6) {
      Swal.fire({
        icon: 'warning',
        title: 'PIN Incompleto',
        text: 'El PIN de la sesión debe tener exactamente 6 dígitos numéricos.',
        background: '#090d16',
        color: '#f8fafc',
        confirmButtonColor: '#0ea5e9'
      });
      return;
    }

    if (!cleanName) {
      Swal.fire({
        icon: 'warning',
        title: 'Nombre Requerido',
        text: 'Por favor ingresa tu nombre completo para identificarte en la sesión.',
        background: '#090d16',
        color: '#f8fafc',
        confirmButtonColor: '#0ea5e9'
      });
      return;
    }

    setLoading(true);
    try {
      const fullNickname = `${selectedAvatar} ${cleanName}`;
      const res = await API.joinSession({
        pinCode: cleanPin,
        nickname: fullNickname,
        studentIdentifier: studentIdentifier.trim() || undefined
      });

      if (res && res.success && res.participant) {
        sessionStorage.setItem('aulalive_participant', JSON.stringify(res.participant));
        sessionStorage.setItem('aulalive_session', JSON.stringify(res.session));

        Swal.fire({
          icon: 'success',
          title: '¡Estudiante Registrado!',
          text: `Hola ${cleanName}, tus respuestas se guardarán en la base de datos de la sesión.`,
          timer: 1600,
          showConfirmButton: false,
          background: '#090d16',
          color: '#f8fafc'
        });

        navigate(`/live/${res.session.id}`);
      } else {
        throw new Error(res?.message || 'No fue posible registrarse en la sesión.');
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Verifica el PIN proyectado por tu docente o que el servidor backend esté en ejecución.';
      Swal.fire({
        icon: 'error',
        title: 'No pudimos conectarte',
        text: errorMessage,
        background: '#090d16',
        color: '#f8fafc',
        confirmButtonColor: '#0ea5e9'
      });
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = pinCode.length === 6 && nickname.trim().length > 0;

  return (
    <div className="min-h-[calc(100vh-70px)] relative flex items-center justify-center p-4 sm:p-6 overflow-hidden">
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-md rounded-3xl bg-slate-900/90 border border-slate-800/80 p-6 sm:p-8 shadow-2xl shadow-black/50 backdrop-blur-2xl transition-all">
        
        {isLockedByQR ? (
          <div className="mb-6 p-3.5 rounded-2xl bg-gradient-to-r from-emerald-500/15 to-teal-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center justify-between shadow-inner">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span>QR Verificado</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono bg-emerald-950/60 text-emerald-400 px-2.5 py-0.5 rounded-lg border border-emerald-500/30 tracking-widest text-sm font-bold">
                PIN {pinCode}
              </span>
              <button
                type="button"
                onClick={() => setIsLockedByQR(false)}
                className="text-[11px] text-emerald-400/80 hover:text-white underline font-normal"
              >
                Editar
              </button>
            </div>
          </div>
        ) : (
          <div className="relative mx-auto w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-xl shadow-cyan-500/25 mb-5 ring-4 ring-cyan-500/10">
            <span className="material-icons text-3xl">sports_esports</span>
          </div>
        )}

        <div className="text-center mb-6">
          <h2 className="font-heading font-extrabold text-2xl sm:text-3xl text-white tracking-tight">
            Ingreso Estudiantil
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1.5 leading-relaxed">
            Identifícate para sincronizar tus respuestas en tiempo real con el panel del docente.
          </p>
        </div>

        <form onSubmit={handleJoin} className="space-y-4 text-left">
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono">
                PIN de la Sesión
              </label>
              {isLockedByQR ? (
                <span className="text-[11px] font-medium text-emerald-400 flex items-center gap-1">
                  <span className="material-icons text-xs">check_circle</span> Auto-conectado
                </span>
              ) : (
                <span className="text-[11px] text-slate-500 font-mono">6 dígitos</span>
              )}
            </div>
            <div className="relative">
              <input
                type="text"
                inputMode="numeric"
                value={pinCode}
                onChange={(e) => setPinCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                maxLength={6}
                required
                readOnly={isLockedByQR}
                className={`w-full text-center font-mono font-extrabold text-2xl sm:text-3xl tracking-widest py-3 px-4 rounded-2xl border transition-all shadow-inner focus:outline-none ${
                  isLockedByQR
                    ? 'bg-slate-950/70 border-emerald-500/30 text-emerald-300'
                    : 'bg-slate-950 border-slate-800 text-amber-400 placeholder-slate-700 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20'
                }`}
              />
              <span className="absolute left-4 top-1/2 -translate-y-1/2 material-icons text-slate-600 text-xl pointer-events-none">
                vpn_key
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Avatar de Participación
            </label>
            <div className="grid grid-cols-8 gap-1.5 p-2 rounded-2xl bg-slate-950 border border-slate-800/80">
              {avatars.map((av) => {
                const isSelected = selectedAvatar === av;
                return (
                  <button
                    type="button"
                    key={av}
                    onClick={() => setSelectedAvatar(av)}
                    className={`h-9 rounded-xl text-lg flex items-center justify-center transition-all ${
                      isSelected
                        ? 'bg-gradient-to-b from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/30 scale-105 ring-2 ring-cyan-400'
                        : 'hover:bg-slate-800/70 opacity-70 hover:opacity-100 hover:scale-105'
                    }`}
                  >
                    {av}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Nombre y Apellido <span className="text-cyan-400 font-bold">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 material-icons text-slate-500 text-lg pointer-events-none">
                account_circle
              </span>
              <input
                ref={nameInputRef}
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="Ej: Camila Soto Morales"
                required
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 text-sm font-medium transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex justify-between">
              <span>RUT o Matrícula Institucional</span>
              <span className="text-[11px] text-slate-500">Opcional</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 material-icons text-slate-500 text-lg pointer-events-none">
                badge
              </span>
              <input
                type="text"
                value={studentIdentifier}
                onChange={(e) => setStudentIdentifier(e.target.value)}
                placeholder="Ej: 20.123.456-7"
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 text-sm font-mono transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !isFormValid}
            className="w-full mt-3 py-3.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:via-blue-500 hover:to-indigo-500 active:scale-[0.99] text-white font-bold text-sm shadow-lg shadow-cyan-500/25 transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2 group cursor-pointer"
          >
            {loading ? (
              <span className="inline-block w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span className="material-icons text-lg group-hover:scale-110 transition-transform">
                  rocket_launch
                </span>
                <span>Guardar y Entrar a Responder</span>
              </>
            )}
          </button>

          {!isFormValid && (
            <p className="text-[11px] text-slate-500 text-center">
              {pinCode.length < 6 ? 'Ingresa los 6 dígitos del PIN' : 'Ingresa tu nombre y apellido para continuar'}
            </p>
          )}
        </form>

        <div className="mt-5 pt-4 border-t border-slate-800/80 flex items-center justify-center gap-2 text-[11px] text-slate-400 font-medium">
          <span className="material-icons text-emerald-400 text-sm">security</span>
          <span>Registro en tiempo real sincronizado con PostgreSQL</span>
        </div>
      </div>
    </div>
  );
};
