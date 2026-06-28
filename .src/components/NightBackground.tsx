export function NightBackground() {
  // Quiet night sky — only subtle stars, no bright glows.
  const stars = Array.from({ length: 80 }).map((_, i) => {
    const seed = i * 9301 + 49297;
    const r = (n: number) => (Math.sin(n) * 10000) % 1;
    const top = (Math.abs(r(seed)) * 100).toFixed(2);
    const left = (Math.abs(r(seed * 1.7)) * 100).toFixed(2);
    const delay = (Math.abs(r(seed * 2.3)) * 5).toFixed(2);
    const size = +(0.5 + Math.abs(r(seed * 3.1)) * 1.5).toFixed(2);
    const opacity = (0.15 + Math.abs(r(seed * 4.7)) * 0.55).toFixed(2);
    return { top, left, delay, size, opacity, id: i };
  });

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* Very faint deep-sky haze for depth — no bright glows */}
      <div className="absolute -top-60 -left-60 h-[700px] w-[700px] rounded-full bg-[hsl(220_30%_14%/0.35)] blur-3xl" />
      <div className="absolute -top-40 right-[-15%] h-[800px] w-[800px] rounded-full bg-[hsl(220_30%_14%/0.25)] blur-3xl" />
      <div className="absolute bottom-[-20%] left-[5%] h-[600px] w-[600px] rounded-full bg-[hsl(220_30%_14%/0.30)] blur-3xl" />

      {/* Stars — soft white, varied opacity */}
      {stars.map((s) => (
        <span
          key={s.id}
          style={{
            top: `${s.top}%`,
            left: `${s.left}%`,
            width: `${s.size}px`,
            height: `${s.size}px`,
            opacity: s.opacity,
            animationDelay: `${s.delay}s`,
          }}
          className="absolute rounded-full bg-white/70"
        >
          <span
            className="absolute inset-0 rounded-full bg-white/70"
            style={{ animation: "twinkle 4s ease-in-out infinite", animationDelay: `${s.delay}s` }}
          />
        </span>
      ))}

      {/* Bottom vignette for comfortable night reading */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[hsl(240_45%_6%/0.25)] to-[hsl(240_45%_4%)]" />
    </div>
  );
}
