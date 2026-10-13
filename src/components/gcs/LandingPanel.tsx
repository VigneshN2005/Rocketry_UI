import { Crosshair } from "lucide-react";
import { BAND_HEIGHTS, LANDING_STATES, PIXEL_FACTOR, RINGS_M, H_VIS_MIN, PARAMS } from "./mission";
import type { LandingId } from "./mission";
import type { CansatFrame } from "./telemetry";
import { Bar, KV, PanelTitle, Stat, StatusChip, f0, f1, f2 } from "./Kit";

const CYAN = "oklch(0.82 0.12 210)";
const GREEN = "oklch(0.78 0.15 155)";
const YELLOW = "oklch(0.88 0.15 98)";
const RED = "oklch(0.72 0.19 35)";
const AMBER = "oklch(0.8 0.16 70)";

const ORDER: LandingId[] = ["IDLE", "L0", "L1", "L2", "L3", "L4", "L5", "L6", "L7", "L8", "L10"];

export function LandingPanel({ f }: { f: CansatFrame }) {
  const idx = (id: LandingId) => ORDER.indexOf(id);
  const cur = f.landing === "L9" ? -1 : idx(f.landing);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
      {/* state ladder */}
      <div className="panel p-3 flex flex-col gap-2">
        <PanelTitle
          title="Landing Logic · States"
          icon={<Crosshair className="h-3.5 w-3.5" />}
          right={<StatusChip status={f.landing === "L9" ? "WARN" : "OK"} text={f.landing === "IDLE" ? "WAITING" : f.landing} />}
        />
        <div className="flex flex-col gap-1">
          {LANDING_STATES.map((s) => {
            const passive = s.id === "L9";
            const active = f.landing === s.id;
            const done = !passive && cur > idx(s.id) && cur >= 0;
            const color = passive ? RED : active ? CYAN : done ? GREEN : undefined;
            return (
              <div
                key={s.id}
                className="flex items-center gap-2 rounded-md border px-2 py-1.5"
                style={{
                  borderColor: active ? color : "var(--color-border)",
                  background: active ? "oklch(0.24 0.06 235 / 0.55)" : "oklch(0.15 0.03 255)",
                  opacity: !active && !done && !passive ? 0.55 : 1,
                }}
              >
                <span className="readout text-[11px] w-7" style={{ color }}>
                  {s.id}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="label-mono text-[10px] truncate" style={{ color: active ? "oklch(0.97 0 0)" : undefined }}>
                    {s.name}
                  </div>
                  <div className="text-[10px] opacity-60 truncate">{s.note}</div>
                </div>
                <span className="text-[11px]" style={{ color }}>
                  {active ? "●" : done ? "✓" : ""}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* vision */}
      <div className="flex flex-col gap-3">
        <div className="panel p-3 flex flex-col gap-2">
          <PanelTitle
            title="Image Match"
            right={
              <StatusChip
                status={f.visionStatus === "LOCKED" ? "OK" : f.visionStatus === "SEARCH" ? "WARN" : "OFF"}
                text={f.visionStatus}
              />
            }
          />
          <div className="grid grid-cols-3 gap-2">
            <Stat label="Band" value={f.band > 0 ? `${f.band}/14` : "—"} small color={CYAN} />
            <Stat label="Reference" value={f.band > 0 ? f0(f.bandHeight) : "—"} unit="m" small />
            <Stat label="Pixel" value={f2(f.pixelSize)} unit="m" small />
          </div>
          <div>
            <div className="flex justify-between label-mono text-[9px] mb-1">
              <span>Match score (min {PARAMS.C_MIN})</span>
              <span style={{ color: f.matchC >= PARAMS.C_MIN ? GREEN : RED }}>{f2(f.matchC)}</span>
            </div>
            <Bar value={f.matchC} max={1} mark={PARAMS.C_MIN} color={f.matchC >= PARAMS.C_MIN ? GREEN : RED} height={8} />
          </div>
          <div>
            <div className="flex justify-between label-mono text-[9px] mb-1">
              <span>Peak ratio (min {PARAMS.PSR_MIN})</span>
              <span style={{ color: f.matchPsr >= PARAMS.PSR_MIN ? GREEN : RED }}>{f2(f.matchPsr)}</span>
            </div>
            <Bar value={f.matchPsr} max={3} mark={PARAMS.PSR_MIN} color={f.matchPsr >= PARAMS.PSR_MIN ? GREEN : RED} height={8} />
          </div>
          <div className="well p-2.5">
            <KV k="Fixes accepted" v={String(f.fixesAccepted)} color={GREEN} />
            <KV k="Fixes rejected" v={String(f.fixesRejected)} color={f.fixesRejected ? AMBER : undefined} />
            <KV k="Last fix" v={f.fixesAccepted ? f1(Math.min(f.lastFixAge, 999)) : "—"} unit="s ago" />
            <KV k="Camera" v={f.cameraOn ? "ON" : "OFF"} color={f.cameraOn ? GREEN : undefined} />
            <KV k="Vision ends below" v={String(H_VIS_MIN)} unit="m" />
          </div>
        </div>

        <div className="panel p-3 flex flex-col gap-2">
          <PanelTitle title="Altitude Bands" right={<span className="label-mono text-[9px]">14 reference images</span>} />
          <div className="grid grid-cols-2 gap-1">
            {BAND_HEIGHTS.map((h, i) => {
              const n = i + 1;
              const active = f.band === n;
              const passed = f.band > n || (f.visionStatus === "ENDED" && f.band === 0);
              const unusable = h < H_VIS_MIN;
              return (
                <div
                  key={n}
                  className="flex items-center justify-between rounded border px-2 py-1"
                  style={{
                    borderColor: active ? CYAN : "var(--color-border)",
                    background: active ? "oklch(0.26 0.07 235 / 0.6)" : "oklch(0.15 0.03 255)",
                    opacity: unusable ? 0.35 : passed ? 0.6 : 1,
                  }}
                >
                  <span className="readout text-[11px]" style={{ color: active ? CYAN : undefined }}>
                    B{n}
                  </span>
                  <span className="readout text-[11px]">{h} m</span>
                  <span className="label-mono text-[8.5px]">{(PIXEL_FACTOR * h).toFixed(1)} m/px</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* rings + guidance + actuators */}
      <div className="flex flex-col gap-3">
        <div className="panel p-3 flex flex-col gap-2">
          <PanelTitle title="Offset from Target" right={<span className="readout text-xs">{f.ringText}</span>} />
          <RingView f={f} />
          <div className="grid grid-cols-3 gap-2">
            <Stat label="GNSS err" value={f1(f.errGnss)} unit="m" small color={YELLOW} />
            <Stat label="Vision err" value={f1(f.errVision)} unit="m" small color={GREEN} />
            <Stat label="Pred. miss" value={f1(f.impactMiss)} unit="m" small color={AMBER} />
          </div>
        </div>

        <div className="panel p-3 flex flex-col gap-2">
          <PanelTitle title="Guidance" />
          <div className="well p-2.5">
            <KV k="Wind (est.)" v={`${f1(f.windSpeed)} m/s from ${f0(f.windFrom)}°`} />
            <KV k="Time to ground" v={f0(f.tRem)} unit="s" />
            <KV k="Wanted ground speed" v={f2(f.vDesGround)} unit="m/s" />
            <KV k="Wanted air speed" v={f2(f.vAirCmd)} unit="m/s" />
            <KV k="Largest air speed" v={f2(f.vRelMax)} unit="m/s" />
            <KV k="Tilt command" v={f1(f.tiltCmd)} unit="°" />
          </div>
          <div>
            <div className="flex justify-between label-mono text-[9px] mb-1">
              <span>Reach vs miss</span>
              <span style={{ color: f.reachable ? GREEN : RED }}>{f.reachable ? "REACHABLE" : "OUT OF REACH"}</span>
            </div>
            <Bar value={Math.min(f.impactMiss, f.reach * 1.5)} max={Math.max(1, f.reach * 1.5)} mark={f.reach} color={f.reachable ? GREEN : RED} height={8} />
          </div>
        </div>

        <div className="panel p-3 flex flex-col gap-2">
          <PanelTitle title="Motors and Arms" right={<span className="readout text-xs">{f1(f.thrustN)} N</span>} />
          <div className="grid grid-cols-4 gap-2">
            {f.motors.map((m, i) => (
              <div key={i} className="well p-2 flex flex-col items-center gap-1.5">
                <span className="label-mono text-[9px]">M{i + 1}</span>
                <div className="relative h-14 w-3 rounded-full bg-[oklch(0.22_0.04_255)] overflow-hidden">
                  <div className="absolute bottom-0 inset-x-0 rounded-full" style={{ height: `${m}%`, background: GREEN }} />
                </div>
                <span className="readout text-[11px]">{f0(m)}%</span>
                <span className="label-mono text-[8.5px]">ARM {f0(f.arms[i])}°</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* interlocks + faults (full width) */}
      <div className="panel p-3 flex flex-col gap-2 xl:col-span-3">
        <PanelTitle title="Motor Interlocks and Faults" right={<span className="label-mono text-[9px]">{f.faults.length} fault(s)</span>} />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2">
          {f.interlocks.map((i) => (
            <div key={i.label} className="well px-2.5 py-1.5 flex items-center justify-between gap-2">
              <span className="text-[11px]">{i.label}</span>
              <StatusChip status={i.ok ? "OK" : "WARN"} text={i.ok ? "PASS" : "WAIT"} />
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {f.faults.length === 0 ? (
            <span className="label-mono text-[10px]" style={{ color: GREEN }}>
              No active faults
            </span>
          ) : (
            f.faults.map((x) => <StatusChip key={x} status="WARN" text={x} />)
          )}
        </div>
      </div>
    </div>
  );
}

/** Concentric rings on a square-root scale so near rings stay readable. */
function RingView({ f }: { f: CansatFrame }) {
  const S = 200;
  const R = 92;
  const MAX = 500;
  const rad = (m: number) => R * Math.sqrt(Math.min(m, MAX) / MAX);
  const dist = Math.hypot(f.posE, f.posN);
  const ang = Math.atan2(f.posE, f.posN);
  const rr = rad(dist);
  const px = S / 2 + Math.sin(ang) * rr;
  const py = S / 2 - Math.cos(ang) * rr;
  const iDist = Math.hypot(f.impactE, f.impactN);
  const iAng = Math.atan2(f.impactE, f.impactN);
  const ix = S / 2 + Math.sin(iAng) * rad(iDist);
  const iy = S / 2 - Math.cos(iAng) * rad(iDist);
  return (
    <div className="well p-1 flex justify-center">
      <svg viewBox={`0 0 ${S} ${S}`} className="w-full max-w-[260px]">
        {[...RINGS_M, 500].map((r) => (
          <g key={r}>
            <circle cx={S / 2} cy={S / 2} r={rad(r)} fill={r === 25 ? "oklch(0.78 0.15 155 / 0.12)" : "none"} stroke="oklch(0.85 0.1 100 / 0.45)" strokeDasharray="4 4" />
            <text x={S / 2 + 3} y={S / 2 - rad(r) + 9} fontSize="7.5" fill="oklch(0.88 0.1 100 / 0.8)">
              {r}
            </text>
          </g>
        ))}
        <line x1={S / 2} x2={S / 2} y1={4} y2={S - 4} stroke="oklch(0.5 0.05 250 / 0.3)" />
        <line y1={S / 2} y2={S / 2} x1={4} x2={S - 4} stroke="oklch(0.5 0.05 250 / 0.3)" />
        <text x={S / 2 - 3} y={9} fontSize="8" fill="oklch(0.8 0.03 250)">N</text>
        <line x1={S / 2} y1={S / 2} x2={ix} y2={iy} stroke={AMBER} strokeDasharray="2 3" />
        <path d={`M${ix},${iy - 5} l5,5 l-5,5 l-5,-5 z`} fill={AMBER} fillOpacity={0.4} stroke={AMBER} />
        <circle cx={S / 2} cy={S / 2} r="3" fill={GREEN} />
        <circle cx={px} cy={py} r="5" fill={CYAN} stroke="oklch(0.15 0.03 255)" strokeWidth="1.5" />
      </svg>
    </div>
  );
}
