import type { CansatFrame } from "./telemetry";

const YELLOW = "oklch(0.88 0.15 98)";

/**
 * Yellow-framed inset (top-left of the trajectory screen) showing the CanSat:
 * parachute canopy, body, four deployable arms with propellers. It tilts with
 * the live roll and sways with the pitch, and the propellers spin once the
 * motors are running.
 */
export function CansatInset({ f }: { f: CansatFrame }) {
  const roll = Math.max(-25, Math.min(25, f.imu.roll));
  const pitch = Math.max(-25, Math.min(25, f.imu.pitch));
  const motorsOn = f.thrustN > 0.05;
  const chute = f.state !== "STANDBY" && f.state !== "BOOT";
  const armAngle = f.arms.length ? f.arms.reduce((a, b) => a + b, 0) / f.arms.length : 0; // 0..90 deg
  const open = Math.max(0, Math.min(1, armAngle / 90));
  const armLen = 22 + 46 * open;
  const spin = motorsOn ? "cansat-spin" : "";

  // arms: front-left, front-right, rear-left, rear-right seen from slightly above
  const arms = [
    { dx: -1, dy: 0.45 },
    { dx: 1, dy: 0.45 },
    { dx: -0.8, dy: -0.12 },
    { dx: 0.8, dy: -0.12 },
  ];

  return (
    <div
      className="relative overflow-hidden"
      style={{
        width: "100%",
        height: "100%",
        background:
          "linear-gradient(180deg, oklch(0.1 0.04 265) 0%, oklch(0.2 0.07 250) 55%, oklch(0.32 0.07 160) 82%, oklch(0.22 0.05 150) 100%)",
        border: `3px solid ${YELLOW}`,
      }}
    >
      {/* stars */}
      <svg className="absolute inset-0 w-full h-full opacity-70" aria-hidden>
        {Array.from({ length: 26 }, (_, i) => (
          <circle key={i} cx={`${(i * 37) % 100}%`} cy={`${(i * 53) % 58}%`} r={i % 5 === 0 ? 1.4 : 0.8} fill="white" />
        ))}
      </svg>

      <svg viewBox="-110 -80 220 170" className="absolute inset-0 w-full h-full">
        {/* ground line */}
        <ellipse cx="0" cy="84" rx="120" ry="12" fill="oklch(0.35 0.08 150 / 0.55)" />
        <g transform={`translate(0 ${6 + Math.sin(f.met * 0.9) * 1.5}) rotate(${roll * 0.7})`}>
          {/* parachute */}
          {chute ? (
            <g>
              <path d="M-62,-30 Q0,-96 62,-30 Q31,-38 0,-30 Q-31,-38 -62,-30 Z" fill="oklch(0.72 0.17 40)" stroke="oklch(0.96 0.02 80)" strokeWidth="1.2" />
              <path d="M-31,-34 Q0,-92 31,-34" fill="none" stroke="oklch(0.96 0.02 80 / 0.7)" strokeWidth="1" />
              <path d="M0,-30 L0,-92" stroke="oklch(0.96 0.02 80 / 0.5)" strokeWidth="1" />
              {[-60, -30, 0, 30, 60].map((x) => (
                <line key={x} x1={x} y1="-30" x2="0" y2="8" stroke="oklch(0.95 0 0 / 0.65)" strokeWidth="0.7" />
              ))}
            </g>
          ) : null}

          {/* body + arms, pitch squashes the vertical extent a little */}
          <g transform={`translate(0 14) scale(1 ${1 - Math.abs(pitch) / 120}) rotate(${pitch * 0.4})`}>
            {arms.map((a, i) => {
              const x = a.dx * armLen;
              const y = a.dy * armLen * 0.45;
              return (
                <g key={i}>
                  <line x1="0" y1="0" x2={x} y2={y} stroke="oklch(0.78 0.02 250)" strokeWidth="3" strokeLinecap="round" />
                  <circle cx={x} cy={y} r="3.5" fill="oklch(0.28 0.04 255)" stroke="oklch(0.8 0.02 250)" strokeWidth="1" />
                  <g transform={`translate(${x} ${y - 3})`}>
                    <ellipse className={spin} rx={open > 0.6 ? 17 : 9} ry={open > 0.6 ? 3.4 : 1.8} fill="oklch(0.9 0.04 210 / 0.75)" />
                  </g>
                </g>
              );
            })}
            <rect x="-13" y="-10" width="26" height="30" rx="5" fill="oklch(0.9 0.01 250)" stroke="oklch(0.55 0.03 250)" strokeWidth="1.2" />
            <rect x="-9" y="-4" width="18" height="6" rx="1.5" fill="oklch(0.3 0.06 250)" />
            <circle cx="0" cy="14" r="3.2" fill={f.cameraOn ? "oklch(0.78 0.15 155)" : "oklch(0.4 0.02 250)"} />
          </g>
        </g>
      </svg>

      <div className="absolute left-2 bottom-1 label-mono text-[9px]" style={{ color: YELLOW }}>
        {f.landing !== "IDLE" ? `${f.landing} · ${f.landingName}` : f.state.replace(/_/g, " ")}
      </div>
      <div className="absolute right-2 bottom-1 label-mono text-[9px]" style={{ color: "oklch(0.9 0.03 250)" }}>
        ROLL {roll.toFixed(1)}° · PITCH {pitch.toFixed(1)}°
      </div>
    </div>
  );
}
