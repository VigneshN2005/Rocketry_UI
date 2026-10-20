import { useState } from "react";
import type { CansatFrame } from "./telemetry";
import { SeriesChart, type LineSpec } from "./SeriesChart";
import { f1, f2 } from "./Kit";

const YELLOW = "oklch(0.9 0.16 100)";
const ALT = "oklch(0.72 0.17 22)";
const GREY = "oklch(0.66 0.028 250)";

/**
 * "Flight Parameters" screen, laid out like the mission-control reference:
 * title pill, two axis header bars (they double as show/hide toggles), a large
 * dual-axis chart with event labels, and a column of big value boxes.
 */
export function FlightParamsScreen({ f }: { f: CansatFrame }) {
  const [showVel, setShowVel] = useState(true);
  const [showAlt, setShowAlt] = useState(true);

  const lines: LineSpec[] = [
    ...(showVel
      ? ([
          { key: "vz", label: "Descent rate [m/s]", color: YELLOW, width: 2.4 },
          { key: "vref", label: "Planned rate [m/s]", color: "oklch(0.97 0.01 250)", dashed: true, width: 1.4 },
        ] as LineSpec[])
      : []),
    ...(showAlt ? ([{ key: "alt", label: "Altitude [m]", color: ALT, axis: "right", width: 2.4 }] as LineSpec[]) : []),
  ];

  const ins = f.imu.stability;
  const boxes: { label: string; unit: string; value: string }[] = [
    { label: "TIME", unit: "sec", value: `${f.met < 0 ? "−" : ""}${Math.abs(f.met).toFixed(1)}` },
    { label: "REL. VEL", unit: "m/s", value: f2(f.descentRate) },
    { label: "ALTITUDE", unit: "m", value: f1(f.altitude) },
    { label: "RANGE", unit: "m", value: f1(f.rangeToTarget) },
    { label: "AZIMUTH", unit: "deg", value: f1(f.azimuthToTarget) },
  ];

  return (
    <div className="h-full flex flex-col gap-2 p-3" style={{ background: "oklch(0.13 0.035 258)" }}>
      <div
        className="rounded-full text-center py-1.5 border-2"
        style={{ borderColor: "oklch(0.42 0.08 250)", background: "oklch(0.2 0.06 255)" }}
      >
        <span className="isro-serif text-[clamp(18px,2.2vw,30px)] tracking-wide">FLIGHT PARAMETERS</span>
      </div>

      <div className="flex-1 min-h-0 flex gap-2.5">
        {/* chart column */}
        <div className="flex-1 min-w-0 flex flex-col rounded-md border" style={{ borderColor: "oklch(0.42 0.07 250)", background: "oklch(0.16 0.045 258)" }}>
          <div className="grid grid-cols-2 gap-2 p-1.5">
            <button
              onClick={() => setShowVel((v) => !v)}
              className="isro-serif rounded py-1 text-[clamp(13px,1.45vw,22px)] transition-opacity"
              style={{ background: "oklch(0.55 0.04 250)", color: "white", opacity: showVel ? 1 : 0.4 }}
            >
              TIME vs REL. VELOCITY
            </button>
            <button
              onClick={() => setShowAlt((v) => !v)}
              className="isro-serif rounded py-1 text-[clamp(13px,1.45vw,22px)] transition-opacity"
              style={{ background: "oklch(0.68 0.02 250)", color: "oklch(0.5 0.2 25)", opacity: showAlt ? 1 : 0.4 }}
            >
              TIME vs ALTITUDE
            </button>
          </div>
          <div className="flex-1 min-h-0 px-1 pb-1">
            <SeriesChart
              data={f.history}
              lines={lines.length ? lines : [{ key: "alt", label: "—", color: "transparent" }]}
              events={f.events}
              showEvents
              big
              isro
              fill
              legend={false}
              unit="REL. VELOCITY [m/s]"
              rightUnit="ALTITUDE [m]"
              domainLeft={[0, 16]}
              domainRight={[0, 1000]}
            />
          </div>
        </div>

        {/* value boxes */}
        <div className="flex flex-col gap-1.5" style={{ width: "clamp(190px, 19vw, 340px)" }}>
          {boxes.map((b) => (
            <div key={b.label} className="flex-1 min-h-[64px] flex flex-col rounded-md overflow-hidden" style={{ background: "oklch(0.21 0.05 255)" }}>
              <div className="flex items-baseline justify-between px-2.5 pt-0.5 isro-serif text-[clamp(13px,1.3vw,21px)]">
                <span>{b.label}</span>
                <span className="text-[0.85em]">{b.unit}</span>
              </div>
              <div
                className="flex-1 mx-0.5 mb-0.5 rounded flex items-center justify-center"
                style={{ background: GREY }}
              >
                <span className="font-bold text-white leading-none tabular-nums" style={{ fontSize: "clamp(26px, 4.2vh, 58px)" }}>
                  {b.value}
                </span>
              </div>
            </div>
          ))}
          <div className="rounded-md flex items-center justify-between px-3 py-2 isro-serif" style={{ background: "oklch(0.21 0.05 255)" }}>
            <span style={{ color: "oklch(0.85 0.25 145)" }} className="text-[clamp(15px,1.5vw,24px)]">
              INS
            </span>
            <span className="text-[clamp(13px,1.3vw,20px)]" style={{ color: ins === "UNSTABLE" ? "oklch(0.72 0.19 35)" : "white" }}>
              {ins}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
