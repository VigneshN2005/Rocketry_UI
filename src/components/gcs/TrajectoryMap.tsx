import { Navigation, Wind } from "lucide-react";
import { RINGS_M, FLAPS_ALT, PROP_ALT } from "./mission";
import type { CansatFrame, TrackPt } from "./telemetry";
import { PanelTitle, f1, f0 } from "./Kit";

const YELLOW = "oklch(0.88 0.15 98)";
const GREEN = "oklch(0.78 0.15 155)";
const CYAN = "oklch(0.82 0.12 210)";
const AMBER = "oklch(0.8 0.16 70)";
const RED = "oklch(0.68 0.22 25)";
const CTRL = new Set<string>(["L3", "L4", "L5", "L6", "L7", "L8"]);

function niceStep(raw: number): number {
  const steps = [10, 20, 25, 50, 100, 200, 250, 500, 1000];
  return steps.find((s) => s >= raw) ?? 1000;
}

function runs(points: TrackPt[]): { ctrl: boolean; pts: TrackPt[] }[] {
  const out: { ctrl: boolean; pts: TrackPt[] }[] = [];
  for (const p of points) {
    const last = out.at(-1);
    if (!last || last.ctrl !== p.ctrl) {
      out.push({ ctrl: p.ctrl, pts: last ? [last.pts.at(-1)!, p] : [p] });
    } else last.pts.push(p);
  }
  return out;
}

