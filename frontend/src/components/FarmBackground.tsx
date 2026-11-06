import "./FarmBackground.css";
import { COLORS } from "../styles/tokens";

/**
 * Lightweight, self-contained farm scenery for the authentication pages.
 * The illustration is inline SVG, so it does not need remote images or video.
 * Colours are sourced from the design-token constants in tokens.ts.
 */
export default function FarmBackground() {
  return (
    <div className="farm-background" aria-hidden="true">
      <div className="farm-background__photo" />
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
            <stop offset="0%" stopColor={COLORS.skyGlow} stopOpacity=".05" />
            <stop offset="100%" stopColor={COLORS.skyGlow} stopOpacity=".8" />
          </linearGradient>
          <linearGradient id="farm-far-hills" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={COLORS.farHillLight} />
            <stop offset="100%" stopColor={COLORS.farHillDark} />
          </linearGradient>
          <linearGradient id="farm-near-hills" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={COLORS.nearHillTop} />
            <stop offset="100%" stopColor={COLORS.nearHillBase} />
          </linearGradient>
          <radialGradient id="farm-sun-halo">
            <stop offset="0%" stopColor={COLORS.sunHaloLight} stopOpacity=".9" />
            <stop offset="100%" stopColor={COLORS.sunHaloDark} stopOpacity="0" />
          </radialGradient>
          <linearGradient id="farm-field" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={COLORS.fieldLight} />
            <stop offset="100%" stopColor={COLORS.fieldDark} />
          </linearGradient>
        </defs>

        <circle className="farm-background__sun-halo" cx="1090" cy="245" r="190" fill="url(#farm-sun-halo)" />
        <circle className="farm-background__sun" cx="1090" cy="245" r="54" fill={COLORS.sunHaloLight} />

        <g className="farm-background__cloud farm-background__cloud--one" fill={COLORS.cloudFill} opacity=".58">
          <ellipse cx="300" cy="180" rx="78" ry="20" />
          <ellipse cx="280" cy="166" rx="35" ry="25" />
          <ellipse cx="320" cy="160" rx="43" ry="31" />
        </g>
        <g className="farm-background__cloud farm-background__cloud--two" fill={COLORS.cloudFill} opacity=".38">
          <ellipse cx="820" cy="130" rx="65" ry="16" />
          <ellipse cx="800" cy="119" rx="28" ry="20" />
          <ellipse cx="835" cy="112" rx="36" ry="24" />
        </g>

        {/* Distant birds drift slowly across the open sky. */}
        <g className="farm-background__birds" fill="none" stroke={COLORS.birdStroke} strokeWidth="3.2" strokeLinecap="round" opacity=".62">
          <path d="M465 250 q12 -13 24 0 q12 -13 24 0" />
          <path d="M535 285 q8 -9 16 0 q8 -9 16 0" />
          <path d="M410 300 q7 -8 14 0 q7 -8 14 0" />
        </g>

        <path d="M0 450 C150 380 250 405 385 445 S620 465 760 400 S1010 365 1160 425 S1320 445 1440 390 V900 H0Z" fill="url(#farm-far-hills)" />
        <path d="M0 520 C170 440 300 480 455 520 S710 530 850 460 S1120 455 1260 510 S1370 520 1440 480 V900 H0Z" fill={COLORS.nearHillTop} />
        <path d="M0 620 C160 510 320 555 500 610 S790 625 960 550 S1230 555 1440 600 V900 H0Z" fill="url(#farm-near-hills)" />

        <path d="M500 900 C590 765 660 675 760 605 C850 545 970 535 1085 550 C940 600 850 690 810 900Z" fill="url(#farm-field)" opacity=".9" />
        <g className="farm-background__crop-rows" fill="none" stroke={COLORS.cropRow} strokeWidth="2" opacity=".38">
          <path d="M555 900 Q650 730 770 610" />
          <path d="M600 900 Q690 740 815 600" />
          <path d="M645 900 Q735 750 865 580" />
          <path d="M690 900 Q780 760 915 565" />
          <path d="M735 900 Q825 770 965 555" />
          <path d="M780 900 Q875 785 1015 550" />
        </g>

        {/* A small farmhouse on the distant ridge. */}
        <g className="farm-background__farmhouse" opacity=".76">
          <path d="M1120 485 L1160 455 L1200 485 V530 H1120Z" fill={COLORS.houseFill} />
          <path d="M1110 487 L1160 448 L1210 487Z" fill={COLORS.houseRoof} />
          <rect x="1149" y="496" width="19" height="34" rx="2" fill={COLORS.houseDoor} opacity=".72" />
          <rect x="1129" y="496" width="12" height="12" fill={COLORS.houseWindow} opacity=".68" />
          <rect x="1180" y="496" width="12" height="12" fill={COLORS.houseWindow} opacity=".68" />
        </g>

        {/* Small livestock silhouettes add depth to the distant pasture. */}
        <g className="farm-background__livestock" opacity=".76" fill={COLORS.livestockFill}>
          <g transform="translate(285 625) scale(.72)">
            <ellipse cx="0" cy="0" rx="27" ry="15" />
            <ellipse cx="24" cy="-8" rx="10" ry="10" />
            <path d="M17 -17 l-7 -8 l13 4 M29 -17 l8 -7 l-2 12" />
            <path d="M-17 9 l-2 24 l6 0 l5 -22 M8 9 l2 24 l6 0 l-1 -25 M-29 -4 l-13 -9 l2 -4 l17 9" />
          </g>
          <g transform="translate(355 646) scale(.46)">
            <ellipse cx="0" cy="0" rx="26" ry="15" />
            <ellipse cx="24" cy="-8" rx="10" ry="10" />
            <path d="M17 -17 l-7 -8 l13 4 M29 -17 l8 -7 l-2 12" />
            <path d="M-17 9 l-2 24 l6 0 l5 -22 M8 9 l2 24 l6 0 l-1 -25" />
          </g>
        </g>

        <path d="M0 770 Q180 700 340 760 T690 750 T1040 730 T1440 760 V900 H0Z" fill={COLORS.horizonDark} opacity=".8" />
        <rect x="0" y="0" width="1440" height="900" fill="url(#farm-sky-glow)" />
      </svg>

      <div className="farm-background__atmosphere" />
      <div className="farm-background__foreground" />
    </div>
  );
}
