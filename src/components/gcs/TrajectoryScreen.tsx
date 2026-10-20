import { useEffect, useRef, useState } from "react";
import { Wind } from "lucide-react";
import { RINGS_M, FLAPS_ALT, PROP_ALT, enuToLatLon, latLonToEnu } from "./mission";
import type { CansatFrame, TrackPt } from "./telemetry";
import { CansatInset } from "./CansatInset";
import { f0, f1 } from "./Kit";

const YELLOW = "oklch(0.88 0.15 98)";
const GREEN = "oklch(0.78 0.15 155)";
const CYAN = "oklch(0.82 0.12 210)";
const AMBER = "oklch(0.8 0.16 70)";
const RED = "oklch(0.68 0.22 25)";
const INK = "oklch(0.1 0.03 260)";
const CTRL = new Set<string>(["L3", "L4", "L5", "L6", "L7", "L8"]);

const TILE_URL = (z: number, x: number, y: number) =>
  `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`;

// ---- helpers -------------------------------------------------------------
function niceStep(raw: number): number {
  const steps = [10, 20, 25, 50, 100, 200, 250, 500, 1000];
  return steps.find((s) => s >= raw) ?? 1000;
}

function runs(points: TrackPt[]): { ctrl: boolean; pts: TrackPt[] }[] {
  const out: { ctrl: boolean; pts: TrackPt[] }[] = [];
  for (const p of points) {
    const last = out.at(-1);
    if (!last || last.ctrl !== p.ctrl) out.push({ ctrl: p.ctrl, pts: last ? [last.pts.at(-1)!, p] : [p] });
    else last.pts.push(p);
  }
  return out;
}