const toPath = (pts: TrackPt[]) => pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.e.toFixed(1)},${(-p.n).toFixed(1)}`).join(" ");

export function TrajectoryMap({ f }: { f: CansatFrame }) {
  const tE = f.targetE;
  const tN = f.targetN;
  const live: TrackPt | null =
    f.met >= 0
      ? {
          e: f.posE + tE,
          n: f.posN + tN,
          alt: f.altitude,
          t: f.met,
          ctrl: CTRL.has(f.landing),
        }
      : null;
  const track = live ? [...f.path, live] : f.path;

  const view = (() => {
    const pts: [number, number][] = [
      [f.padE, f.padN],
      [tE, tN],
      [tE - 120, tN - 80],
      [tE + 120, tN + 80],
      [tE + f.impactE, tN + f.impactN],
    ];
    for (const p of f.passivePath) pts.push([p.e, p.n]);
    for (const p of track) pts.push([p.e, p.n]);
    let minE = Math.min(...pts.map((p) => p[0]));
    let maxE = Math.max(...pts.map((p) => p[0]));
    let minN = Math.min(...pts.map((p) => p[1]));
    let maxN = Math.max(...pts.map((p) => p[1]));
    const pad = Math.max(maxE - minE, (maxN - minN) * 1.6) * 0.1 + 20;
    minE -= pad;
    maxE += pad;
    minN -= pad;
    maxN += pad;
    let w = maxE - minE;
    let h = maxN - minN;
    const aspect = 1.7;
    if (w / h < aspect) {
      const nw = h * aspect;
      minE -= (nw - w) / 2;
      w = nw;
    } else {
      const nh = w / aspect;
      minN -= (nh - h) / 2;
      h = nh;
    }
    return { minE, minN, w, h };
  })();

  const fs = view.w / 62;
  const step = niceStep(view.w / 7);
  const gridX: number[] = [];
  const gridY: number[] = [];
  for (let k = Math.ceil((view.minE - tE) / step); tE + k * step <= view.minE + view.w; k++) gridX.push(tE + k * step);
  for (let k = Math.ceil((view.minN - tN) / step); tN + k * step <= view.minN + view.h; k++) gridY.push(tN + k * step);

  const eventsOnMap = f.events.filter((e) => e.t >= 0 && e.label !== "MOTORS OFF" && e.label !== "MISSION COMPLETE");
  const eventPts = eventsOnMap.map((e, i) => {
    const near = f.path.reduce<TrackPt | null>(
      (best, p) => (best === null || Math.abs(p.t - e.t) < Math.abs(best.t - e.t) ? p : best),
      null,
    );
    return { ...e, p: near, i };
  });

  const descending = f.state === "PRIMARY_DESCENT" || f.state === "CONTROLLED_DESCENT" || f.state === "EJECTION";
  const bannerText =
    f.state === "MISSION_COMPLETE"
      ? "MISSION COMPLETE"
      : (f.events.at(-1)?.label ?? "AWAITING SEPARATION");

  const wTo = (f.windFrom + 180) % 360;

  return (
    <div className="panel p-3 flex flex-col gap-2">
      <PanelTitle
        title="CanSat Mission · Descent Trajectory"
        icon={<Navigation className="h-3.5 w-3.5" />}
        right={
          <span className="label-mono text-[9px]">
            GRID {step} m · TARGET {f.targetLat.toFixed(5)}°N {f.targetLon.toFixed(5)}°E
          </span>
        }
      />
      <div
        className="relative rounded-lg overflow-hidden border border-border"
        style={{
          background:
            "radial-gradient(120% 90% at 50% 100%, oklch(0.27 0.07 245) 0%, oklch(0.16 0.04 260) 55%, oklch(0.12 0.03 265) 100%)",
        }}
      >
        <svg
          viewBox={`${view.minE} ${-(view.minN + view.h)} ${view.w} ${view.h}`}
          className="w-full block"
          style={{ aspectRatio: "1.7 / 1" }}
          preserveAspectRatio="xMidYMid meet"
        >
          {/* grid */}
          {gridX.map((x) => (
            <g key={`gx${x}`}>
              <line x1={x} x2={x} y1={-(view.minN + view.h)} y2={-view.minN} stroke="oklch(0.5 0.05 250 / 0.22)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
              <text x={x + fs * 0.25} y={-view.minN - fs * 0.5} fontSize={fs * 0.8} fill="oklch(0.72 0.03 250 / 0.8)">
                {Math.round(x - tE)}
              </text>
            </g>
          ))}
          {gridY.map((y) => (
            <g key={`gy${y}`}>
              <line x1={view.minE} x2={view.minE + view.w} y1={-y} y2={-y} stroke="oklch(0.5 0.05 250 / 0.22)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
              <text x={view.minE + fs * 0.4} y={-y - fs * 0.3} fontSize={fs * 0.8} fill="oklch(0.72 0.03 250 / 0.8)">
                {Math.round(y - tN)}
              </text>
            </g>
          ))}

          {/* target rings */}
          {RINGS_M.filter((r) => r > view.w / 45 && r < view.w * 0.9).map((r) => (
            <g key={`ring${r}`}>
              <circle cx={tE} cy={-tN} r={r} fill={r === 25 ? "oklch(0.78 0.15 155 / 0.1)" : "none"} stroke="oklch(0.85 0.1 100 / 0.5)" strokeWidth={1.2} strokeDasharray="6 5" vectorEffect="non-scaling-stroke" />
              <text x={tE + r * 0.707 + fs * 0.3} y={-tN - r * 0.707} fontSize={fs * 0.8} fill="oklch(0.88 0.1 100 / 0.85)">
                {r} m
              </text>
            </g>
          ))}

          {/* forecast drift (uncontrolled) */}
          {f.passivePath.length > 1 ? (
            <path d={toPath(f.passivePath)} fill="none" stroke="oklch(0.92 0.02 250 / 0.55)" strokeWidth={1.6} strokeDasharray="7 6" vectorEffect="non-scaling-stroke" />
          ) : null}

          {/* actual track: chute phase yellow, powered phase green */}
          {runs(track).map((r, i) => (
            <path key={i} d={toPath(r.pts)} fill="none" stroke={r.ctrl ? GREEN : YELLOW} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          ))}

          {/* pad */}
          <g>
            <rect x={f.padE - fs * 0.5} y={-f.padN - fs * 0.5} width={fs} height={fs} fill="none" stroke="oklch(0.92 0.02 250)" strokeWidth={1.6} vectorEffect="non-scaling-stroke" />
            <text x={f.padE + fs * 0.9} y={-f.padN + fs * 0.35} fontSize={fs * 0.9} fill="oklch(0.92 0.02 250)" fontWeight={700}>
              PAD
            </text>
          </g>

          {/* event markers */}
          {eventPts.map((e) => {
            if (!e.p) return null;
            const w = e.label.length * fs * 0.62 + fs * 1.3;
            const dx = fs * 1.2;
            const dy = (e.i % 2 === 0 ? -1 : 1) * fs * 2.1;
            return (
              <g key={`${e.label}-${e.i}`}>
                <line x1={e.p.e} y1={-e.p.n} x2={e.p.e + dx} y2={-e.p.n + dy} stroke="oklch(0.95 0 0 / 0.55)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
                <rect x={e.p.e - fs * 0.4} y={-e.p.n - fs * 0.4} width={fs * 0.8} height={fs * 0.8} fill={RED} />
                <g transform={`translate(${e.p.e + dx}, ${-e.p.n + dy})`}>
                  <rect x={0} y={-fs * 0.85} width={w} height={fs * 1.7} rx={fs * 0.85} fill="oklch(0.36 0.03 255 / 0.92)" />
                  <text x={w / 2} y={fs * 0.33} textAnchor="middle" fontSize={fs * 0.82} fontWeight={700} fill="oklch(0.97 0 0)">
                    {e.label}
                  </text>
                </g>
              </g>
            );
          })}

          {/* target */}
          <g>
            <circle cx={tE} cy={-tN} r={fs * 0.9} fill="none" stroke={GREEN} strokeWidth={2} vectorEffect="non-scaling-stroke" />
            <line x1={tE - fs * 1.6} x2={tE + fs * 1.6} y1={-tN} y2={-tN} stroke={GREEN} strokeWidth={1.6} vectorEffect="non-scaling-stroke" />
            <line x1={tE} x2={tE} y1={-tN - fs * 1.6} y2={-tN + fs * 1.6} stroke={GREEN} strokeWidth={1.6} vectorEffect="non-scaling-stroke" />
            <text x={tE + fs * 1.3} y={-tN - fs * 1.2} fontSize={fs * 0.95} fill={GREEN} fontWeight={700}>
              TARGET
            </text>
          </g>

          {/* predicted landing point */}
          {descending && live ? (
            <g>
              <line x1={live.e} y1={-live.n} x2={tE + f.impactE} y2={-(tN + f.impactN)} stroke={AMBER} strokeWidth={1.4} strokeDasharray="3 4" vectorEffect="non-scaling-stroke" />
              <path
                d={`M${tE + f.impactE},${-(tN + f.impactN) - fs * 0.8} l${fs * 0.8},${fs * 0.8} l${-fs * 0.8},${fs * 0.8} l${-fs * 0.8},${-fs * 0.8} z`}
                fill={AMBER}
                fillOpacity={0.35}
                stroke={AMBER}
                strokeWidth={1.6}
                vectorEffect="non-scaling-stroke"
              />
              <text x={tE + f.impactE + fs} y={-(tN + f.impactN) + fs * 2.2} fontSize={fs * 0.8} fill={AMBER}>
                PREDICTED LANDING
              </text>
            </g>
          ) : null}

          {/* live position + course arrow */}
          {live ? (
            <g>
              {f.groundSpeed > 0.2 ? (
                <line
                  x1={live.e}
                  y1={-live.n}
                  x2={live.e + Math.sin((f.course * Math.PI) / 180) * fs * (2.5 + f.groundSpeed)}
                  y2={-live.n - Math.cos((f.course * Math.PI) / 180) * fs * (2.5 + f.groundSpeed)}
                  stroke="oklch(0.97 0 0)"
                  strokeWidth={2}
                  vectorEffect="non-scaling-stroke"
                />
              ) : null}
              <circle cx={live.e} cy={-live.n} r={fs * 0.9} fill={CYAN} fillOpacity={0.25}>
                <animate attributeName="r" values={`${fs * 0.7};${fs * 1.5};${fs * 0.7}`} dur="1.6s" repeatCount="indefinite" />
              </circle>
              <circle cx={live.e} cy={-live.n} r={fs * 0.55} fill={CYAN} stroke="oklch(0.15 0.03 255)" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
            </g>
          ) : null}
        </svg>

        {/* readout box (top-left) */}
        <div
          className="absolute left-2 top-2 rounded-md px-3 py-2"
          style={{ background: "oklch(0.13 0.03 255 / 0.82)", border: "1px solid oklch(0.34 0.05 255)" }}
        >
          <ReadoutRow k="Time" v={`${f.met >= 0 ? "T+" : "T−"}${Math.abs(f.met).toFixed(1)}`} u="s" />
          <ReadoutRow k="Latitude" v={`${f.lat.toFixed(5)}`} u="°N" />
          <ReadoutRow k="Longitude" v={`${f.lon.toFixed(5)}`} u="°E" />
          <ReadoutRow k="Altitude" v={f1(f.altitude)} u="m" />
          <ReadoutRow k="Velocity" v={f1(f.speed3d)} u="m/s" />
        </div>

        {/* wind + legend (top-right) */}
        <div
          className="absolute right-2 top-2 rounded-md px-2.5 py-2 flex items-center gap-2"
          style={{ background: "oklch(0.13 0.03 255 / 0.82)", border: "1px solid oklch(0.34 0.05 255)" }}
        >
          <Wind className="h-3.5 w-3.5" style={{ color: CYAN }} />
          <div className="leading-tight">
            <div className="label-mono text-[9px]">WIND (EST.)</div>
            <div className="readout text-xs">
              {f1(f.windSpeed)} m/s <span className="opacity-60">from</span> {f0(f.windFrom)}°
            </div>
          </div>
          <svg width="26" height="26" viewBox="-13 -13 26 26" aria-hidden>
            <circle r="11" fill="none" stroke="oklch(0.45 0.05 250)" />
            <g transform={`rotate(${wTo})`}>
              <path d="M0,-9 L4,3 L0,0 L-4,3 Z" fill={CYAN} />
            </g>
          </svg>
        </div>

        {/* legend (bottom-right) */}
        <div className="absolute right-2 bottom-12 flex flex-col gap-1 rounded-md px-2 py-1.5" style={{ background: "oklch(0.13 0.03 255 / 0.75)" }}>
          <LegendRow color={YELLOW} text="Parachute descent" />
          <LegendRow color={GREEN} text="Powered / guided" />
          <LegendRow color="oklch(0.92 0.02 250)" text="Forecast drift" dashed />
          <LegendRow color={AMBER} text="Predicted landing" dashed />
        </div>

        {/* event banner */}
        <div
          className="absolute left-0 right-0 bottom-0 px-4 py-2 text-center"
          style={{ background: "oklch(0.13 0.03 255 / 0.85)", borderTop: "1px solid oklch(0.3 0.05 255)" }}
        >
          <span className="font-semibold tracking-wide text-[22px]" style={{ color: YELLOW }}>
            {bannerText}
          </span>
          <span className="label-mono text-[9px] ml-3 opacity-70">{f.landing !== "IDLE" ? `${f.landing} · ${f.landingName}` : f.state.replace(/_/g, " ")}</span>
        </div>
      </div>

      <SideProfile f={f} />
    </div>
  );
}

function ReadoutRow({ k, v, u }: { k: string; v: string; u: string }) {
  return (
    <div className="flex items-baseline gap-3 leading-snug">
      <span className="w-[68px] text-right text-[13px]" style={{ color: "oklch(0.9 0.03 250)" }}>
        {k} :
      </span>
      <span className="readout text-[14px] w-[88px]">{v}</span>
      <span className="label-mono text-[10px] w-5">{u}</span>
    </div>
  );
}

function LegendRow({ color, text, dashed }: { color: string; text: string; dashed?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <svg width="22" height="6" aria-hidden>
        <line x1="0" y1="3" x2="22" y2="3" stroke={color} strokeWidth="2.4" strokeDasharray={dashed ? "4 3" : undefined} />
      </svg>
      <span className="label-mono text-[8.5px]">{text}</span>
    </div>
  );
}

function SideProfile({ f }: { f: CansatFrame }) {
  const W = 900;
  const H = 210;
  const L = 46;
  const R = 14;
  const T = 12;
  const B = 26;
  const toRange = (p: { e: number; n: number }) => Math.hypot(p.e - f.targetE, p.n - f.targetN);
  const pts = f.path.map((p) => ({ r: toRange(p), a: p.alt, c: p.ctrl }));
  const passive = f.passivePath.map((p) => ({ r: toRange(p), a: p.alt, c: false }));
  const rMax = Math.max(100, ...pts.map((p) => p.r), ...passive.map((p) => p.r)) * 1.05;
  const x = (r: number) => L + (1 - r / rMax) * (W - L - R);
  const y = (a: number) => T + (1 - a / 1050) * (H - T - B);
  const line = (arr: { r: number; a: number }[]) =>
    arr.map((p, i) => `${i === 0 ? "M" : "L"}${x(p.r).toFixed(1)},${y(p.a).toFixed(1)}`).join(" ");
  const live = f.met >= 0 ? { r: f.rangeToTarget, a: f.altitude } : null;

  const rTicks = [0, 0.25, 0.5, 0.75, 1].map((k) => Math.round(rMax * k));
  return (
    <div className="well p-2.5">
      <div className="flex items-center justify-between mb-1">
        <span className="label-mono text-[10px]" style={{ color: "oklch(0.86 0.04 250)" }}>
          Side View · Altitude vs Range to Target
        </span>
        <span className="readout text-[11px]" style={{ color: CYAN }}>
          {f0(f.rangeToTarget)} m · {f0(f.altitude)} m AGL
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full block">
        {[0, 250, 500, 750, 1000].map((a) => (
          <g key={a}>
            <line x1={L} x2={W - R} y1={y(a)} y2={y(a)} stroke="oklch(0.5 0.05 250 / 0.25)" strokeDasharray="2 4" />
            <text x={L - 6} y={y(a) + 3} textAnchor="end" fontSize="10" fill="oklch(0.7 0.03 250)">
              {a}
            </text>
          </g>
        ))}
        {rTicks.map((r) => (
          <text key={r} x={x(r)} y={H - 8} textAnchor="middle" fontSize="10" fill="oklch(0.7 0.03 250)">
            {r}
          </text>
        ))}
        {/* event heights */}
        {[
          { a: FLAPS_ALT, t: "FLAPS 700 m" },
          { a: PROP_ALT, t: "PROPS 600 m" },
        ].map((e) => (
          <g key={e.a}>
            <line x1={L} x2={W - R} y1={y(e.a)} y2={y(e.a)} stroke={YELLOW} strokeOpacity={0.45} strokeDasharray="4 4" />
            <text x={W - R - 4} y={y(e.a) - 4} textAnchor="end" fontSize="9.5" fill={YELLOW} fillOpacity={0.9}>
              {e.t}
            </text>
          </g>
        ))}
        {passive.length > 1 ? <path d={line(passive)} fill="none" stroke="oklch(0.92 0.02 250 / 0.5)" strokeWidth="1.4" strokeDasharray="6 5" /> : null}
        {pts.length > 1 ? <path d={line(pts)} fill="none" stroke={GREEN} strokeWidth="2.4" /> : null}
        {live ? <circle cx={x(live.r)} cy={y(live.a)} r="5" fill={CYAN} stroke="oklch(0.15 0.03 255)" strokeWidth="1.5" /> : null}
        <text x={W - R} y={y(0) - 5} textAnchor="end" fontSize="10" fill={GREEN}>
          TARGET
        </text>
        <text x={L} y={H - 8} textAnchor="start" fontSize="9" fill="oklch(0.6 0.03 250)" dx={-30}>
          m
        </text>
      </svg>
    </div>
  );
}
