type MomentumGaugeProps = {
  value: number;
  direction: string;
};

const MomentumGauge = ({ value, direction }: MomentumGaugeProps) => {
  const normalized = Math.max(0, Math.min(1, Number(value) || 0));
  const tone =
    direction.toUpperCase() === "DOWN"
      ? "sell"
      : direction.toUpperCase() === "NEUTRAL"
        ? "neutral"
        : "buy";

  const colors = {
    track: "#e2e8f0",
    buy: "#10b981",
    sell: "#dc2626",
    neutral: "#f59e0b",
    hub: "#0f172a",
    text: "#0f172a",
  };

  const radius = 140;
  const centerX = 160;
  const centerY = 180;
  const pathLength = 100;
  const arcPath = `M ${centerX - radius} ${centerY} A ${radius} ${radius} 0 0 1 ${centerX + radius} ${centerY}`;

  const angle = Math.PI - normalized * Math.PI;
  const needleLength = radius - 18;
  const needleX = centerX + Math.cos(angle) * needleLength;
  const needleY = centerY - Math.sin(angle) * needleLength;

  const toneColor =
    tone === "buy" ? colors.buy : tone === "sell" ? colors.sell : colors.neutral;

  return (
    <div
      style={{
        width: "100%",
        display: "flex",
        justifyContent: "center",
        padding: "8px 0",
      }}
    >
      <svg
        viewBox="0 0 320 210"
        width="100%"
        height="210"
        role="img"
        aria-label="Momentum gauge"
      >
        <defs>
          <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={colors.sell} />
            <stop offset="50%" stopColor={colors.neutral} />
            <stop offset="100%" stopColor={colors.buy} />
          </linearGradient>
        </defs>

        <path
          d={arcPath}
          fill="none"
          stroke={colors.track}
          strokeWidth="22"
          strokeLinecap="round"
          opacity="0.5"
          pathLength={pathLength}
        />

        <path
          d={arcPath}
          fill="none"
          stroke="url(#gaugeGradient)"
          strokeWidth="22"
          strokeLinecap="round"
          pathLength={pathLength}
          strokeDasharray={`${normalized * pathLength} ${pathLength}`}
        />

        <line
          x1={centerX}
          y1={centerY}
          x2={needleX}
          y2={needleY}
          stroke={toneColor}
          strokeWidth="7"
          strokeLinecap="round"
        />

        <circle cx={centerX} cy={centerY} r="10" fill={colors.hub} opacity="0.9" />
        <circle cx={centerX} cy={centerY} r="5" fill={toneColor} />

        <text
          x={centerX - radius + 4}
          y={centerY + 20}
          fontSize="12"
          fill={colors.text}
          opacity="0.75"
        >
          Bad
        </text>
        <text
          x={centerX}
          y={centerY + 20}
          fontSize="12"
          fill={colors.text}
          textAnchor="middle"
          opacity="0.9"
        >
          Neutral
        </text>
        <text
          x={centerX + radius - 4}
          y={centerY + 20}
          fontSize="12"
          fill={colors.text}
          textAnchor="end"
          opacity="0.75"
        >
          Good
        </text>
      </svg>
    </div>
  );
};

export default MomentumGauge;
