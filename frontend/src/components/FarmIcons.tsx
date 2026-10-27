interface IconProps {
  size?: number;
  className?: string;
  color?: string;
}

export function ChickIcon({ size = 24, className = "" }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* Chick body & head */}
      <circle cx="10" cy="8" r="4" fill="currentColor" fillOpacity="0.15" />
      <path d="M14 9l3-1-3-1" /> {/* beak */}
      <circle cx="9" cy="7" r="1" fill="currentColor" /> {/* eye */}
      <path d="M8 12c-3 1-5 4-5 7 0 1.5 2 2.5 7 2.5s8-1.5 8-5c0-3-3-4.5-5-4.5" fill="currentColor" fillOpacity="0.1" />
      <path d="M7 21v2m0 0l-1 1m1-1l1 1" /> {/* leg 1 */}
      <path d="M12 21v2m0 0l-1 1m1-1l1 1" /> {/* leg 2 */}
      <path d="M4 16c1-1 3-1 4 0" /> {/* wing */}
    </svg>
  );
}

export function ChickenIcon({ size = 24, className = "" }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* Chicken comb */}
      <path d="M9 3c0 1.5.5 2 1.5 2 .8 0 1.5-.5 1.5-1.5.8 0 1.5.5 1.5 1.5" />
      {/* Head & beak */}
      <path d="M14 6l3 1-3 1" />
      <circle cx="11" cy="6" r="1" fill="currentColor" />
      {/* Body */}
      <path d="M9 7c-2 2-5 5-5 9 0 3 3 5 8 5s8-2 8-6c0-4-3-7-6-8" fill="currentColor" fillOpacity="0.12" />
      <path d="M6 14c2-2 5-1 6 1" /> {/* wing */}
      {/* Legs */}
      <path d="M9 21v2m0 0l-1 1m1-1l1 1" />
      <path d="M13 21v2m0 0l-1 1m1-1l1 1" />
    </svg>
  );
}

export function CowIcon({ size = 24, className = "" }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* Cow horns and head */}
      <path d="M5 5c0 2 2 4 4 4" />
      <path d="M19 5c0 2-2 4-4 4" />
      <rect x="7" y="6" width="10" height="9" rx="3" fill="currentColor" fillOpacity="0.12" />
      <circle cx="9.5" cy="9" r="1" fill="currentColor" />
      <circle cx="14.5" cy="9" r="1" fill="currentColor" />
      {/* Snout */}
      <rect x="8" y="12" width="8" height="5" rx="2.5" fill="currentColor" fillOpacity="0.2" />
      <circle cx="10" cy="14.5" r="0.75" fill="currentColor" />
      <circle cx="14" cy="14.5" r="0.75" fill="currentColor" />
      {/* Ears */}
      <path d="M6 7l-3 1 2 2" />
      <path d="M18 7l3 1-2 2" />
      {/* Body contour */}
      <path d="M7 17v4m10-4v4" />
    </svg>
  );
}

export function CalfIcon({ size = 24, className = "" }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* Smaller calf head with soft ears */}
      <rect x="7.5" y="7" width="9" height="8" rx="3.5" fill="currentColor" fillOpacity="0.15" />
      <circle cx="10" cy="10" r="1.2" fill="currentColor" />
      <circle cx="14" cy="10" r="1.2" fill="currentColor" />
      {/* Snout */}
      <rect x="8.5" y="12.5" width="7" height="4.5" rx="2" fill="currentColor" fillOpacity="0.25" />
      <circle cx="10.5" cy="14.5" r="0.6" fill="currentColor" />
      <circle cx="13.5" cy="14.5" r="0.6" fill="currentColor" />
      {/* Soft droopy ears */}
      <path d="M7 9l-3 2 1.5 2" />
      <path d="M17 9l3 2-1.5 2" />
      {/* Star mark / forehead blaze */}
      <path d="M12 7.5v2" strokeWidth="1.5" />
    </svg>
  );
}

