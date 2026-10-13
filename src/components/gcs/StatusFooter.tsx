import { PanelRight } from "lucide-react";
import type { CansatFrame } from "./telemetry";
import { PROP_ALT } from "./mission";

const STEPS: { id: string; label: string }[] = [
  { id: "STANDBY", label: "STANDBY" },
  { id: "EJECTION", label: "EJECTION" },
  { id: "PRIMARY_DESCENT", label: "PRIMARY DESCENT" },
  { id: "CONTROLLED_DESCENT", label: "CONTROLLED DESCENT" },
  { id: "LANDED", label: "LANDED" },
  { id: "MISSION_COMPLETE", label: "MISSION COMPLETE" },
];
const CTRL = new Set(["L3", "L4", "L5", "L6", "L7", "L8"]);
const OK = "var(--ok)";
const WARN = "var(--warn)";

export function StatusFooter({
  f,
  stateTimes,
  alertCount,
  onParams,
}: {
  f: CansatFrame;
  stateTimes: Record<string, string>;
  alertCount: number;
  onParams: () => void;
}) {
  const idx = Math.max(0, STEPS.findIndex((s) => s.id === f.state));

  const cdStatus =
    CTRL.has(f.landing) ? "ACTIVE" : f.landing === "L9" ? "ABORTED · PASSIVE" : f.landing === "L10" ? "COMPLETE" : f.met >= 0 ? "ARMED" : "STANDBY";
  const cdColor = cdStatus === "ACTIVE" ? OK : cdStatus === "ARMED" ? WARN : cdStatus.startsWith("ABORTED") ? "var(--destructive)" : "oklch(0.75 0.03 250)";
  const props = f.propellers;
  const propColor = props === "DEPLOYED" ? OK : props === "DEPLOYING" ? WARN : "oklch(0.75 0.03 250)";
  const deployed = props !== "STOWED";

  return (
    <footer
      className="shrink-0 border-t px-3 py-1.5 flex items-center gap-x-5 gap-y-1 flex-wrap"
      style={{ background: "oklch(0.1 0.03 258)" }}
    >
      {/* CanSat state machine */}
      <div className="flex items-stretch gap-1 min-w-0">
        {STEPS.map((s, i) => {
          const done = i < idx;
          const cur = i === idx;
          return (
            <div
              key={s.id}
              className="px-2 py-0.5 rounded flex flex-col items-center justify-center leading-tight"
              style={{
                background: cur ? "oklch(0.36 0.1 215)" : done ? "oklch(0.24 0.05 190)" : "oklch(0.17 0.03 256)",
                border: `1px solid ${cur ? "var(--cansat)" : "var(--color-border)"}`,
                color: cur ? "white" : done ? "oklch(0.85 0.05 200)" : "oklch(0.6 0.03 250)",
              }}
            >
              <span className="label-mono text-[8.5px]" style={{ color: "inherit", letterSpacing: "0.08em" }}>
                {s.label}
              </span>
              <span className="readout text-[9px] opacity-80">{stateTimes[s.id] ?? "—"}</span>
            </div>
          );
        })}
      </div>

      {/* Controlled descent indicator */}
      <div className="flex items-center gap-4 rounded px-3 py-1 border" style={{ borderColor: cdColor, background: "oklch(0.13 0.035 256)" }}>
        <span className="label-mono text-[9px]" style={{ color: cdColor }}>
          CONTROLLED DESCENT
        </span>
        <FooterKV k="Trigger" v={`${PROP_ALT} m`} />
        <FooterKV k="Current alt" v={deployed ? `${f.altitude.toFixed(0)} m` : "—"} />
        <FooterKV k="Status" v={cdStatus} color={cdColor} />
        <FooterKV k="Propellers" v={props} color={propColor} />
      </div>

      <div className="ml-auto flex items-center gap-3">
        <span className="label-mono text-[9px]" style={{ color: alertCount ? WARN : undefined }}>
          {alertCount ? `${alertCount} ACTIVE ALERT${alertCount > 1 ? "S" : ""}` : "NO ACTIVE ALERTS"}
        </span>
        <button
          onClick={onParams}
          className="panel px-2.5 py-1 label-mono text-[9.5px] flex items-center gap-1.5 hover:bg-[oklch(0.25_0.045_255)]"
        >
          <PanelRight className="h-3.5 w-3.5" /> All parameters
        </button>
      </div>
    </footer>
  );
}

function FooterKV({ k, v, color }: { k: string; v: string; color?: string }) {
  return (
    <div className="flex flex-col leading-tight">
      <span className="label-mono text-[8px]">{k}</span>
      <span className="readout text-[12px]" style={{ color }}>
        {v}
      </span>
    </div>
  );
}