const toPath = (pts: TrackPt[]) =>
  pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.e.toFixed(1)},${(-p.n).toFixed(1)}`).join(" ");

const lonToX = (lon: number, z: number) => ((lon + 180) / 360) * 2 ** z;
const latToY = (lat: number, z: number) => {
  const r = (lat * Math.PI) / 180;
  return ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * 2 ** z;
};
const xToLon = (x: number, z: number) => (x / 2 ** z) * 360 - 180;
const yToLat = (y: number, z: number) => (Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / 2 ** z))) * 180) / Math.PI;

type Tile = { key: string; z: number; e: number; n: number; w: number; h: number; url: string };

function tilesFor(minE: number, minN: number, w: number, h: number, pxWidth: number): Tile[] {
  const [latN, lonW] = enuToLatLon(minE, minN + h);
  const [latS, lonE] = enuToLatLon(minE + w, minN);
  const mpp = w / Math.max(300, pxWidth);
  const midLat = (latN + latS) / 2;
  const z = Math.max(13, Math.min(17, Math.round(Math.log2((156543.03 * Math.cos((midLat * Math.PI) / 180)) / mpp))));
  const x0 = Math.floor(lonToX(lonW, z));
  const x1 = Math.floor(lonToX(lonE, z));
  const y0 = Math.floor(latToY(latN, z));
  const y1 = Math.floor(latToY(latS, z));
  if ((x1 - x0 + 1) * (y1 - y0 + 1) > 90) return [];
  const out: Tile[] = [];
  for (let x = x0; x <= x1; x++) {
    for (let y = y0; y <= y1; y++) {
      const [e0, n0] = latLonToEnu(yToLat(y, z), xToLon(x, z)); // north-west corner
      const [e1, n1] = latLonToEnu(yToLat(y + 1, z), xToLon(x + 1, z)); // south-east corner
      out.push({ key: `${z}/${x}/${y}`, z, e: e0, n: n0, w: e1 - e0, h: n0 - n1, url: TILE_URL(z, x, y) });
    }
  }
  return out;
}

function useSize() {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 1100, h: 560 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      if (r.width > 50 && r.height > 50) setSize({ w: r.width, h: r.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return { ref, size };
}

// ---- screen --------------------------------------------------------------
export function TrajectoryScreen({ f, missionTitle }: { f: CansatFrame; missionTitle: string }) {
  const { ref, size } = useSize();
  const [imagery, setImagery] = useState(true);

  const tE = f.targetE;
  const tN = f.targetN;
  const hasPos = Number.isFinite(f.posE) && Number.isFinite(f.posN);
  const live: TrackPt | null =
    hasPos
      ? { e: f.posE + tE, n: f.posN + tN, alt: f.altitude, t: f.met, ctrl: CTRL.has(f.landing) }
      : null;
  const track = live ? [...f.path, live] : f.path;

  // fit the view to the track, with the aspect of the container
  const aspect = size.w / size.h;
  const view = (() => {
    const pts: [number, number][] = [
      [f.padE, f.padN],
      [tE, tN],
      [tE - 110, tN - 70],
      [tE + 110, tN + 70],
      [tE + f.impactE, tN + f.impactN],
    ];
    for (const p of f.passivePath) pts.push([p.e, p.n]);
    for (const p of track) pts.push([p.e, p.n]);
    const fin = pts.filter((p) => Number.isFinite(p[0]) && Number.isFinite(p[1]));
    let minE = Math.min(...fin.map((p) => p[0]));
    let maxE = Math.max(...fin.map((p) => p[0]));
    let minN = Math.min(...fin.map((p) => p[1]));
    let maxN = Math.max(...fin.map((p) => p[1]));
    const pad = Math.max(maxE - minE, (maxN - minN) * aspect) * 0.09 + 25;
    minE -= pad * 1.3; // a little more room on the left for the inset and readout
    maxE += pad;
    minN -= pad * 1.7; // room for the bottom band
    maxN += pad * 1.1;
    let w = maxE - minE;
    let h = maxN - minN;
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

  const fs = view.w / (size.w / 16); // one "font unit" ~ 16 screen pixels
  const step = niceStep(view.w / 8);
  const gridX: number[] = [];
  const gridY: number[] = [];
  for (let k = Math.ceil((view.minE - tE) / step); tE + k * step <= view.minE + view.w; k++) gridX.push(tE + k * step);
  for (let k = Math.ceil((view.minN - tN) / step); tN + k * step <= view.minN + view.h; k++) gridY.push(tN + k * step);

  const tiles = imagery ? tilesFor(view.minE, view.minN, view.w, view.h, size.w) : [];
  const halo = { stroke: INK, strokeWidth: fs * 0.22, paintOrder: "stroke" as const, strokeLinejoin: "round" as const };

  const eventPts = f.events
    .filter((e) => e.t >= 0 && e.label !== "MOTORS OFF" && e.label !== "MISSION COMPLETE")
    .map((e, i) => {
      const near = f.path.reduce<TrackPt | null>(
        (best, p) => (best === null || Math.abs(p.t - e.t) < Math.abs(best.t - e.t) ? p : best),
        null,
      );
      return { ...e, p: near, i };
    });

  const descending = f.state === "PRIMARY_DESCENT" || f.state === "CONTROLLED_DESCENT" || f.state === "EJECTION";
  const bannerText =
    f.state === "MISSION_COMPLETE" ? "MISSION COMPLETE" : (f.events.at(-1)?.label ?? "AWAITING SEPARATION");
  const wTo = Number.isFinite(f.windFrom) ? (f.windFrom + 180) % 360 : null;

  return (
    <div ref={ref} className="relative h-full w-full overflow-hidden" style={{ background: "oklch(0.1 0.035 262)" }}>
      <svg
        viewBox={`${view.minE} ${-(view.minN + view.h)} ${view.w} ${view.h}`}
        className="absolute inset-0 w-full h-full"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <radialGradient id="seaGlow" cx="50%" cy="100%" r="110%">
            <stop offset="0%" stopColor="oklch(0.3 0.08 245)" />
            <stop offset="60%" stopColor="oklch(0.17 0.045 260)" />
            <stop offset="100%" stopColor="oklch(0.11 0.03 265)" />
          </radialGradient>
        </defs>
        <rect x={view.minE} y={-(view.minN + view.h)} width={view.w} height={view.h} fill="url(#seaGlow)" />

        {/* satellite imagery (falls back to the dark background if tiles cannot load) */}
        {tiles.map((t) => (
          <image
            key={t.key}
            href={t.url}
            x={t.e}
            y={-t.n}
            width={t.w + 0.8}
            height={t.h + 0.8}
            preserveAspectRatio="none"
            onError={(ev) => ((ev.currentTarget as SVGImageElement).style.display = "none")}
          />
        ))}
        {tiles.length > 0 ? (
          <rect x={view.minE} y={-(view.minN + view.h)} width={view.w} height={view.h} fill="oklch(0.08 0.03 260 / 0.28)" />
        ) : null}

        {/* grid */}
        {gridX.map((x) => (
          <g key={`gx${x}`}>
            <line x1={x} x2={x} y1={-(view.minN + view.h)} y2={-view.minN} stroke="oklch(0.95 0.02 250 / 0.16)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
            <text x={x + fs * 0.2} y={-view.minN - fs * 6.4} fontSize={fs * 0.72} fill="oklch(0.95 0.02 250 / 0.85)" {...halo}>
              {Math.round(x - tE)}
            </text>
          </g>
        ))}
        {gridY.map((y) => (
          <g key={`gy${y}`}>
            <line x1={view.minE} x2={view.minE + view.w} y1={-y} y2={-y} stroke="oklch(0.95 0.02 250 / 0.16)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
            <text x={view.minE + view.w - fs * 3.2} y={-y - fs * 0.25} fontSize={fs * 0.72} fill="oklch(0.95 0.02 250 / 0.85)" {...halo}>
              {Math.round(y - tN)}
            </text>
          </g>
        ))}

        {/* target rings */}
        {RINGS_M.filter((r) => r > view.w / 60 && r < view.w * 0.9).map((r) => (
          <g key={`ring${r}`}>
            <circle cx={tE} cy={-tN} r={r} fill={r === 25 ? "oklch(0.78 0.15 155 / 0.12)" : "none"} stroke="oklch(0.92 0.1 100 / 0.8)" strokeWidth={1.4} strokeDasharray="6 5" vectorEffect="non-scaling-stroke" />
            <text x={tE + r * 0.707 + fs * 0.3} y={-tN + r * 0.707 + fs * 0.9} fontSize={fs * 0.78} fill="oklch(0.92 0.1 100)" {...halo}>
              {r} m
            </text>
          </g>
        ))}

        {/* forecast drift */}
        {f.passivePath.length > 1 ? (
          <path d={toPath(f.passivePath)} fill="none" stroke="oklch(0.97 0.01 250 / 0.7)" strokeWidth={1.8} strokeDasharray="7 6" vectorEffect="non-scaling-stroke" />
        ) : null}

        {/* track with a dark halo underneath for contrast on imagery */}
        {runs(track).map((r, i) => (
          <path key={`h${i}`} d={toPath(r.pts)} fill="none" stroke={INK} strokeOpacity={0.7} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        ))}
        {runs(track).map((r, i) => (
          <path key={i} d={toPath(r.pts)} fill="none" stroke={r.ctrl ? GREEN : YELLOW} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        ))}

        {/* pad */}
        {Number.isFinite(f.padE) && Number.isFinite(f.padN) ? (
        <g>
          <rect x={f.padE - fs * 0.5} y={-f.padN - fs * 0.5} width={fs} height={fs} fill="none" stroke="white" strokeWidth={2} vectorEffect="non-scaling-stroke" />
          <text x={f.padE + fs * 0.9} y={-f.padN + fs * 0.35} fontSize={fs * 0.9} fill="white" fontWeight={700} {...halo}>
            PAD
          </text>
        </g>
        ) : null}

        {/* event markers: small red squares with rounded labels, staggered to avoid overlap */}
        {eventPts.map((e) => {
          if (!e.p) return null;
          const w = e.label.length * fs * 0.6 + fs * 1.4;
          const dx = fs * 1.2;
          const dy = (e.i % 2 === 0 ? -1 : 1) * fs * (2.3 + Math.floor(e.i / 2) * 2.5);
          return (
            <g key={`${e.label}-${e.i}`}>
              <line x1={e.p.e} y1={-e.p.n} x2={e.p.e + dx} y2={-e.p.n + dy} stroke="white" strokeOpacity={0.7} strokeWidth={1} vectorEffect="non-scaling-stroke" />
              <rect x={e.p.e - fs * 0.32} y={-e.p.n - fs * 0.32} width={fs * 0.64} height={fs * 0.64} fill={RED} stroke="white" strokeWidth={1} vectorEffect="non-scaling-stroke" />
              <g transform={`translate(${e.p.e + dx}, ${-e.p.n + dy})`}>
                <rect x={0} y={-fs * 0.85} width={w} height={fs * 1.7} rx={fs * 0.85} fill="oklch(0.34 0.035 255 / 0.93)" stroke="oklch(0.8 0.03 250 / 0.5)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
                <text x={w / 2} y={fs * 0.32} textAnchor="middle" fontSize={fs * 0.82} fontWeight={700} fill="white">
                  {e.label}
                </text>
              </g>
            </g>
          );
        })}

        {/* target */}
        <g>
          <circle cx={tE} cy={-tN} r={fs * 0.9} fill="none" stroke={GREEN} strokeWidth={2.6} vectorEffect="non-scaling-stroke" />
          <line x1={tE - fs * 1.7} x2={tE + fs * 1.7} y1={-tN} y2={-tN} stroke={GREEN} strokeWidth={2} vectorEffect="non-scaling-stroke" />
          <line x1={tE} x2={tE} y1={-tN - fs * 1.7} y2={-tN + fs * 1.7} stroke={GREEN} strokeWidth={2} vectorEffect="non-scaling-stroke" />
          <text x={tE + fs * 1.3} y={-tN - fs * 1.3} fontSize={fs * 1.0} fill={GREEN} fontWeight={800} {...halo}>
            TARGET
          </text>
        </g>

        {/* predicted landing */}
        {descending && live && Number.isFinite(f.impactE) && Number.isFinite(f.impactN) ? (
          <g>
            <line x1={live.e} y1={-live.n} x2={tE + f.impactE} y2={-(tN + f.impactN)} stroke={AMBER} strokeWidth={1.6} strokeDasharray="3 4" vectorEffect="non-scaling-stroke" />
            <path
              d={`M${tE + f.impactE},${-(tN + f.impactN) - fs * 0.85} l${fs * 0.85},${fs * 0.85} l${-fs * 0.85},${fs * 0.85} l${-fs * 0.85},${-fs * 0.85} z`}
              fill={AMBER}
              fillOpacity={0.4}
              stroke={AMBER}
              strokeWidth={2}
              vectorEffect="non-scaling-stroke"
            />
            <text x={tE + f.impactE + fs * 1.1} y={-(tN + f.impactN) + fs * 2.3} fontSize={fs * 0.82} fill={AMBER} fontWeight={700} {...halo}>
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
                stroke="white"
                strokeWidth={2.4}
                vectorEffect="non-scaling-stroke"
              />
            ) : null}
            <circle cx={live.e} cy={-live.n} r={fs * 0.9} fill={CYAN} fillOpacity={0.3}>
              <animate attributeName="r" values={`${fs * 0.7};${fs * 1.6};${fs * 0.7}`} dur="1.6s" repeatCount="indefinite" />
            </circle>
            <circle cx={live.e} cy={-live.n} r={fs * 0.55} fill={CYAN} stroke="white" strokeWidth={1.8} vectorEffect="non-scaling-stroke" />
          </g>
        ) : null}
      </svg>

      {/* title */}
      <div className="absolute left-1/2 -translate-x-1/2 top-2 pointer-events-none text-center">
        <span
          className="italic font-extrabold tracking-tight whitespace-nowrap"
          style={{ color: YELLOW, fontSize: "clamp(18px, 2.3vw, 34px)", textShadow: "0 2px 6px oklch(0.05 0.02 260 / 0.9)" }}
        >
          {missionTitle}
        </span>
      </div>

      {/* CanSat inset (yellow frame, top-left) */}
      <div className="absolute left-3 top-3" style={{ width: "clamp(220px, 21vw, 360px)", aspectRatio: "1.55 / 1" }}>
        <CansatInset f={f} />
      </div>

      {/* top-right: team mark, wind, legend, imagery toggle */}
      <div className="absolute right-3 top-2 flex flex-col items-end gap-2">
        <TeamMark />
        <div
          className="rounded-md px-2.5 py-2 flex items-center gap-2"
          style={{ background: "oklch(0.12 0.03 258 / 0.82)", border: "1px solid oklch(0.38 0.05 255)" }}
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
            {wTo !== null ? (
              <g transform={`rotate(${wTo})`}>
                <path d="M0,-9 L4,3 L0,0 L-4,3 Z" fill={CYAN} />
              </g>
            ) : null}
          </svg>
        </div>
        <div className="flex flex-col gap-1 rounded-md px-2 py-1.5" style={{ background: "oklch(0.12 0.03 258 / 0.8)" }}>
          <LegendRow color={YELLOW} text="Parachute descent" />
          <LegendRow color={GREEN} text="Powered / guided" />
          <LegendRow color="oklch(0.97 0.01 250)" text="Forecast drift" dashed />
          <LegendRow color={AMBER} text="Predicted landing" dashed />
        </div>
        <button
          onClick={() => setImagery((v) => !v)}
          className="label-mono text-[9px] px-2 py-1 rounded border"
          style={{ background: "oklch(0.12 0.03 258 / 0.85)", borderColor: "oklch(0.4 0.05 255)", color: imagery ? GREEN : undefined }}
          title="Satellite imagery needs an internet connection"
        >
          SATELLITE {imagery ? "ON" : "OFF"}
        </button>
      </div>

      {/* altitude profile (bottom-right) */}
      <div
        className="absolute right-3 rounded-md p-2"
        style={{
          bottom: 92,
          width: "clamp(290px, 29vw, 470px)",
          background: "oklch(0.12 0.03 258 / 0.82)",
          border: "1px solid oklch(0.38 0.05 255)",
        }}
      >
        <SideProfile f={f} />
      </div>

      {/* bottom band: readout (left), banner (centre), INS (right) */}
      <div
        className="absolute left-0 right-0 bottom-0 flex items-center"
        style={{ height: 84, background: "oklch(0.11 0.03 258 / 0.88)", borderTop: "1px solid oklch(0.34 0.05 255)" }}
      >
        <div className="flex-1 text-center px-[min(24vw,380px)]">
          <span
            className="font-bold tracking-wide"
            style={{ color: YELLOW, fontSize: "clamp(22px, 2.6vw, 44px)", textShadow: "0 2px 6px oklch(0.05 0.02 260 / 0.8)" }}
          >
            {bannerText}
          </span>
          <div className="label-mono text-[9px] opacity-70">
            {f.landing !== "IDLE" ? `${f.landing} · ${f.landingName}` : f.state.replace(/_/g, " ")}
          </div>
        </div>
      </div>

      <div
        className="absolute left-0 bottom-0 rounded-tr-md px-4 py-2.5"
        style={{ background: "oklch(0.1 0.03 258 / 0.92)", border: "1px solid oklch(0.34 0.05 255)", borderLeft: 0, borderBottom: 0 }}
      >
        <ReadoutRow k="Time" v={`${f.met >= 0 ? "" : "−"}${Math.abs(f.met).toFixed(1)}`} u="s" />
        <ReadoutRow k="Latitude" v={f.lat.toFixed(5)} u="°N" />
        <ReadoutRow k="Longitude" v={f.lon.toFixed(5)} u="°E" />
        <ReadoutRow k="Altitude" v={f1(f.altitude)} u="m" />
        <ReadoutRow k="Velocity" v={f1(f.speed3d)} u="m/s" />
      </div>

      <div className="absolute right-3 bottom-2 text-right leading-tight">
        <div className="text-[13px] font-bold">
          <span className="opacity-80">INS : </span>
          <span style={{ color: f.imu.stability === "UNSTABLE" ? RED : GREEN }}>{f.imu.stability}</span>
          <span className="opacity-80 ml-3">GNSS : </span>
          <span style={{ color: f.gnss.fix === "3D" ? GREEN : RED }}>{f.gnss.fix === "3D" ? `3D ${f.gnss.sats}` : "NO FIX"}</span>
          <span className="opacity-80 ml-3">VISION : </span>
          <span style={{ color: f.visionStatus === "LOCKED" ? GREEN : f.visionStatus === "SEARCH" ? AMBER : "oklch(0.7 0.02 250)" }}>
            {f.visionStatus}
          </span>
        </div>
        {tiles.length > 0 ? (
          <div className="text-[8.5px] opacity-60">Imagery © Esri, Maxar, Earthstar Geographics</div>
        ) : null}
      </div>
    </div>
  );
}

function TeamMark() {
  return (
    <div className="flex items-center gap-2 pointer-events-none">
      <svg width="40" height="40" viewBox="-20 -20 40 40" aria-hidden>
        <circle r="18" fill="oklch(0.16 0.04 255)" stroke={YELLOW} strokeWidth="2" />
        <g stroke="white" strokeWidth="2" strokeLinecap="round">
          <line x1="-9" y1="-9" x2="9" y2="9" />
          <line x1="9" y1="-9" x2="-9" y2="9" />
        </g>
        {[
          [-9, -9],
          [9, -9],
          [-9, 9],
          [9, 9],
        ].map(([x, y]) => (
          <circle key={`${x}${y}`} cx={x} cy={y} r="3.4" fill="oklch(0.82 0.12 210)" />
        ))}
        <circle r="3.2" fill={YELLOW} />
      </svg>
      <div className="leading-none">
        <div className="font-black italic text-[22px] tracking-tight" style={{ color: YELLOW, textShadow: "0 2px 4px oklch(0.05 0.02 260 / 0.8)" }}>
          GATSAT
        </div>
        <div className="label-mono text-[8px] mt-0.5" style={{ color: "oklch(0.95 0.02 250)" }}>
          TEAM 020 · FLAMESTON-26
        </div>
      </div>
    </div>
  );
}

function ReadoutRow({ k, v, u }: { k: string; v: string; u: string }) {
  return (
    <div className="flex items-baseline gap-3 leading-snug">
      <span className="w-[82px] text-right text-[15px]" style={{ color: "oklch(0.92 0.03 250)" }}>
        {k} :
      </span>
      <span className="readout text-[17px] w-[96px]" style={{ color: "white" }}>
        {v}
      </span>
      <span className="text-[12px] w-9" style={{ color: "oklch(0.85 0.03 250)" }}>
        {u}
      </span>
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
  const W = 520;
  const H = 190;
  const L = 36;
  const R = 10;
  const T = 10;
  const B = 22;
  const toRange = (p: { e: number; n: number }) => Math.hypot(p.e - f.targetE, p.n - f.targetN);
  const pts = f.path.map((p) => ({ r: toRange(p), a: p.alt }));
  const passive = f.passivePath.map((p) => ({ r: toRange(p), a: p.alt }));
  const rMax = Math.max(100, ...pts.map((p) => p.r), ...passive.map((p) => p.r)) * 1.05;
  const x = (r: number) => L + (1 - r / rMax) * (W - L - R);
  const y = (a: number) => T + (1 - a / 1050) * (H - T - B);
  const line = (arr: { r: number; a: number }[]) =>
    arr.map((p, i) => `${i === 0 ? "M" : "L"}${x(p.r).toFixed(1)},${y(p.a).toFixed(1)}`).join(" ");
  const live = f.met >= 0 && Number.isFinite(f.rangeToTarget) && Number.isFinite(f.altitude) ? { r: f.rangeToTarget, a: f.altitude } : null;
  const rTicks = [0, 0.25, 0.5, 0.75, 1].map((k) => Math.round(rMax * k));
  return (
    <div>
      <div className="flex items-center justify-between mb-0.5">
        <span className="label-mono text-[9px]" style={{ color: "oklch(0.9 0.03 250)" }}>
          Altitude vs range to target
        </span>
        <span className="readout text-[11px]" style={{ color: CYAN }}>
          {f0(f.rangeToTarget)} m · {f0(f.altitude)} m AGL
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full block">
        {[0, 250, 500, 750, 1000].map((a) => (
          <g key={a}>
            <line x1={L} x2={W - R} y1={y(a)} y2={y(a)} stroke="oklch(0.6 0.05 250 / 0.3)" strokeDasharray="2 4" />
            <text x={L - 5} y={y(a) + 4} textAnchor="end" fontSize="12" fill="oklch(0.85 0.03 250)">
              {a}
            </text>
          </g>
        ))}
        {rTicks.map((r) => (
          <text key={r} x={x(r)} y={H - 6} textAnchor="middle" fontSize="12" fill="oklch(0.85 0.03 250)">
            {r}
          </text>
        ))}
        {[
          { a: FLAPS_ALT, t: "FLAPS 700 m" },
          { a: PROP_ALT, t: "PROPS 600 m" },
        ].map((e) => (
          <g key={e.a}>
            <line x1={L} x2={W - R} y1={y(e.a)} y2={y(e.a)} stroke={YELLOW} strokeOpacity={0.5} strokeDasharray="4 4" />
            <text x={W - R - 3} y={y(e.a) - 4} textAnchor="end" fontSize="11" fill={YELLOW}>
              {e.t}
            </text>
          </g>
        ))}
        {passive.length > 1 ? (
          <path d={line(passive)} fill="none" stroke="oklch(0.92 0.02 250 / 0.6)" strokeWidth="1.6" strokeDasharray="6 5" />
        ) : null}
        {pts.length > 1 ? <path d={line(pts)} fill="none" stroke={GREEN} strokeWidth="2.8" /> : null}
        {live ? <circle cx={x(live.r)} cy={y(live.a)} r="5.5" fill={CYAN} stroke="white" strokeWidth="1.6" /> : null}
        <text x={W - R} y={y(0) - 5} textAnchor="end" fontSize="12" fill={GREEN} fontWeight={700}>
          TARGET
        </text>
      </svg>
    </div>
  );
}
