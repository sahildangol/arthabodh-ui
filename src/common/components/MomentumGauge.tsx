type MomentumGaugeProps = {
  value: number;
  strength: string | number;
  direction: string;
};

const polarToCartesian = (
  cx: number,
  cy: number,
  radius: number,
  angleInDegrees: number,
) => {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(angleInRadians),
    y: cy + radius * Math.sin(angleInRadians),
  };
};

const describeArc = (
  cx: number,
  cy: number,
  radius: number,
  startAngle: number,
  endAngle: number,
) => {
  const start = polarToCartesian(cx, cy, radius, endAngle);
  const end = polarToCartesian(cx, cy, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";

  return [
    "M",
    start.x,
    start.y,
    "A",
    radius,
    radius,
    0,
    largeArcFlag,
    0,
    end.x,
    end.y,
  ].join(" ");
};

const MomentumGauge = ({ value, direction }: MomentumGaugeProps) => {
  const normalized = Math.max(0, Math.min(1, Number(value) || 0));

  const centerX = 180;
  const centerY = 185;
  const radius = 108;
  const startAngle = 210;
  const endAngle = 330;
  const needleAngle = startAngle + (endAngle - startAngle) * normalized;

  const needlePoint = polarToCartesian(centerX, centerY, radius - 28, needleAngle);
  const normalizedDirection = direction.toUpperCase();
  const tone =
    normalizedDirection === "DOWN"
      ? "sell"
      : normalizedDirection === "NEUTRAL"
        ? "neutral"
        : "buy";
  const needleColor =
    tone === "buy"
      ? "#10b981"
      : tone === "sell"
        ? "#dc2626"
        : "#f59e0b";
  const headingLabel = "Neutral";
  const headingColor = "#334155";
  const tickPalette = ["#ef4444", "#f97316", "#facc15", "#86efac", "#10b981"];
  const tickSteps = [0.16, 0.35, 0.52, 0.7, 0.86];

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        width: "100%",
      }}
    >
      <svg
        viewBox="0 0 360 260"
        width="100%"
        height="260"
        role="img"
        aria-label="Momentum directional gauge"
      >
        <defs>
          <linearGradient id="m-gauge-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#fda4af" />
            <stop offset="30%" stopColor="#fbbf24" />
            <stop offset="52%" stopColor="#fde68a" />
            <stop offset="72%" stopColor="#86efac" />
            <stop offset="100%" stopColor="#34d399" />
          </linearGradient>
          <filter id="m-gauge-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow
              dx="0"
              dy="2"
              stdDeviation="3"
              floodColor={needleColor}
              floodOpacity="0.45"
            />
          </filter>
        </defs>

        <path
          d={describeArc(centerX, centerY, radius, startAngle, endAngle)}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth="26"
          strokeLinecap="round"
        />

        <path
          d={describeArc(centerX, centerY, radius, startAngle, endAngle)}
          fill="none"
          stroke="url(#m-gauge-gradient)"
          strokeWidth="26"
          strokeLinecap="round"
          opacity="0.92"
        />

        {tickSteps.map((step, index) => {
          const point = polarToCartesian(
            centerX,
            centerY,
            radius,
            startAngle + (endAngle - startAngle) * step,
          );
          return (
            <circle
              key={String(step)}
              cx={point.x}
              cy={point.y}
              r={index === 2 ? 11 : 10}
              fill={tickPalette[index]}
              opacity="0.7"
              stroke="#ffffff"
              strokeWidth="1.5"
            />
          );
        })}

        <line
          x1={centerX}
          y1={centerY}
          x2={needlePoint.x}
          y2={needlePoint.y}
          stroke={needleColor}
          strokeWidth="7"
          strokeLinecap="round"
          opacity="0.95"
          filter="url(#m-gauge-glow)"
        />

        <circle cx={centerX} cy={centerY} r="12" fill="#d8dee8" opacity="0.8" />
        <circle cx={centerX} cy={centerY} r="6.5" fill={needleColor} />

        <text
          x={centerX}
          y="52"
          textAnchor="middle"
          style={{
            fontWeight: 700,
            fontSize: "18px",
            fill: headingColor,
          }}
        >
          {headingLabel}
        </text>

        <text
          x="64"
          y="238"
          textAnchor="middle"
          style={{
            fontWeight: 600,
            fontSize: "13px",
            fill: "#9f1239",
          }}
        >
          Strong Sell
        </text>

        <text
          x="296"
          y="238"
          textAnchor="middle"
          style={{
            fontWeight: 600,
            fontSize: "13px",
            fill: "#047857",
          }}
        >
          Strong Buy
        </text>
      </svg>
    </div>
  );
};

export default MomentumGauge;
