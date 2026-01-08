import React, { useEffect, useMemo, useState } from "react";

type Props = {
  brand?: string; // "ARTIST"
  brandAccent?: string; // "WORLD"
  subtitle?: string; // "INICIALIZANDO"
  stage?: string; // dinâmico
};

export default function BootSplash({
  brand = "ARTIST",
  brandAccent = "WORLD",
  subtitle = "INICIALIZANDO",
  stage = "BOOT",
}: Props) {
  const [t, setT] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setT((x) => x + 1), 38);
    return () => clearInterval(id);
  }, []);

  // scan “vai e volta” (mais bonito que reset)
  const scan = useMemo(() => {
    const width = 340; // track px
    const period = 260;
    const p = (t % period) / period; // 0..1
    const pingPong = p < 0.5 ? p * 2 : (1 - p) * 2; // 0..1..0
    const x = Math.floor(pingPong * (width - 88)); // 88 = bar width
    return { left: `${x}px` };
  }, [t]);

  const stageDots = useMemo(() => ".".repeat((t % 4) as 0 | 1 | 2 | 3), [t]);

  return (
    <div className="min-h-screen w-full bg-black flex items-center justify-center relative overflow-hidden">
      {/* vignette + subtle grid */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.08),transparent_58%)] opacity-35" />
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black via-black to-black opacity-85" />
      </div>

      {/* accent dot (reference-like) */}
      <div className="absolute top-[22%] left-[38%] h-[6px] w-[6px] rounded-full bg-yellow-400/95 shadow-[0_0_18px_rgba(250,204,21,0.55)]" />

      {/* center */}
      <div className="relative z-10 flex flex-col items-center">
        {/* scan track */}
        <div className="relative w-[360px] h-[1px] bg-white/12 mb-10">
          <div
            className="absolute top-0 h-[1px] w-[88px] bg-yellow-400/95 shadow-[0_0_22px_rgba(250,204,21,0.55)]"
            style={scan}
          />
        </div>

        {/* brand */}
        <div className="flex items-baseline gap-2 select-none">
          <div className="text-white font-extrabold tracking-[0.22em] text-3xl sm:text-[42px] leading-none">
            {brand}
          </div>

          <div className="h-[9px] w-[9px] rounded-full bg-yellow-400 shadow-[0_0_22px_rgba(250,204,21,0.65)] translate-y-[-4px]" />

          <div className="text-white font-extrabold tracking-[0.22em] text-3xl sm:text-[42px] leading-none">
            {brandAccent}
          </div>
        </div>

        {/* subtitle */}
        <div className="mt-5 text-white/55 text-[10px] sm:text-[11px] tracking-[0.58em] uppercase">
          {subtitle}
        </div>

        {/* dynamic stage */}
        <div className="mt-2 text-white/35 text-[9px] sm:text-[10px] tracking-[0.48em] uppercase">
          {stage}
          <span className="text-white/25">{stageDots}</span>
        </div>

        {/* micro hint line */}
        <div className="mt-10 w-[220px] h-[1px] bg-white/10" />
      </div>
    </div>
  );
}
