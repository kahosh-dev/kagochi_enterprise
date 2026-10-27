import "./FarmBackground.css";

/**
 * Lightweight, self-contained farm scenery for the authentication pages.
 * The illustration is inline SVG, so it does not need remote images or video.
 */
export default function FarmBackground() {
  return (
    <div className="farm-background" aria-hidden="true">
      <div className="farm-background__sky" />
      <svg
        className="farm-background__landscape"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
        focusable="false"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="farm-sky-glow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f7e8b8" stopOpacity=".05" />
            <stop offset="100%" stopColor="#f7e8b8" stopOpacity=".8" />
          </linearGradient>
          <linearGradient id="farm-far-hills" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#779b69" />
            <stop offset="100%" stopColor="#4d7950" />
          </linearGradient>
          <linearGradient id="farm-near-hills" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#426c42" />
            <stop offset="100%" stopColor="#183f2b" />
          </linearGradient>
          <radialGradient id="farm-sun-halo">
            <stop offset="0%" stopColor="#fff4c4" stopOpacity=".9" />
            <stop offset="100%" stopColor="#f8d68a" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="farm-field" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6c8d4c" />
            <stop offset="100%" stopColor="#244c31" />
          </linearGradient>
        </defs>

        <circle className="farm-background__sun-halo" cx="1090" cy="245" r="190" fill="url(#farm-sun-halo)" />
        <circle className="farm-background__sun" cx="1090" cy="245" r="54" fill="#ffe8a5" />

        <g className="farm-background__cloud farm-background__cloud--one" fill="#fff9e8" opacity=".58">
          <ellipse cx="300" cy="180" rx="78" ry="20" />
          <ellipse cx="280" cy="166" rx="35" ry="25" />
          <ellipse cx="320" cy="160" rx="43" ry="31" />
        </g>
        <g className="farm-background__cloud farm-background__cloud--two" fill="#fff9e8" opacity=".38">
          <ellipse cx="820" cy="130" rx="65" ry="16" />
          <ellipse cx="800" cy="119" rx="28" ry="20" />
          <ellipse cx="835" cy="112" rx="36" ry="24" />
        </g>

        <path d="M0 450 C150 380 250 405 385 445 S620 465 760 400 S1010 365 1160 425 S1320 445 1440 390 V900 H0Z" fill="url(#farm-far-hills)" />
        <path d="M0 520 C170 440 300 480 455 520 S710 530 850 460 S1120 455 1260 510 S1370 520 1440 480 V900 H0Z" fill="#5d8050" />
        <path d="M0 620 C160 510 320 555 500 610 S790 625 960 550 S1230 555 1440 600 V900 H0Z" fill="url(#farm-near-hills)" />

        <path d="M500 900 C590 765 660 675 760 605 C850 545 970 535 1085 550 C940 600 850 690 810 900Z" fill="url(#farm-field)" opacity=".9" />
        <g className="farm-background__crop-rows" fill="none" stroke="#a4bd70" strokeWidth="2" opacity=".38">
          <path d="M555 900 Q650 730 770 610" />
          <path d="M600 900 Q690 740 815 600" />
          <path d="M645 900 Q735 750 865 580" />
          <path d="M690 900 Q780 760 915 565" />
          <path d="M735 900 Q825 770 965 555" />
          <path d="M780 900 Q875 785 1015 550" />
        </g>

        {/* A small farmhouse on the distant ridge. */}
        <g className="farm-background__farmhouse" opacity=".76">
          <path d="M1120 485 L1160 455 L1200 485 V530 H1120Z" fill="#203f2c" />
          <path d="M1110 487 L1160 448 L1210 487Z" fill="#493f2c" />
          <rect x="1149" y="496" width="19" height="34" rx="2" fill="#e7c77c" opacity=".72" />
          <rect x="1129" y="496" width="12" height="12" fill="#f4d99a" opacity=".68" />
          <rect x="1180" y="496" width="12" height="12" fill="#f4d99a" opacity=".68" />
        </g>

        <path d="M0 770 Q180 700 340 760 T690 750 T1040 730 T1440 760 V900 H0Z" fill="#173c29" opacity=".8" />
        <rect x="0" y="0" width="1440" height="900" fill="url(#farm-sky-glow)" />
      </svg>

      <div className="farm-background__atmosphere" />
      <div className="farm-background__foreground" />
    </div>
  );
}
