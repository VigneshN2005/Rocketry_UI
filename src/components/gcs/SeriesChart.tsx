import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { HistRow, MissionEventRec } from "./telemetry";

export type NumKey = keyof HistRow;

export type LineSpec = {
  key: NumKey;
  label: string;
  color: string;
  dashed?: boolean;
  axis?: "left" | "right";
  width?: number;
};

const AXIS = "oklch(0.66 0.03 250)";
const GRID = "oklch(0.3 0.04 255 / 0.55)";

const tooltipStyle = {
  background: "oklch(0.18 0.035 255)",
  border: "1px solid oklch(0.34 0.05 255)",
  borderRadius: 8,
  fontSize: 11,
  padding: "6px 8px",
};

const xDomain: [number, (dataMax: number) => number] = [0, (m) => Math.max(60, Math.ceil(m / 20) * 20)];

function EventPill({ viewBox, text, row }: { viewBox?: { x?: number; y?: number }; text: string; row: number }) {
  const x = viewBox?.x ?? 0;
  const y = (viewBox?.y ?? 0) + 6 + row * 20;
  const w = text.length * 6.1 + 14;
  return (
    <g transform={`translate(${x - w / 2}, ${y})`}>
      <rect width={w} height={16} rx={8} fill="oklch(0.36 0.03 255 / 0.92)" />
      <text x={w / 2} y={11.5} textAnchor="middle" fontSize={9.5} fontWeight={700} fill="oklch(0.97 0 0)">
        {text}
      </text>
    </g>
  );
}

function Events({ events, max }: { events?: MissionEventRec[]; max: number }) {
  if (!events) return null;
  const shown = events.filter((e) => e.t >= 0 && e.t <= max && e.label !== "MOTORS OFF");
  return (
    <>
      {shown.map((e, i) => (
        <ReferenceLine
          key={`${e.label}-${i}`}
          x={Math.round(e.t)}
          yAxisId="left"
          ifOverflow="visible"
          stroke="oklch(0.88 0.15 98 / 0.55)"
          strokeDasharray="3 3"
          label={<EventPill text={e.label} row={i % 3} />}
        />
      ))}
    </>
  );
}

export function SeriesChart({
  title,
  unit,
  data,
  lines,
  height = 150,
  events,
  rightUnit,
  domainLeft,
  domainRight,
  showEvents = false,
  legend = true,
  big,
}: {
  title?: string;
  unit?: string;
  data: HistRow[];
  lines: LineSpec[];
  height?: number;
  events?: MissionEventRec[];
  rightUnit?: string;
  domainLeft?: [number | string, number | string];
  domainRight?: [number | string, number | string];
  showEvents?: boolean;
  legend?: boolean;
  big?: boolean;
}) {
  const hasRight = lines.some((l) => l.axis === "right");
  const last = data.at(-1);
  const maxT = last ? last.t : 0;
  return (
    <div className="well p-2.5 flex flex-col gap-1.5">
      {title ? (
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className="label-mono text-[10px]" style={{ color: "oklch(0.86 0.04 250)" }}>
            {title}
            {unit ? <span className="opacity-60"> · {unit}</span> : null}
          </span>
          {legend ? (
            <div className="flex items-center gap-3 flex-wrap">
              {lines.map((l) => (
                <span key={l.key} className="flex items-center gap-1.5 label-mono text-[9px]">
                  <span
                    className="inline-block h-[3px] w-3 rounded"
                    style={{ background: l.color, opacity: l.dashed ? 0.7 : 1 }}
                  />
                  {l.label}
                  {last ? (
                    <span className="readout text-[10px]" style={{ color: l.color }}>
                      {fmt(last[l.key] as number | null)}
                    </span>
                  ) : null}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: showEvents ? 34 : 6, right: hasRight ? 6 : 10, left: -8, bottom: 0 }}>
            <CartesianGrid stroke={GRID} strokeDasharray="2 4" />
            <XAxis
              dataKey="t"
              type="number"
              domain={xDomain}
              tick={{ fill: AXIS, fontSize: 10 }}
              tickLine={false}
              axisLine={{ stroke: GRID }}
              label={big ? { value: "TIME [s]", position: "insideBottom", offset: -2, fill: AXIS, fontSize: 10 } : undefined}
            />
            <YAxis
              yAxisId="left"
              domain={domainLeft ?? ["auto", "auto"]}
              tick={{ fill: AXIS, fontSize: 10 }}
              tickLine={false}
              axisLine={{ stroke: GRID }}
              width={44}
              label={
                big && unit
                  ? { value: unit, angle: -90, position: "insideLeft", fill: AXIS, fontSize: 10, offset: 14 }
                  : undefined
              }
            />
            {hasRight ? (
              <YAxis
                yAxisId="right"
                orientation="right"
                domain={domainRight ?? ["auto", "auto"]}
                tick={{ fill: "oklch(0.74 0.15 20)", fontSize: 10 }}
                tickLine={false}
                axisLine={{ stroke: GRID }}
                width={44}
                label={
                  big && rightUnit
                    ? { value: rightUnit, angle: 90, position: "insideRight", fill: "oklch(0.74 0.15 20)", fontSize: 10, offset: 14 }
                    : undefined
                }
              />
            ) : null}
            <Tooltip
              contentStyle={tooltipStyle}
              labelStyle={{ color: "oklch(0.8 0.03 250)" }}
              labelFormatter={(v) => `T+ ${v} s`}
              formatter={(v, name) => [typeof v === "number" ? v.toFixed(2) : String(v), String(name)]}
            />
            {showEvents ? <Events events={events} max={maxT} /> : null}
            {lines.map((l) => (
              <Line
                key={l.key}
                yAxisId={l.axis ?? "left"}
                type="monotone"
                dataKey={l.key}
                name={l.label}
                stroke={l.color}
                strokeWidth={l.width ?? 1.8}
                strokeDasharray={l.dashed ? "5 4" : undefined}
                dot={false}
                isAnimationActive={false}
                connectNulls={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function fmt(v: number | null | undefined): string {
  if (v === null || v === undefined || Number.isNaN(v)) return "—";
  return Math.abs(v) >= 100 ? v.toFixed(0) : v.toFixed(1);
}
