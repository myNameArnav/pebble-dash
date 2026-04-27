interface MarkProps {
  size?: number;
  className?: string;
}

/**
 * Pebble Telex brand mark — an editorial "stamp" with:
 *   • ink pebble body (rounded rect)
 *   • flame masthead banner with faux telex-type dashes
 *   • acid-yellow live pip
 *   • Bauhaus "PT" monogram
 *   • a flame rule along the bottom
 *
 * Same artwork as /src/logo.svg; inlined here for crispness in the masthead.
 */
export function Mark({ size = 64, className }: MarkProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      width={size}
      height={size}
      role="img"
      aria-label="Pebble Telex"
      className={className}
    >
      <title>Pebble Telex</title>

      {/* Pebble body */}
      <rect x="4" y="4" width="56" height="56" rx="14" fill="#0e0e0e" />

      {/* Flame banner */}
      <rect x="4" y="14" width="56" height="10" fill="#ff5722" />

      {/* Banner dashes (left) */}
      <g fill="#f2ede0">
        <rect x="9"    y="18.25" width="3.5" height="1.5" />
        <rect x="14.5" y="18.25" width="3.5" height="1.5" />
        <rect x="20"   y="18.25" width="3.5" height="1.5" />
      </g>

      {/* Live pip (right) */}
      <circle cx="51.5" cy="19" r="3.5" fill="#f5ff50" stroke="#0e0e0e" strokeWidth="1" />

      {/* "PT" monogram */}
      <g fill="#f2ede0">
        {/* P */}
        <rect x="13" y="32" width="4"  height="20" />
        <rect x="13" y="32" width="13" height="4" />
        <rect x="22" y="32" width="4"  height="11" />
        <rect x="13" y="39" width="13" height="4" />
        {/* T */}
        <rect x="33" y="32" width="18" height="4" />
        <rect x="40" y="32" width="4"  height="20" />
      </g>

      {/* Bottom flame rule */}
      <rect x="13" y="55" width="38" height="1.5" fill="#ff5722" />
    </svg>
  );
}
