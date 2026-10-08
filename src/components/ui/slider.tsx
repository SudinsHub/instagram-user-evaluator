import * as React from "react"
import { cn } from "@/lib/utils"

export interface SliderProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  onValueChange: (val: number) => void;
  className?: string;
  disabled?: boolean;
}

export function Slider({
  value,
  min,
  max,
  step = 1,
  onValueChange,
  className,
  disabled = false,
}: SliderProps) {
  const percentage = Math.min(
    100,
    Math.max(0, ((value - min) / (max - min)) * 100)
  );

  return (
    <div className={cn("relative flex w-full touch-none select-none items-center py-2", className)}>
      <div className="relative h-2 w-full grow overflow-hidden rounded-full bg-secondary">
        <div
          className="absolute h-full bg-primary transition-all duration-75"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onValueChange(parseFloat(e.target.value))}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
      />
      <div
        className="pointer-events-none absolute h-4 w-4 rounded-full border-2 border-primary bg-background shadow transition-transform focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        style={{
          left: `calc(${percentage}% - 8px)`,
        }}
      />
    </div>
  );
}