export function HeiferIcon({ size = 24, className = "" }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* Growing heifer - budding small horns */}
      <path d="M7 6c0 1 1 2 2 2" />
      <path d="M17 6c0 1-1 2-2 2" />
      <rect x="7" y="7" width="10" height="8.5" rx="3" fill="currentColor" fillOpacity="0.12" />
      <circle cx="9.5" cy="10" r="1" fill="currentColor" />
      <circle cx="14.5" cy="10" r="1" fill="currentColor" />
      <rect x="8" y="13" width="8" height="4.5" rx="2" fill="currentColor" fillOpacity="0.2" />
      <circle cx="10.5" cy="15" r="0.75" fill="currentColor" />
      <circle cx="13.5" cy="15" r="0.75" fill="currentColor" />
      <path d="M6 8l-2.5 1 1.5 1.5" />
      <path d="M18 8l2.5 1-1.5 1.5" />
      {/* Growth leaf symbol tag */}
      <path d="M12 4v2" strokeWidth="1.5" />
    </svg>
  );
}

export function BullIcon({ size = 24, className = "" }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* Strong curved bull horns */}
      <path d="M3 4c2 0 4 2 5 4" strokeWidth="2.5" />
      <path d="M21 4c-2 0-4 2-5 4" strokeWidth="2.5" />
      <rect x="6.5" y="6" width="11" height="10" rx="3" fill="currentColor" fillOpacity="0.15" />
      <circle cx="9.5" cy="9.5" r="1.2" fill="currentColor" />
      <circle cx="14.5" cy="9.5" r="1.2" fill="currentColor" />
      {/* Broad muzzle */}
      <rect x="7.5" y="12.5" width="9" height="5.5" rx="2.5" fill="currentColor" fillOpacity="0.25" />
      <circle cx="10" cy="15" r="0.8" fill="currentColor" />
      <circle cx="14" cy="15" r="0.8" fill="currentColor" />
      {/* Ring */}
      <circle cx="12" cy="18" r="1.5" />
    </svg>
  );
}

export function EggBasketIcon({ size = 24, className = "" }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* Eggs in nest */}
      <ellipse cx="9" cy="9" rx="3" ry="4" fill="currentColor" fillOpacity="0.18" />
      <ellipse cx="15" cy="9" rx="3" ry="4" fill="currentColor" fillOpacity="0.18" />
      <ellipse cx="12" cy="7.5" rx="2.5" ry="3.5" fill="currentColor" fillOpacity="0.25" />
      {/* Basket */}
      <path d="M4 12h16l-1.5 8a2 2 0 0 1-2 2H7.5a2 2 0 0 1-2-2L4 12z" fill="currentColor" fillOpacity="0.1" />
      <path d="M4 12c0-4 3.5-7 8-7s8 3 8 7" />
    </svg>
  );
}

export function MilkChurnIcon({ size = 24, className = "" }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* Traditional milk churn / can */}
      <path d="M8 2h8v3H8z" />
      <path d="M9 5l-2 3h10l-2-3" />
      <rect x="6" y="8" width="12" height="13" rx="2" fill="currentColor" fillOpacity="0.15" />
      {/* Handles */}
      <path d="M6 10H4a1 1 0 0 0-1 1v4a1 1 0 0 0 1 1h2" />
      <path d="M18 10h2a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1h-2" />
      {/* Measurement line */}
      <path d="M10 13h4m-4 3h4" strokeWidth="1.5" />
    </svg>
  );
}

export function KesMoneyIcon({ size = 24, className = "" }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="12" cy="12" r="9.5" fill="currentColor" fillOpacity="0.12" />
      <text
        x="12"
        y="15.5"
        textAnchor="middle"
        fontSize="8.5"
        fontWeight="800"
        fill="currentColor"
        stroke="none"
        fontFamily="system-ui, sans-serif"
      >
        KES
      </text>
    </svg>
  );
}
