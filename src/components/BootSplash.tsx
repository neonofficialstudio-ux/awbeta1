import React from 'react';

type Props = {
  message?: string;
  hint?: string;
};

export default function BootSplash({ message, hint }: Props) {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-black">
      <div className="w-full max-w-md px-6">
        <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl p-6">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-yellow-500/30 to-purple-500/20 border border-white/10 flex items-center justify-center">
              <span className="text-xl font-black text-white">AW</span>
            </div>
            <div>
              <div className="text-white text-lg font-semibold">Artist World</div>
              <div className="text-white/60 text-sm">Inicializando sessão</div>
            </div>
          </div>

          <div className="mt-6 text-white text-sm font-medium">
            {message || 'Carregando…'}
          </div>
          <div className="mt-1 text-white/50 text-xs">
            {hint || 'Verificando autenticação e preparando seu painel.'}
          </div>

          <div className="mt-5 h-2 w-full rounded-full bg-white/10 overflow-hidden">
            <div className="h-full w-1/2 rounded-full bg-white/70 animate-pulse" />
          </div>

          <div className="mt-5 text-white/40 text-[11px] leading-relaxed">
            Se demorar muito, você será redirecionado automaticamente para fazer login novamente.
          </div>
        </div>
      </div>
    </div>
  );
}
