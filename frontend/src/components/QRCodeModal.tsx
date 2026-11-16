import React, { useEffect, useRef } from 'react';
import QRCode from 'qrcode';

interface QRCodeModalProps {
  pinCode: string;
  isOpen: boolean;
  onClose: () => void;
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({ pinCode, isOpen, onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const joinUrl = `${window.location.origin}/join?pin=${pinCode}`;

  useEffect(() => {
    if (isOpen && canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, joinUrl, {
        width: 260,
        margin: 2,
        color: {
          dark: '#090d16',
          light: '#ffffff'
        }
      });
    }
  }, [isOpen, joinUrl]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-700/80 p-6 text-center shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <span className="material-icons text-xl">close</span>
        </button>

        <div className="w-12 h-12 mx-auto rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center mb-3">
          <span className="material-icons text-2xl">qr_code_2</span>
        </div>

        <h3 className="font-heading font-bold text-xl text-white">Escanea para Conectarte</h3>
        <p className="text-xs text-slate-400 mt-1 mb-4">
          Apunta la cámara de tu teléfono móvil o tablet al código QR para responder en vivo
        </p>

        {/* QR Code Canvas */}
        <div className="inline-block p-3 rounded-2xl bg-white shadow-inner mb-4">
          <canvas ref={canvasRef} className="mx-auto rounded-lg"></canvas>
        </div>

        {/* PIN Capsule */}
        <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700 mb-3">
          <span className="text-[11px] font-mono text-slate-400 uppercase tracking-widest block mb-0.5">PIN DE ACCESO</span>
          <span className="font-mono font-bold text-3xl tracking-widest text-amber-400">{pinCode}</span>
        </div>

        <div className="text-[11px] text-slate-400 break-all font-mono">
          Enlace directo: <a href={joinUrl} target="_blank" rel="noreferrer" className="text-cyan-400 underline">{joinUrl}</a>
        </div>
      </div>
    </div>
  );
};

