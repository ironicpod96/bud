interface AmountDisplayProps {
  amount: number;
  size?: "sm" | "md" | "lg" | "xl";
  showSign?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: "text-base",
  md: "text-xl",
  lg: "text-3xl",
  xl: "text-5xl",
};

export function AmountDisplay({
  amount,
  size = "md",
  showSign = false,
  className = "",
}: AmountDisplayProps) {
  const formatted = Math.abs(amount).toLocaleString("en-MY", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  const sign = showSign && amount > 0 ? "+" : amount < 0 ? "-" : "";

  return (
    <span className={`${sizeClasses[size]} ${className}`}>
      <span className="font-normal text-muted-foreground">RM</span>{" "}
      <span className="font-bold">
        {sign}
        {formatted}
      </span>
    </span>
  );
}

export function formatRM(amount: number): string {
  return `RM ${Math.abs(amount).toLocaleString("en-MY", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}
