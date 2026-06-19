"use client";

const WIDTH = 960;
const HEIGHT = 480;

const CUSTOMERS = [
  { name: "Dubai", lon: 55.27, lat: 25.2 },
  { name: "Canada", lon: -106.35, lat: 56.13 },
  { name: "UK", lon: -1.5, lat: 52.5 },
  { name: "Cyprus", lon: 33.43, lat: 35.13 },
  { name: "Spain", lon: -3.7, lat: 40.4 },
  { name: "Germany", lon: 10.45, lat: 51.17 },
] as const;

/** Rough land masks for a dot-matrix world silhouette. */
const LAND_REGIONS = [
  { minLon: -168, maxLon: -52, minLat: 24, maxLat: 72 },
  { minLon: -82, maxLon: -34, minLat: -56, maxLat: 13 },
  { minLon: -25, maxLon: 45, minLat: 34, maxLat: 71 },
  { minLon: -18, maxLon: 52, minLat: -35, maxLat: 37 },
  { minLon: 33, maxLon: 63, minLat: 12, maxLat: 42 },
  { minLon: 68, maxLon: 90, minLat: 6, maxLat: 36 },
  { minLon: 95, maxLon: 145, minLat: -10, maxLat: 55 },
  { minLon: 113, maxLon: 154, minLat: -44, maxLat: -10 },
  { minLon: -75, maxLon: -12, minLat: 60, maxLat: 84 },
];

function project(lon: number, lat: number) {
  return {
    x: ((lon + 180) / 360) * WIDTH,
    y: ((90 - lat) / 180) * HEIGHT,
  };
}

function isLand(lon: number, lat: number) {
  return LAND_REGIONS.some(
    (r) =>
      lon >= r.minLon &&
      lon <= r.maxLon &&
      lat >= r.minLat &&
      lat <= r.maxLat
  );
}

const LAND_DOTS = (() => {
  const dots: { x: number; y: number }[] = [];
  for (let lon = -180; lon <= 180; lon += 5) {
    for (let lat = -60; lat <= 80; lat += 5) {
      if (!isLand(lon, lat)) continue;
      dots.push(project(lon, lat));
    }
  }
  return dots;
})();

export function CustomerWorldMap({ className }: { className?: string }) {
  return (
    <div
      className={className}
      aria-label="Customer locations: Dubai, Canada, UK, Cyprus, Spain, and Germany"
    >
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#0b1220] via-[#111827] to-[#0f172a] p-1 shadow-[0_0_40px_rgba(16,185,129,0.12),inset_0_1px_0_rgba(255,255,255,0.06)]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(56,189,248,0.12),transparent_55%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_80%_80%,rgba(16,185,129,0.08),transparent_45%)]" />

        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="relative h-auto w-full"
          role="img"
          aria-hidden
        >
          <defs>
            <filter id="customerGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <radialGradient id="markerGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#34d399" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
            </radialGradient>
          </defs>

          {Array.from({ length: 13 }, (_, i) => {
            const y = (i / 12) * HEIGHT;
            return (
              <line
                key={`lat-${i}`}
                x1={0}
                y1={y}
                x2={WIDTH}
                y2={y}
                stroke="rgba(148,163,184,0.08)"
                strokeWidth="1"
              />
            );
          })}
          {Array.from({ length: 25 }, (_, i) => {
            const x = (i / 24) * WIDTH;
            return (
              <line
                key={`lon-${i}`}
                x1={x}
                y1={0}
                x2={x}
                y2={HEIGHT}
                stroke="rgba(148,163,184,0.06)"
                strokeWidth="1"
              />
            );
          })}

          {LAND_DOTS.map((dot, i) => (
            <circle
              key={i}
              cx={dot.x}
              cy={dot.y}
              r={1.6}
              fill="rgba(148,163,184,0.35)"
            />
          ))}

          {CUSTOMERS.map((customer) => {
            const { x, y } = project(customer.lon, customer.lat);
            return (
              <g key={customer.name} filter="url(#customerGlow)">
                <circle cx={x} cy={y} r={18} fill="url(#markerGlow)" opacity="0.55">
                  <animate
                    attributeName="r"
                    values="14;22;14"
                    dur="3s"
                    repeatCount="indefinite"
                  />
                  <animate
                    attributeName="opacity"
                    values="0.45;0.15;0.45"
                    dur="3s"
                    repeatCount="indefinite"
                  />
                </circle>
                <circle cx={x} cy={y} r={5} fill="#10b981" />
                <circle cx={x} cy={y} r={2.2} fill="#ecfdf5" />
              </g>
            );
          })}
        </svg>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#0b1220]/80 to-transparent" />
      </div>
    </div>
  );
}
