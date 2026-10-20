import type { ProjectedCashFlow } from '@/lib/valuation/dcf';

import { money } from './format';

const WIDTH = 340;
const HEIGHT = 140;
const LEFT = 42;
const BOTTOM = 18;
const TOP = 6;

/** Ten years of the buyer's earnings as bars, with bear and bull paths. */
export function EarningsChart({
  active,
  bear,
  bull,
}: {
  active: ProjectedCashFlow[];
  bear: ProjectedCashFlow[];
  bull: ProjectedCashFlow[];
}) {
  const max =
    Math.max(
      ...[active, bear, bull].flatMap((series) =>
        series.map((year) => year.economicCashFlow),
      ),
    ) * 1.1 || 1;
  const barWidth = (WIDTH - LEFT) / active.length;
  const y = (value: number) =>
    TOP + (HEIGHT - TOP - BOTTOM) * (1 - value / max);
  const path = (series: ProjectedCashFlow[]) =>
    series
      .map(
        (year, index) =>
          `${LEFT + index * barWidth + barWidth / 2},${y(year.economicCashFlow)}`,
      )
      .join(' ');

  return (
    <figure className="mt-3">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} width="100%" aria-hidden="true">
        {[0, max / 2, max * 0.9].map((value) => (
          <g key={value}>
            <line
              x1={LEFT}
              x2={WIDTH}
              y1={y(value)}
              y2={y(value)}
              stroke="var(--border)"
            />
            <text
              x={LEFT - 6}
              y={y(value) + 3}
              textAnchor="end"
              className="fill-muted-foreground font-mono text-[10px]"
            >
              {money(value, 0)}
            </text>
          </g>
        ))}
        {active.map((year, index) => (
          <g key={year.year}>
            <rect
              x={LEFT + index * barWidth + 4}
              y={y(year.economicCashFlow)}
              width={barWidth - 8}
              height={HEIGHT - BOTTOM - y(year.economicCashFlow)}
              rx={3}
              fill="var(--foreground)"
              opacity={index < 5 ? 1 : 0.55}
            />
            <text
              x={LEFT + index * barWidth + barWidth / 2}
              y={HEIGHT - 5}
              textAnchor="middle"
              className="fill-muted-foreground font-mono text-[10px]"
            >
              Y{year.year}
            </text>
          </g>
        ))}
        <polyline
          points={path(bear)}
          fill="none"
          stroke="var(--negative)"
          strokeWidth={1.5}
          strokeDasharray="3 3"
        />
        <polyline
          points={path(bull)}
          fill="none"
          stroke="var(--positive)"
          strokeWidth={1.5}
          strokeDasharray="3 3"
        />
      </svg>
      <table className="sr-only">
        <caption>Projected annual earnings for the buyer&apos;s share</caption>
        <thead>
          <tr>
            <th>Year</th>
            <th>Bear</th>
            <th>Selected case</th>
            <th>Bull</th>
          </tr>
        </thead>
        <tbody>
          {active.map((year, index) => (
            <tr key={year.year}>
              <th>Y{year.year}</th>
              <td>{money(bear[index]?.economicCashFlow ?? 0)}</td>
              <td>{money(year.economicCashFlow)}</td>
              <td>{money(bull[index]?.economicCashFlow ?? 0)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
