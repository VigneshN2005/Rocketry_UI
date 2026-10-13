import type { ReactNode } from "react";

export type Status = "OK" | "WARN" | "FAIL" | "OFF";

export const STATUS_COLOR: Record<Status, string> = {
  OK: "var(--ok)",
  WARN: "var(--warn)",
  FAIL: "var(--destructive)",
  OFF: "var(--muted-foreground)",
};

export function PanelTitle({
  title,
  right,
  icon,
}: {
  title: string;
  right?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 min-w-0">
        {icon ? <span style={{ color: "var(--cansat)" }}>{icon}</span> : null}
        <span className="label-mono truncate" style={{ color: "oklch(0.86 0.04 250)" }}>
          {title}
        </span>
      </div>
      {right ? <div className="shrink-0">{right}</div> : null}
    </div>
  );
}

export function StatusChip({ status, text }: { status: Status; text?: string }) {
  const c = STATUS_COLOR[status];
  return (
    <span
      className="label-mono text-[9px] px-1.5 py-0.5 rounded border whitespace-nowrap"
      style={{ color: c, borderColor: c }}
    >
      {text ?? status}
    </span>
  );
}

/** Value box in the style of the mission-control flight-parameters panel. */
export function ValueBox({
  label,
  unit,
  value,
  color,
  sub,
}: {
  label: string;
  unit?: string;
  value: string;
  color?: string;
  sub?: string;
}) {
  return (
    <div className="rounded-lg overflow-hidden border border-border bg-[oklch(0.15_0.03_255)]">
      <div
        className="flex items-center justify-between px-3 py-1 value-label"
        style={{ background: "oklch(0.26 0.05 255)", color: "oklch(0.92 0.03 250)" }}
      >
        <span>{label}</span>
        {unit ? <span style={{ opacity: 0.75 }}>{unit}</span> : null}
      </div>
      <div className="px-3 py-2 text-center">
        <span className="readout text-[30px] leading-none" style={{ color: color ?? "oklch(0.97 0 0)" }}>
          {value}
        </span>
        {sub ? <div className="label-mono text-[9px] mt-1 opacity-70">{sub}</div> : null}
      </div>
    </div>
  );
}

export function Stat({
  label,
  value,
  unit,
  color,
  small,
}: {
  label: string;
  value: string | number;
  unit?: string;
  color?: string;
  small?: boolean;
}) {
  return (
    <div className="well p-2">
      <div className="label-mono text-[9px]" style={{ color: color ?? undefined }}>
        {label}
      </div>
      <div className="flex items-baseline gap-1">
        <span className={small ? "readout text-sm" : "readout text-lg"}>{value}</span>
        {unit ? <span className="label-mono text-[9px]">{unit}</span> : null}
      </div>
    </div>
  );
}

export function Bar({
  value,
  max,
  min = 0,
  color = "var(--cansat)",
  mark,
  height = 6,
}: {
  value: number;
  max: number;
  min?: number;
  color?: string;
  /** optional threshold marker in value units */
  mark?: number;
  height?: number;
}) {
  const pct = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
  const mp = mark === undefined ? null : Math.max(0, Math.min(100, ((mark - min) / (max - min)) * 100));
  return (
    <div className="relative rounded-full bg-[oklch(0.22_0.04_255)] overflow-hidden" style={{ height }}>
      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      {mp !== null ? (
        <div
          className="absolute top-0 h-full w-px"
          style={{ left: `${mp}%`, background: "oklch(0.97 0 0)", opacity: 0.8 }}
        />
      ) : null}
    </div>
  );
}

export function KV({ k, v, unit, color }: { k: string; v: string; unit?: string; color?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-[3px] border-b border-border/40 last:border-0">
      <span className="label-mono text-[9.5px]">{k}</span>
      <span className="readout text-[12px]" style={{ color }}>
        {v}
        {unit ? <span className="label-mono text-[9px] ml-1">{unit}</span> : null}
      </span>
    </div>
  );
}

export const f0 = (x: number) => x.toFixed(0);
export const f1 = (x: number) => x.toFixed(1);
export const f2 = (x: number) => x.toFixed(2);
export const f3 = (x: number) => x.toFixed(3);
export const pad3 = (x: number) => Math.abs(x).toFixed(1).padStart(5, "0");
