import React, { useEffect, useMemo, useState } from "react";

type Props = {
  title?: string;
  message?: string;
  hint?: string;
  // Opcional: mostrar etapa/percentual (se você quiser usar depois)
  progressLabel?: string;
  progress?: number; // 0..100
};

export default function BootSplash({
  title = "ARTIST WORLD",
  message = "Inicializando núcleo…",
  hint = "Verificando sessão e sincronizando dados essenciais.",
  progressLabel = "BOOT SEQUENCE",
  progress,
}: Props) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => (t + 1) % 1000), 450);
    return () => clearInterval(id);
  }, []);

  const dots = useMemo(() => ".".repeat((tick % 4) as 0 | 1 | 2 | 3), [tick]);
  const pct =
    typeof progress === "number" ? Math.max(0, Math.min(100, progress)) : null;

  return (
    <div className="min-h-screen w-full bg-[#05060b] text-white relative overflow-hidden">
      {/* Background: grid + vignette */}
      <div className="absolute inset-0 opacity-[0.12] pointer-events-none">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)",
            backgroundSize: "46px 46px",
          }}
        />
      </div>
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-40 -left-40 w-[520px] h-[520px] rounded-full bg-purple-500/20 blur-[90px]" />
        <div className="absolute -bottom-48 -right-48 w-[560px] h-[560px] rounded-full bg-yellow-500/18 blur-[100px]" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/45 to-black/75" />
      </div>

      {/* Center card */}
      <div className="relative z-10 min-h-screen flex items-center justify-center px-6">
        <div className="w-full max-w-[560px]">
          <div className="relative rounded-[28px] border border-white/10 bg-white/[0.06] backdrop-blur-2xl shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_30px_90px_rgba(0,0,0,0.65)] overflow-hidden">
            {/* Top neon bar */}
            <div className="h-[3px] w-full bg-gradient-to-r from-purple-500/70 via-yellow-400/60 to-purple-500/70" />

            {/* Corner accents */}
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute -top-10 -left-10 w-40 h-40 border border-white/10 rounded-[32px] rotate-12" />
              <div className="absolute -bottom-10 -right-10 w-40 h-40 border border-white/10 rounded-[32px] -rotate-12" />
            </div>

            <div className="p-7 sm:p-8">
              {/* Header */}
              <div className="flex items-center gap-4">
                <div className="relative h-14 w-14 rounded-2xl bg-gradient-to-br from-yellow-400/25 to-purple-500/20 border border-white/10 overflow-hidden">
                  <div className="absolute inset-0 opacity-70">
                    <div className="absolute -top-10 left-0 w-20 h-20 bg-yellow-400/25 blur-2xl" />
                    <div className="absolute bottom-0 -right-8 w-24 h-24 bg-purple-500/25 blur-2xl" />
                  </div>

                  {/* Minimal "AW" glyph */}
                  <div className="relative h-full w-full flex items-center justify-center">
                    <div className="text-lg font-black tracking-tight">AW</div>
                  </div>

                  {/* scan line */}
                  <div className="absolute inset-x-0 top-0 h-6 bg-gradient-to-b from-white/10 to-transparent animate-pulse" />
                </div>

                <div className="flex-1">
                  <div className="text-[11px] tracking-[0.25em] text-white/55">
                    {progressLabel}
                  </div>
                  <div className="text-xl sm:text-2xl font-extrabold tracking-tight">
                    {title}
                  </div>
                  <div className="mt-1 text-white/50 text-xs">
                    Runtime: <span className="text-white/70">PRODUCTION</span> •
                    Node: <span className="text-white/70">ONLINE</span>
                  </div>
                </div>

                {/* Spinner */}
                <div className="shrink-0">
                  <div className="relative h-10 w-10">
                    <div className="absolute inset-0 rounded-full border border-white/10" />
                    <div className="absolute inset-0 rounded-full border-t border-purple-400/70 border-r border-yellow-300/50 animate-spin" />
                    <div className="absolute inset-[7px] rounded-full border border-white/10" />
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="mt-7">
                <div className="text-sm sm:text-base font-semibold">
                  {message}
                  <span className="text-white/60">{dots}</span>
                </div>
                <div className="mt-1.5 text-white/55 text-xs sm:text-sm leading-relaxed">
                  {hint}
                </div>

                {/* Progress */}
                <div className="mt-6">
                  <div className="flex items-center justify-between text-[11px] text-white/45">
                    <span>SYSTEM LOAD</span>
                    <span className="text-white/60">
                      {pct === null ? "AUTO" : `${pct}%`}
                    </span>
                  </div>

                  <div className="mt-2 h-2.5 rounded-full bg-white/8 border border-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-purple-500/80 via-yellow-400/70 to-purple-500/80 transition-all duration-300"
                      style={{ width: pct === null ? "55%" : `${pct}%` }}
                    />
                  </div>

                  {/* subtle pulse glow */}
                  <div className="mt-3 flex items-center gap-2 text-[11px] text-white/45">
                    <span className="inline-flex h-1.5 w-1.5 rounded-full bg-green-400/80 shadow-[0_0_14px_rgba(74,222,128,0.45)]" />
                    <span>Conexão segura estabelecida</span>
                    <span className="ml-auto text-white/35">v1.0</span>
                  </div>
                </div>

                {/* Footer hint */}
                <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                  <div className="text-[11px] text-white/55 leading-relaxed">
                    Se demorar muito, vamos te redirecionar automaticamente para
                    login.
                    <span className="text-white/35"> (auto-recovery ativo)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom noise */}
            <div className="pointer-events-none h-10 w-full bg-gradient-to-r from-transparent via-white/5 to-transparent" />
          </div>
        </div>
      </div>
    </div>
  );
}
