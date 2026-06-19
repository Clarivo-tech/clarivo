"use client";

const WIDTH = 1000;
const HEIGHT = 500;

const CUSTOMERS = [
  { name: "Dubai", lon: 55.27, lat: 25.2 },
  { name: "Canada", lon: -106.35, lat: 56.13 },
  { name: "UK", lon: -1.5, lat: 52.5 },
  { name: "Cyprus", lon: 33.43, lat: 35.13 },
  { name: "Spain", lon: -3.7, lat: 40.4 },
  { name: "Germany", lon: 10.45, lat: 51.17 },
] as const;

function project(lon: number, lat: number) {
  return {
    x: ((lon + 180) / 360) * WIDTH,
    y: ((90 - lat) / 180) * HEIGHT,
  };
}

export function CustomerWorldMap({ className }: { className?: string }) {
  return (
    <div
      className={className}
      aria-label="Customer locations: Dubai, Canada, UK, Cyprus, Spain, and Germany"
    >
      <div className="relative aspect-[2/1] w-full">
        <img
          src="/world-map-outline.svg"
          alt=""
          className="absolute inset-0 h-full w-full object-contain"
        />

        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="absolute inset-0 h-full w-full"
          role="img"
          aria-hidden
        >
          <defs>
            <filter id="customerGlow" x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <radialGradient id="markerGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#34d399" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
            </radialGradient>
          </defs>

          {CUSTOMERS.map((customer, index) => {
            const { x, y } = project(customer.lon, customer.lat);
            return (
              <g key={customer.name} filter="url(#customerGlow)">
                <circle
                  cx={x}
                  cy={y}
                  r={20}
                  fill="url(#markerGlow)"
                  opacity="0.6"
                >
                  <animate
                    attributeName="r"
                    values="16;26;16"
                    dur="2.8s"
                    begin={`${index * 0.35}s`}
                    repeatCount="indefinite"
                  />
                  <animate
                    attributeName="opacity"
                    values="0.5;0.12;0.5"
                    dur="2.8s"
                    begin={`${index * 0.35}s`}
                    repeatCount="indefinite"
                  />
                </circle>
                <circle cx={x} cy={y} r={6.5} fill="#10b981" />
                <circle cx={x} cy={y} r={2.8} fill="#ffffff" />
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
