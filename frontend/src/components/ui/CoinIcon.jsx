// ============================================================
// CoinIcon.jsx — Shared SVG coin icon (replaces 🪙 emoji
// which renders as a box on many systems/fonts)
// Usage: import CoinIcon from '../components/ui/CoinIcon';
//        <CoinIcon size={14} />
// ============================================================
export default function CoinIcon({ size = 14, style = {} }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ flexShrink: 0, ...style }}
    >
      <circle cx="12" cy="12" r="10" fill="#F59E0B" />
      <circle cx="12" cy="12" r="8"  fill="#FBBF24" />
      <text
        x="12" y="16"
        textAnchor="middle"
        fontSize="10"
        fontWeight="bold"
        fill="#92400E"
        fontFamily="Arial, sans-serif"
      >
        $
      </text>
    </svg>
  );
}
