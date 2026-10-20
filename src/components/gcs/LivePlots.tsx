import { useState } from "react";
import { Pause, Play, RotateCcw, ZoomIn } from "lucide-react";
import type { CansatFrame, HistRow } from "./telemetry";
import { SeriesChart, type LineSpec } from "./SeriesChart";
import { f0, f1, f2 } from "./Kit";

const CYAN = "oklch(0.82 0.12 210)";
const GREEN = "oklch(0.78 0.15 155)";
const YELLOW = "oklch(0.88 0.15 98)";
const AMBER = "oklch(0.8 0.16 70)";
const ALT = "oklch(0.74 0.15 20)";
const VIOLET = "oklch(0.74 0.12 300)";
const WHITE = "oklch(0.92 0.02 250)";

type ParamDef = {
  id: string;
  label: string;
  unit?: string;
  lines: LineSpec[];
  /** placeholder: sensor not defined yet, nothing to plot */
  placeholder?: string;
  domainRight?: [number, number];
};

const PARAMS: ParamDef[] = [
  { id: "alt", label: "Altitude", unit: "m", lines: [{ key: "alt", label: "Altitude", color: ALT, width: 2.2 }] },
  {
    id: "vel",
    label: "Velocity",
    unit: "m/s",
    lines: [
      { key: "vz", label: "Descent", color: YELLOW, width: 2.2 },
      { key: "vref", label: "Plan", color: WHITE, dashed: true },
      { key: "gspeed", label: "Ground", color: CYAN },
    ],
  },
  { id: "press", label: "Pressure", unit: "hPa", lines: [{ key: "press", label: "Pressure", color: CYAN }] },
  { id: "temp", label: "Temperature", unit: "°C", lines: [{ key: "temp", label: "SHT30 temp", color: ALT }] },
  {
    id: "batt",
    label: "Battery",
    unit: "V",
    lines: [
      { key: "busV", label: "Bus V", color: GREEN, width: 2.2 },
      { key: "curr", label: "mA", color: YELLOW, axis: "right" },
    ],
  },
  {
    id: "rad",
    label: "Radiation",
    placeholder: "Sensor not fitted. Waiting for the CanSat team to define this payload.",
    lines: [],
  },
  {
    id: "ir",
    label: "IR temperature",
    placeholder: "Sensor not fitted. Waiting for the CanSat team to define this payload.",
    lines: [],
  },
  {
    id: "err",
    label: "Position error",
    unit: "m",
    lines: [
      { key: "errG", label: "GNSS", color: YELLOW },
      { key: "errV", label: "Vision est.", color: GREEN },
      { key: "miss", label: "Predicted miss", color: AMBER, dashed: true },
    ],
  },
  {
    id: "att",
    label: "Attitude",
    unit: "deg",
    lines: [
      { key: "roll", label: "Roll", color: CYAN },
      { key: "pitch", label: "Pitch", color: AMBER },
    ],
  },
  {
    id: "thrust",
    label: "Thrust and image match",
    lines: [
      { key: "thrust", label: "Thrust %", color: VIOLET },
      { key: "c", label: "Match score", color: GREEN, axis: "right" },
    ],
    domainRight: [0, 1],
  },
  {
    id: "acc",
    label: "Acceleration",
    unit: "m/s²",
    lines: [
      { key: "ax", label: "X", color: CYAN },
      { key: "ay", label: "Y", color: GREEN },
      { key: "az", label: "Z", color: YELLOW },
    ],
  },
  {
    id: "gyro",
    label: "Gyroscope",
    unit: "°/s",
    lines: [
      { key: "gx", label: "X", color: CYAN },
      { key: "gy", label: "Y", color: GREEN },
      { key: "gz", label: "Z", color: YELLOW },
    ],
  },
  {
    id: "rssi",
    label: "Link RSSI and SNR",
    lines: [
      { key: "rssi", label: "RSSI dBm", color: CYAN },
      { key: "snr", label: "SNR dB", color: GREEN, axis: "right" },
    ],
  },
];

const DEFAULT_ON = ["alt", "vel", "press", "temp", "batt", "rad", "ir"];
const WINDOWS: { label: string; s: number | null }[] = [
  { label: "20 s", s: 20 },
  { label: "60 s", s: 60 },
  { label: "2 min", s: 120 },
  { label: "ALL", s: null },
];

