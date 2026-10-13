import { useState } from "react";
import { Send } from "lucide-react";
import { CommandGrid, type CmdStage, type CommandSender } from "./CommandButton";
import { PanelTitle, KV, f0 } from "./Kit";
import type { CansatFrame } from "./telemetry";

type Props = {
  f: CansatFrame;
  onCommand: CommandSender;
  onSetTarget: (lat: number, lon: number, onStage: (s: CmdStage) => void) => void;
};

export function CommandsPanel({ f, onCommand, onSetTarget }: Props) {
  const [lat, setLat] = useState(f.targetLat.toFixed(6));
  const [lon, setLon] = useState(f.targetLon.toFixed(6));
  const [stage, setStage] = useState<CmdStage>("IDLE");

  const padDist = Math.hypot(f.targetE - f.padE, f.targetN - f.padN);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
      <div className="panel p-3 flex flex-col gap-2">
        <PanelTitle title="Commands" icon={<Send className="h-3.5 w-3.5" />} />
        <CommandGrid
          accent="var(--cansat)"
          onSend={onCommand}
          commands={[
            { name: "COMM_TEST" },
            { name: "ZERO_ALTITUDE", note: "Set height 0 at the pad" },
            { name: "ZERO_ACCEL" },
            { name: "TELEMETRY_ENABLE" },
            { name: "IMU_CALIBRATE" },
            { name: "SERVO_TRIGGER" },
            { name: "DEPLOY_CHUTE" },
            { name: "SIMULATION_ENABLE" },
            { name: "SIMULATION_ACTIVATE" },
            {
              name: "ASSIST_OFF",
              danger: true,
              confirm: true,
              note: "Stop motors, parachute only",
            },
            {
              name: "STOP_TELEMETRY",
              danger: true,
              confirm: true,
              note: "Halts downlink in case of interference",
            },
          ]}
        />
      </div>

      <div className="panel p-3 flex flex-col gap-3">
        <PanelTitle title="Landing Target" />
        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-1">
            <span className="label-mono text-[9px]">Latitude (°N)</span>
            <input
              value={lat}
              onChange={(e) => setLat(e.target.value)}
              className="well px-2 py-1.5 readout text-sm outline-none focus:border-[var(--cansat)]"
              inputMode="decimal"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="label-mono text-[9px]">Longitude (°E)</span>
            <input
              value={lon}
              onChange={(e) => setLon(e.target.value)}
              className="well px-2 py-1.5 readout text-sm outline-none focus:border-[var(--cansat)]"
              inputMode="decimal"
            />
          </label>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setStage("SENT");
              onSetTarget(parseFloat(lat), parseFloat(lon), setStage);
            }}
            className="panel px-3 py-2 label-mono text-[10px] hover:bg-[oklch(0.25_0.045_255)]"
            style={{ borderColor: "var(--cansat)", color: "var(--cansat)" }}
          >
            SET_TARGET
          </button>
          <span
            className="label-mono text-[10px]"
            style={{
              color:
                stage === "PASS" || stage === "ACK"
                  ? "var(--ok)"
                  : stage === "FAIL" || stage === "NAK"
                    ? "var(--destructive)"
                    : "var(--warn)",
            }}
          >
            {stage === "IDLE" ? "" : stage === "SENT" ? "SENT…" : stage}
          </span>
        </div>
        <div className="well p-2.5">
          <KV k="Current target" v={`${f.targetLat.toFixed(5)}, ${f.targetLon.toFixed(5)}`} />
          <KV k="Pad to target" v={f0(padDist)} unit="m" color={padDist > 1000 ? "var(--destructive)" : undefined} />
          <KV k="Rule" v="Target within 1 km of pad" />
          <KV k="Locked" v="After motor start (L3)" />
        </div>
        <p className="text-[10.5px] leading-snug opacity-60">
          Choose the target on launch day from the forecast wind. The CanSat can correct about 380 m from 600 m.
        </p>
      </div>
    </div>
  );
}
