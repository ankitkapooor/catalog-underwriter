'use client';

import type { CSSProperties } from 'react';

import { cn } from '@/lib/utils';

import { signedMoney } from './format';

/**
 * One adjustable term of the underwrite: a plain-language explanation, an
 * exact number field, a slider with the default marked, and how much the
 * term is currently moving the value compared with its default.
 */
export function Term({
  id,
  label,
  explanation,
  value,
  defaultValue,
  min,
  max,
  step,
  unit,
  format,
  onChange,
  impact,
  disabled = false,
  tag,
}: {
  id: string;
  label: string;
  explanation: string;
  /** In display units (e.g. 8.5 for 8.5%); NaN when blank. */
  value: number;
  defaultValue: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  format: (value: number) => string;
  onChange: (value: number) => void;
  /** Change in value versus the default, in dollars. */
  impact?: number | null;
  disabled?: boolean;
  tag?: string;
}) {
  const finite = Number.isFinite(value);
  const sliderValue = Math.min(
    max,
    Math.max(min, finite ? value : defaultValue),
  );
  const fill = ((sliderValue - min) / (max - min)) * 100;
  const defaultPosition = ((defaultValue - min) / (max - min)) * 100;
  const edited = !finite || Math.abs(value - defaultValue) > 1e-9;

  return (
    <div className="grid gap-x-7 gap-y-2 border-b border-border py-4 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_minmax(0,16.5rem)] sm:items-center">
      <div className="min-w-0">
        <label htmlFor={id} className="font-semibold">
          {label}
          {tag ? (
            <span className="uw-badge">{tag}</span>
          ) : edited && !disabled ? (
            <span className="uw-badge">edited</span>
          ) : null}
        </label>
        <p className="mt-0.5 max-w-[54ch] text-[13px] leading-5 text-muted-foreground">
          {explanation}
        </p>
      </div>
      <div className="grid min-w-0 gap-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="flex items-baseline gap-1">
            <input
              id={id}
              type="number"
              className="uw-number"
              // Rounded so 0.28 × 100 shows as 28, not 28.000000000000004.
              value={finite ? Number(value.toFixed(6)) : ''}
              step={step}
              disabled={disabled}
              onChange={(event) =>
                onChange(
                  event.target.value === ''
                    ? Number.NaN
                    : Number(event.target.value),
                )
              }
            />
            <span className="font-mono text-xs text-muted-foreground">
              {unit}
            </span>
          </span>
          {impact != null && Math.abs(impact) >= 1 && (
            <span
              className={cn(
                'font-mono text-xs',
                impact > 0 ? 'text-positive' : 'text-negative',
              )}
              title="Change in value versus the default"
            >
              {signedMoney(impact)}
            </span>
          )}
        </div>
        <span
          className="uw-track"
          style={{ '--default': defaultPosition } as CSSProperties}
        >
          <input
            type="range"
            aria-label={`${label} slider`}
            className="uw-range"
            min={min}
            max={max}
            step={step}
            value={sliderValue}
            disabled={disabled}
            style={{ '--fill': `${fill}%` } as CSSProperties}
            onChange={(event) => onChange(Number(event.target.value))}
          />
        </span>
        <div className="flex justify-between gap-2 font-mono text-[11px] text-muted-foreground">
          <span>{format(min)}</span>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onChange(defaultValue)}
            className="hover:text-accent disabled:opacity-50"
          >
            Default {format(defaultValue)}
          </button>
          <span>{format(max)}</span>
        </div>
      </div>
    </div>
  );
}
