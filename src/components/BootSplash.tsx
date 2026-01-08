import React, { useEffect, useMemo, useState } from "react";

type Props = {
  brand?: string; // ex: "ARTIST"
  brandAccent?: string; // ex: "WORLD"
  subtitle?: string; // ex: "INICIALIZANDO SISTEMA"
  stage?: string; // ex: "DATABASE INITIALIZATION"
};

export default function BootSplash({
  brand = "ARTIST",
  brandAccent = "WORLD",
  subtitle = "INICIALIZANDO SISTEMA",
  stage = "DATABASE INITIALIZATION",
}: Props) {
  const [t, setT] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setT((x) => x + 1), 40);
    return () => clearInterval(id);
  }, []);

  // barra “varrendo”
  const scan = useMemo(() => {
    const p = (t % 240) / 240; // 0..1
    const width = 260; // px
    const x = Math.floor(p * width);
    return { left: `${x}px` };
  }, [t]);

  return (
    <div className="min-h-screen w-full bg-black flex items-center justify-center relative overflow-hidden">
      {/* subtle vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.06),transparent_55%)] opacity-40" />
      <div className="absolute inset-0 bg-gradient-to-b from-black via-black to-black opacity-80" />

      {/* tiny floating dot (top-left-ish like reference) */}
      <div className="absolute top-[22%] left-[38%] h-[6px] w-[6px] rounded-full bg-yellow-400/90 shadow-[0_0_18px_rgba(250,204,21,0.55)]" />

      {/* center */}
      <div className="relative z-10 flex flex-col items-center">
        {/* line + scan */}
        <div className="relative w-[320px] h-[1px] bg-white/10 mb-10">
          <div
            className="absolute top-0 h-[1px] w-[84px] bg-yellow-400/90 shadow-[0_0_18px_rgba(250,204,21,0.55)]"
            style={scan}
          />
        </div>

        {/* brand */}
        <div className="flex items-baseline gap-2">
          <div className="text-white font-extrabold tracking-[0.20em] text-3xl sm:text-4xl">
            {brand}
          </div>

          {/* yellow dot */}
          <div className="h-[8px] w-[8px] rounded-full bg-yellow-400 shadow-[0_0_18px_rgba(250,204,21,0.65)] translate-y-[-2px]" />

          <div className="text-white font-extrabold tracking-[0.20em] text-3xl sm:text-4xl">
            {brandAccent}
          </div>
        </div>

        {/* subtitle */}
        <div className="mt-4 text-white/55 text-[10px] sm:text-[11px] tracking-[0.55em] uppercase">
          {subtitle}
        </div>

        {/* stage */}
        <div className="mt-2 text-white/35 text-[9px] sm:text-[10px] tracking-[0.45em] uppercase">
          {stage}
        </div>
      </div>
    </div>
  );
}
