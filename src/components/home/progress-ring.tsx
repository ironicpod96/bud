"use client";

interface ProgressRingProps {
  percentage: number; // 0 to 1
  remaining: number;
  size?: number;
}

export function ProgressRing({
  percentage,
  remaining,
  size = 200,
}: ProgressRingProps) {
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.max(0, Math.min(1, percentage)));

  let ringColor = "var(--foreground)"; // white in dark mode
  if (percentage <= 0.25) ringColor = "var(--accent-red)";
  else if (percentage <= 0.5) ringColor = "var(--accent-yellow)";

  const isNegative = remaining < 0;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/30"
        />
        {/* Progress arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={ringColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="text-5xl font-black tracking-tight"
          style={isNegative ? { color: "var(--accent-red)" } : undefined}
        >
          RM{isNegative ? "-" : ""}
          {Math.abs(Math.round(remaining))}
        </span>
        <span className="text-base text-muted-foreground font-medium">remaining</span>
      </div>
    </div>
  );
}
