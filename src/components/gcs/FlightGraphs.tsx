import { useState } from "react";
import type { CansatFrame } from "./telemetry";
import { SeriesChart, type LineSpec } from "./SeriesChart";
import { PanelTitle } from "./Kit";

const YELLOW = "oklch(0.88 0.15 98)";
const GREEN = "oklch(0.78 0.15 155)";
const ALT = "oklch(0.74 0.15 20)";
const CYAN = "oklch(0.82 0.12 210)";
const VIOLET = "oklch(0.74 0.12 300)";
const AMBER = "oklch(0.8 0.16 70)";

/** ISRO-style flight-parameters chart + the full set of descent graphs. */
export function FlightGraphs({ f }: { f: CansatFrame }) {
  const [view, setView] = useState<"both" | "vel" | "alt">("both");
  const h = f.history;

  const main: LineSpec[] =
    view === "vel"
      ? [
          { key: "vz", label: "Descent rate", color: YELLOW, width: 2.4 },
          { key: "vref", label: "Planned rate", color: "oklch(0.92 0.02 250)", dashed: true },
          { key: "gspeed", label: "Ground speed", color: CYAN },
        ]
      : view === "alt"
        ? [{ key: "alt", label: "Altitude", color: ALT, width: 2.4 }]
        : [
            { key: "vz", label: "Descent rate [m/s]", color: YELLOW, width: 2.4 },
            { key: "vref", label: "Planned rate [m/s]", color: "oklch(0.92 0.02 250)", dashed: true },
            { key: "alt", label: "Altitude [m]", color: ALT, axis: "right" as const, width: 2.4 },
          ];

  return (
    <div className="flex flex-col gap-3">
      <div className="panel p-3 flex flex-col gap-2">
        <PanelTitle
          title="Flight Parameters · Time vs Velocity and Altitude"
          right={
            <div className="flex gap-1.5">
              {(
                [
                  ["both", "Both"],
                  ["vel", "Time vs Velocity"],
                  ["alt", "Time vs Altitude"],
                ] as const
              ).map(([k, t]) => (
                <button
                  key={k}
                  onClick={() => setView(k)}
                  className="px-2.5 py-1 rounded label-mono text-[9px] border"
                  style={{
                    borderColor: view === k ? "var(--cansat)" : "var(--color-border)",
                    color: view === k ? "var(--cansat)" : undefined,
                    background: view === k ? "oklch(0.24 0.05 235 / 0.6)" : undefined,
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          }
        />
        <SeriesChart
          data={h}
          lines={main}
          height={330}
          events={f.events}
          showEvents
          big
          unit={view === "alt" ? "ALTITUDE [m]" : "VELOCITY [m/s]"}
          rightUnit="ALTITUDE [m]"
          domainRight={[0, 1000]}
          domainLeft={view === "alt" ? [0, 1000] : [0, 16]}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
        <SeriesChart
          title="Position error"
          unit="m"
          data={h}
          lines={[
            { key: "errG", label: "GNSS", color: YELLOW },
            { key: "errV", label: "Vision est.", color: GREEN },
            { key: "miss", label: "Predicted miss", color: AMBER, dashed: true },
          ]}
          events={f.events}
          showEvents
          height={190}
        />
        <SeriesChart
          title="Speed"
          unit="m/s"
          data={h}
          lines={[
            { key: "vz", label: "Descent", color: YELLOW },
            { key: "vref", label: "Plan", color: "oklch(0.92 0.02 250)", dashed: true },
            { key: "gspeed", label: "Ground", color: CYAN },
          ]}
          height={190}
        />
        <SeriesChart
          title="Altitude"
          unit="m AGL"
          data={h}
          lines={[{ key: "alt", label: "Barometer", color: ALT }]}
          height={170}
        />
        <SeriesChart
          title="Thrust and image match"
          data={h}
          lines={[
            { key: "thrust", label: "Thrust %", color: VIOLET },
            { key: "c", label: "Match score", color: GREEN, axis: "right" },
          ]}
          domainRight={[0, 1]}
          height={170}
        />
        <SeriesChart
          title="Attitude"
          unit="deg"
          data={h}
          lines={[
            { key: "roll", label: "Roll", color: CYAN },
            { key: "pitch", label: "Pitch", color: AMBER },
          ]}
          height={170}
        />
        <SeriesChart
          title="Link"
          data={h}
          lines={[
            { key: "rssi", label: "RSSI dBm", color: CYAN },
            { key: "snr", label: "SNR dB", color: GREEN, axis: "right" },
          ]}
          height={170}
        />
      </div>
    </div>
  );
}
