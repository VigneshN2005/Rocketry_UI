import { Gauge } from "lucide-react";
import type { CansatFrame } from "./telemetry";
import { KV, PanelTitle, StatusChip, ValueBox, f0, f1, f2, type Status } from "./Kit";

const YELLOW = "oklch(0.88 0.15 98)";
const GREEN = "oklch(0.78 0.15 155)";

/** Right-hand "flight parameters" column: big value boxes + full detail list. */
export function ParameterBox({ f }: { f: CansatFrame }) {
  const visionStatus: Status =
    f.visionStatus === "LOCKED" ? "OK" : f.visionStatus === "SEARCH" ? "WARN" : "OFF";
  const gnssStatus: Status = f.gnss.fix === "3D" ? "OK" : "WARN";
  const insStatus: Status = f.imu.stability === "UNSTABLE" ? "WARN" : "OK";

  return (
    <div className="panel p-3 flex flex-col gap-2.5">
      <PanelTitle title="Flight Parameters" icon={<Gauge className="h-3.5 w-3.5" />} />

      <div className="grid grid-cols-2 gap-2">
        <ValueBox label="Time" unit="s" value={`${f.met < 0 ? "−" : ""}${Math.abs(f.met).toFixed(1)}`} />
        <ValueBox label="Rel. Vel" unit="m/s" value={f2(f.descentRate)} color={YELLOW} sub={`PLAN ${f2(f.vRef)}`} />
        <ValueBox label="Altitude" unit="m" value={f1(f.altitude)} color="oklch(0.74 0.15 20)" />
        <ValueBox label="Range" unit="m" value={f1(f.rangeToTarget)} sub="TO TARGET" />
        <ValueBox label="Azimuth" unit="deg" value={f1(f.azimuthToTarget)} sub="TO TARGET" />
        <ValueBox
          label="Error"
          unit="m"
          value={f1(f.errGnss)}
          color={f.errGnss < 25 ? GREEN : f.errGnss < 100 ? YELLOW : "oklch(0.72 0.19 35)"}
          sub={`RING ${f.ringText}`}
        />
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        <StatusCell label="INS" status={insStatus} text={f.imu.stability} />
        <StatusCell label="GNSS" status={gnssStatus} text={f.gnss.fix === "3D" ? `3D ${f.gnss.sats}` : "NO FIX"} />
        <StatusCell label="VISION" status={visionStatus} text={f.visionStatus} />
      </div>

      <div className="well p-2.5 flex flex-col">
        <Section title="Kinematics" />
        <KV k="Descent rate" v={f2(f.descentRate)} unit="m/s" />
        <KV k="Planned rate" v={f2(f.vRef)} unit="m/s" />
        <KV k="Rate error" v={f2(f.descentRate - f.vRef)} unit="m/s" />
        <KV k="Ground speed" v={f2(f.groundSpeed)} unit="m/s" />
        <KV k="Total speed" v={f2(f.speed3d)} unit="m/s" />
        <KV k="Course" v={f0(f.course)} unit="°" />
        <KV k="Slant range" v={f0(f.slantToTarget)} unit="m" />

        <Section title="Navigation error" />
        <KV k="Error (GNSS)" v={f1(f.errGnss)} unit="m" />
        <KV k="Error (vision est.)" v={f1(f.errVision)} unit="m" />
        <KV k="Predicted miss" v={f1(f.impactMiss)} unit="m" />
        <KV k="Landing ring" v={f.ringText} />
        <KV k="Position E / N" v={`${f1(f.posE)} / ${f1(f.posN)}`} unit="m" />

        <Section title="Guidance" />
        <KV k="Time to ground" v={f0(f.tRem)} unit="s" />
        <KV k="Wind (est.)" v={`${f1(f.windSpeed)} @ ${f0(f.windFrom)}°`} unit="m/s" />
        <KV k="Wanted ground speed" v={f2(f.vDesGround)} unit="m/s" />
        <KV k="Wanted air speed" v={f2(f.vAirCmd)} unit="m/s" />
        <KV k="Correction reach" v={f0(f.reach)} unit="m" color={f.reachable ? GREEN : "oklch(0.72 0.19 35)"} />
        <KV k="Tilt command" v={f1(f.tiltCmd)} unit="°" />

        <Section title="Vision" />
        <KV k="Band" v={f.band > 0 ? `${f.band} · ${f0(f.bandHeight)} m` : "—"} />
        <KV k="Pixel size" v={f2(f.pixelSize)} unit="m" />
        <KV k="Match score" v={f2(f.matchC)} />
        <KV k="Peak ratio" v={f2(f.matchPsr)} />
        <KV k="Fixes ok / rejected" v={`${f.fixesAccepted} / ${f.fixesRejected}`} />

        <Section title="Power and attitude" />
        <KV k="Thrust" v={`${f1(f.thrustN)} N · ${f0(f.thrustPct)}`} unit="%" />
        <KV k="Roll / pitch" v={`${f1(f.imu.roll)} / ${f1(f.imu.pitch)}`} unit="°" />
        <KV k="Yaw" v={f1(f.imu.yaw)} unit="°" />
        <KV k="Bus" v={`${f2(f.ina.busV)} V · ${f0(f.ina.currentMA)} mA`} />
      </div>
    </div>
  );
}

function Section({ title }: { title: string }) {
  return (
    <div className="label-mono text-[9px] mt-2 first:mt-0 mb-0.5" style={{ color: "var(--cansat)" }}>
      {title}
    </div>
  );
}

function StatusCell({ label, status, text }: { label: string; status: Status; text: string }) {
  return (
    <div className="well px-2 py-1.5 flex flex-col gap-1">
      <span className="label-mono text-[9px]">{label}</span>
      <StatusChip status={status} text={text} />
    </div>
  );
}
