"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface SliderProps {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  className?: string;
  onValueChange: (value: number) => void;
}

/** Tek tutamaçlı, native range tabanlı slider (Radix bağımlılığı yok). */
const Slider = React.forwardRef<HTMLInputElement, SliderProps>(
  (
    { value, min = 0, max = 100, step = 1, disabled, className, onValueChange },
    ref
  ) => {
    const pct = ((value - min) / (max - min)) * 100;
    return (
      <input
        ref={ref}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onValueChange(Number(e.target.value))}
        className={cn(
          "h-2 w-full cursor-pointer appearance-none rounded-full bg-secondary outline-none disabled:opacity-50",
          "[&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow",
          "[&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-primary",
          className
        )}
        style={{
          background: `linear-gradient(to right, hsl(var(--primary)) ${pct}%, hsl(var(--secondary)) ${pct}%)`,
        }}
      />
    );
  }
);
Slider.displayName = "Slider";

export { Slider };