export function LivePlots({ f }: { f: CansatFrame }) {
  const [on, setOn] = useState<string[]>(DEFAULT_ON);
  const [frozen, setFrozen] = useState<HistRow[] | null>(null);
  const [win, setWin] = useState<number | null>(null);
  const [clearT, setClearT] = useState(0);

  const source = frozen ?? f.history;
  const lastT = source.at(-1)?.t ?? 0;
  const base = lastT < clearT ? 0 : clearT; // simulation restarted: forget old clear mark
  let data = base > 0 ? source.filter((r) => r.t > base) : source;
  if (win !== null && data.length) {
    const lo = (data.at(-1)?.t ?? 0) - win;
    data = data.filter((r) => r.t >= lo);
  }
  const stamp = new Date(f.lastPacketAt || Date.now()).toISOString().slice(11, 19);

  const toggle = (id: string) => setOn((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  return (
    <div className="h-full overflow-y-auto scroll-thin p-3 flex flex-col gap-3">
      {/* numeric cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-2">
        <Card label="Altitude" value={f1(f.altitude)} unit="m" color={ALT} stamp={stamp} />
        <Card label="Velocity" value={f2(f.speed3d)} unit="m/s" color={YELLOW} stamp={stamp} />
        <Card label="Temperature" value={f1(f.sht.temp)} unit="°C" color={ALT} stamp={stamp} />
        <Card label="Battery" value={f2(f.ina.busV)} unit="V" color={f.ina.busV < 7 ? "oklch(0.72 0.19 35)" : GREEN} stamp={stamp} />
        <Card
          label="GPS"
          value={f.gnss.fix === "3D" ? `${f.gnss.sats} sats` : "NO FIX"}
          sub={`${f.gnss.lat.toFixed(4)}, ${f.gnss.lon.toFixed(4)}`}
          color={f.gnss.fix === "3D" ? GREEN : "oklch(0.72 0.19 35)"}
          stamp={stamp}
        />
        <Card label="Link" value={`${f0(f.linkQuality)} %`} sub={`${f0(f.rssi)} dBm · ${f1(f.snr)} dB`} color={CYAN} stamp={stamp} />
        <Card label="Radiation" value="—" sub="NOT FITTED" color="oklch(0.6 0.02 250)" placeholder />
        <Card label="IR temp" value="—" sub="NOT FITTED" color="oklch(0.6 0.02 250)" placeholder />
      </div>

      {/* controls */}
      <div className="panel p-2.5 flex flex-wrap items-center gap-2">
        <button onClick={() => setFrozen((cur) => (cur ? null : f.history))} className={btn} style={{ color: frozen ? "var(--warn)" : undefined }}>
          {frozen ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
          {frozen ? "Resume plots" : "Pause plots"}
        </button>
        <button onClick={() => setClearT(lastT)} className={btn}>
          <RotateCcw className="h-3 w-3" /> Clear
        </button>
        <button
          onClick={() => {
            setClearT(0);
            setWin(null);
            setFrozen(null);
            setOn(DEFAULT_ON);
          }}
          className={btn}
        >
          Reset
        </button>
        <span className="label-mono text-[9px] ml-2 flex items-center gap-1">
          <ZoomIn className="h-3 w-3" /> Zoom
        </span>
        {WINDOWS.map((w) => (
          <button
            key={w.label}
            onClick={() => setWin(w.s)}
            className={btn}
            style={{ borderColor: win === w.s ? "var(--cansat)" : undefined, color: win === w.s ? "var(--cansat)" : undefined }}
          >
            {w.label}
          </button>
        ))}
        <span className="label-mono text-[9px] opacity-70 ml-auto">
          {frozen ? "PAUSED · " : "LIVE · "}
          {data.length} samples · hover a plot for the time stamp
        </span>
      </div>

      {/* parameter picker */}
      <div className="flex flex-wrap gap-1.5">
        {PARAMS.map((p) => {
          const active = on.includes(p.id);
          return (
            <button
              key={p.id}
              onClick={() => toggle(p.id)}
              className="px-2.5 py-1 rounded-full border label-mono text-[9.5px]"
              style={{
                borderColor: active ? "var(--cansat)" : "var(--color-border)",
                color: active ? "oklch(0.97 0 0)" : undefined,
                background: active ? "oklch(0.26 0.06 235 / 0.7)" : undefined,
              }}
            >
              {p.label}
              {p.placeholder ? " · NOT FITTED" : ""}
            </button>
          );
        })}
      </div>

      {/* plots */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-2.5">
        {PARAMS.filter((p) => on.includes(p.id)).map((p) =>
          p.placeholder ? (
            <div
              key={p.id}
              className="well p-3 flex flex-col items-center justify-center text-center gap-1"
              style={{ height: 196, borderStyle: "dashed" }}
            >
              <span className="label-mono text-[10px]" style={{ color: "oklch(0.86 0.04 250)" }}>
                {p.label}
              </span>
              <span className="readout text-xl opacity-50">NOT FITTED</span>
              <span className="text-[11px] opacity-60 max-w-[300px]">{p.placeholder}</span>
            </div>
          ) : (
            <SeriesChart
              key={p.id}
              title={p.label}
              unit={p.unit}
              data={data}
              lines={p.lines}
              domainRight={p.domainRight}
              height={170}
              xAuto={win !== null || base > 0}
            />
          ),
        )}
      </div>
    </div>
  );
}

const btn = "panel px-2.5 py-1 label-mono text-[9.5px] flex items-center gap-1 hover:bg-[oklch(0.25_0.045_255)]";

function Card({
  label,
  value,
  unit,
  sub,
  color,
  stamp,
  placeholder,
}: {
  label: string;
  value: string;
  unit?: string;
  sub?: string;
  color: string;
  stamp?: string;
  placeholder?: boolean;
}) {
  return (
    <div className="well px-2.5 py-2 flex flex-col gap-0.5" style={placeholder ? { borderStyle: "dashed", opacity: 0.7 } : undefined}>
      <span className="label-mono text-[9px]">{label}</span>
      <div className="flex items-baseline gap-1">
        <span className="readout text-xl" style={{ color }}>
          {value}
        </span>
        {unit ? <span className="label-mono text-[9px]">{unit}</span> : null}
      </div>
      <span className="label-mono text-[8.5px] opacity-70 truncate">{sub ?? (stamp ? `${stamp} UTC` : "")}</span>
    </div>
  );
}
