import './FarmBackground.css';

/**
 * FarmBackground
 *
 * A purely decorative, CSS-animated farm landscape. All elements are
 * rendered as SVG or plain divs — no external images, no JS animation
 * loops, no particle libraries.
 *
 * pointer-events: none is set on the root so the form above remains
 * fully interactive. prefers-reduced-motion is handled entirely in CSS.
 */
export default function FarmBackground() {
  return (
    <div className="farm-bg" aria-hidden="true">
      {/* Sky gradient */}
      <div className="farm-bg-sky" />

      {/* Sun disc */}
      <div className="farm-bg-sun" />

      {/* Atmospheric haze */}
      <div className="farm-bg-haze" />

      {/* Clouds */}
      <div className="farm-bg-cloud-1" />
      <div className="farm-bg-cloud-2" />
      <div className="farm-bg-cloud-3" />

      {/* Birds in flight */}
      <div className="farm-bg-bird farm-bg-bird-1">
        <svg width="28" height="12" viewBox="0 0 28 12" fill="none">
          <path d="M14 6 C10 2 4 0 0 3 C4 4 8 5 14 6 Z" />
          <path d="M14 6 C18 2 24 0 28 3 C24 4 20 5 14 6 Z" />
        </svg>
      </div>
      <div className="farm-bg-bird farm-bg-bird-2">
        <svg width="22" height="10" viewBox="0 0 22 10" fill="none">
          <path d="M11 5 C8 1.5 3 0 0 2.5 C3 3.2 6.5 4 11 5 Z" />
          <path d="M11 5 C14 1.5 19 0 22 2.5 C19 3.2 15.5 4 11 5 Z" />
        </svg>
      </div>
      <div className="farm-bg-bird farm-bg-bird-3">
        <svg width="18" height="8" viewBox="0 0 18 8" fill="none">
          <path d="M9 4 C6.5 1 2.5 0 0 2 C2.5 2.6 5.5 3.2 9 4 Z" />
          <path d="M9 4 C11.5 1 15.5 0 18 2 C15.5 2.6 12.5 3.2 9 4 Z" />
        </svg>
      </div>

      {/* Rolling hills — background (lighter, further away) */}
      <div className="farm-bg-hills-back">
        <svg
          viewBox="0 0 1440 320"
          preserveAspectRatio="none"
          style={{ width: '100%', height: '100%' }}
        >
          <defs>
            <linearGradient id="hillGrad1" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#5a9e5a" />
              <stop offset="100%" stopColor="#3d7a3d" />
            </linearGradient>
          </defs>
          <path
            d="M0,160 C200,80 360,200 540,140 C720,80 900,180 1080,120 C1260,60 1380,160 1440,100 L1440,320 L0,320 Z"
            fill="url(#hillGrad1)"
            opacity="0.55"
          />
          {/* Crop field strip on back hill */}
          <path
            d="M60,200 C180,165 300,195 420,175 C540,155 660,185 780,168"
            stroke="rgba(34,100,34,0.4)"
            strokeWidth="4"
            fill="none"
          />
          <path
            d="M60,215 C180,180 300,210 420,190 C540,170 660,200 780,183"
            stroke="rgba(34,100,34,0.3)"
            strokeWidth="3"
            fill="none"
          />
          <path
            d="M60,230 C180,195 300,225 420,205 C540,185 660,215 780,198"
            stroke="rgba(34,100,34,0.25)"
            strokeWidth="3"
            fill="none"
          />
        </svg>
      </div>

      {/* Rolling hills — foreground (richer colour, closer) */}
      <div className="farm-bg-hills-fore">
        <svg
          viewBox="0 0 1440 280"
          preserveAspectRatio="none"
          style={{ width: '100%', height: '100%' }}
        >
          <defs>
            <linearGradient id="hillGrad2" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2e7d32" />
              <stop offset="100%" stopColor="#1b5e20" />
            </linearGradient>
            <linearGradient id="hillGrad3" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#388e3c" />
              <stop offset="100%" stopColor="#2e7d32" />
            </linearGradient>
          </defs>
          {/* Main foreground hill */}
          <path
            d="M0,200 C120,140 280,230 440,170 C600,110 760,200 960,155 C1160,110 1320,185 1440,145 L1440,280 L0,280 Z"
            fill="url(#hillGrad2)"
            opacity="0.9"
          />
          {/* Farmland texture on foreground */}
          <path
            d="M0,240 C160,210 320,250 480,225 C640,200 800,240 960,218 C1120,196 1300,235 1440,215 L1440,280 L0,280 Z"
            fill="url(#hillGrad3)"
            opacity="0.7"
          />
        </svg>
      </div>

      {/* Farmhouse silhouette */}
      <div className="farm-bg-house">
        <svg viewBox="0 0 72 64" fill="none" style={{ width: '100%', height: '100%' }}>
          {/* Roof */}
          <polygon points="4,32 36,4 68,32" fill="rgba(80,40,20,0.7)" />
          {/* Chimney */}
          <rect x="44" y="10" width="8" height="18" fill="rgba(60,30,10,0.7)" />
          {/* Smoke from chimney */}
          <circle cx="48" cy="8" r="3" fill="rgba(200,200,200,0.35)" />
          <circle cx="50" cy="4" r="2.5" fill="rgba(200,200,200,0.25)" />
          {/* House body */}
          <rect x="10" y="32" width="52" height="32" fill="rgba(100,60,30,0.6)" />
          {/* Door */}
          <rect x="28" y="46" width="16" height="18" fill="rgba(60,30,10,0.7)" />
          {/* Windows */}
          <rect x="14" y="38" width="12" height="10" rx="1" fill="rgba(255,210,80,0.4)" />
          <rect x="46" y="38" width="12" height="10" rx="1" fill="rgba(255,210,80,0.4)" />
        </svg>
      </div>

      {/* Chicken silhouettes */}
      <div className="farm-bg-chicken farm-bg-chicken-1">
        <svg width="22" height="20" viewBox="0 0 22 20" fill="none">
          <ellipse cx="11" cy="13" rx="7" ry="5" fill="rgba(180,100,30,0.65)" />
          <circle cx="11" cy="6" r="4" fill="rgba(180,100,30,0.65)" />
          <polygon points="11,4 13,2 15,4" fill="rgba(220,80,50,0.6)" />
          <line x1="9" y1="18" x2="8" y2="22" stroke="rgba(140,80,30,0.6)" strokeWidth="1.5" />
          <line x1="13" y1="18" x2="14" y2="22" stroke="rgba(140,80,30,0.6)" strokeWidth="1.5" />
        </svg>
      </div>
      <div className="farm-bg-chicken farm-bg-chicken-2">
        <svg width="18" height="16" viewBox="0 0 18 16" fill="none">
          <ellipse cx="9" cy="11" rx="6" ry="4" fill="rgba(140,80,20,0.6)" />
          <circle cx="9" cy="5" r="3.5" fill="rgba(140,80,20,0.6)" />
          <polygon points="9,3 11,1 13,3" fill="rgba(200,60,40,0.55)" />
          <line x1="7.5" y1="15" x2="6.5" y2="18" stroke="rgba(110,60,20,0.55)" strokeWidth="1.5" />
          <line x1="10.5" y1="15" x2="11.5" y2="18" stroke="rgba(110,60,20,0.55)" strokeWidth="1.5" />
        </svg>
      </div>

      {/* Crop rows on foreground hill */}
      <div className="farm-bg-crops">
        <div className="farm-bg-crop-row" />
        <div className="farm-bg-crop-row" />
        <div className="farm-bg-crop-row" />
        <div className="farm-bg-crop-row" />
        <div className="farm-bg-crop-row" />
      </div>

      {/* Foreground grass blades */}
      <div className="farm-bg-grass">
        {Array.from({ length: 30 }, (_, i) => (
          <div
            key={i}
            className="grass-blade"
            style={{
              left: `${(i * 3.5) + Math.random() * 2}%`,
              height: `${20 + Math.random() * 28}px`,
              background: `hsl(${120 + Math.random() * 20}, ${55 + Math.random() * 20}%, ${28 + Math.random() * 18}%)`,
              animationDelay: `${Math.random() * 2.5}s`,
              animationDuration: `${2 + Math.random() * 1.5}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
