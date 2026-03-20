"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

interface OnboardingNavProps {
  backHref?: string;
  onSkip: () => void;
  skipLabel?: string;
}

export function OnboardingNav({ backHref, onSkip, skipLabel = "Skip" }: OnboardingNavProps) {
  const router = useRouter();

  return (
    <div className="flex items-center justify-between mb-4">
      {backHref ? (
        <button
          onClick={() => router.push(backHref)}
          className="flex items-center gap-1 text-sm text-muted-foreground"
        >
          <ChevronLeft size={16} />
          Back
        </button>
      ) : (
        <div />
      )}
      <button
        onClick={onSkip}
        className="text-sm text-muted-foreground"
      >
        {skipLabel}
      </button>
    </div>
  );
}
