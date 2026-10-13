import type { ReactNode } from "react";
import type { CansatFrame } from "./telemetry";
import { SeriesChart } from "./SeriesChart";
import { AttitudeIndicator } from "./AttitudeIndicator";
import { Bar, KV, PanelTitle, Stat, StatusChip, f0, f1, f2, type Status } from "./Kit";

const CYAN = "oklch(0.82 0.12 210)";
const GREEN = "oklch(0.78 0.15 155)";
const YELLOW = "oklch(0.88 0.15 98)";
const RED = "oklch(0.72 0.19 35)";
const VIOLET = "oklch(0.74 0.12 300)";
const ALT = "oklch(0.74 0.15 20)";

function Card({
  title,
  purpose,
  status,
  statusText,
  children,
  className = "",
}: {
  title: string;
  purpose: string;
  status: Status;
  statusText?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`panel p-3 flex flex-col gap-2.5 ${className}`}>
      <PanelTitle title={title} right={<StatusChip status={status} text={statusText} />} />
      <div className="label-mono text-[9px] opacity-60 -mt-1.5">{purpose}</div>
      {children}
    </div>
  );
}

export function SensorsPanel({ f }: { f: CansatFrame }) {
  const h = f.history;
  const imu = f.imu;
  const imuStatus: Status = imu.stability === "UNSTABLE" ? "WARN" : "OK";
  const gnssOk = f.gnss.fix === "3D";

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
      {/* IMU */}
      <Card
        title="ICM-20948 · IMU"
        purpose="Acceleration, angular velocity, magnetometer, attitude"
        status={imuStatus}
        statusText={imu.stability}
        className="xl:col-span-2"
      >
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_190px] gap-3">
          <div className="grid grid-cols-1 gap-2">
            <div className="grid grid-cols-3 gap-2">
              <Stat label="AX" value={f2(imu.ax)} unit="m/s²" color={CYAN} small />
              <Stat label="AY" value={f2(imu.ay)} unit="m/s²" color={GREEN} small />
              <Stat label="AZ" value={f2(imu.az)} unit="m/s²" color={YELLOW} small />
              <Stat label="GX" value={f1(imu.gx)} unit="°/s" color={CYAN} small />
              <Stat label="GY" value={f1(imu.gy)} unit="°/s" color={GREEN} small />
              <Stat label="GZ" value={f1(imu.gz)} unit="°/s" color={YELLOW} small />
              <Stat label="MX" value={f1(imu.mx)} unit="µT" color={CYAN} small />
              <Stat label="MY" value={f1(imu.my)} unit="µT" color={GREEN} small />
              <Stat label="MZ" value={f1(imu.mz)} unit="µT" color={YELLOW} small />
            </div>
          </div>
          <AttitudeIndicator label="Attitude" accent="var(--cansat)" pitch={imu.pitch} roll={imu.roll} yaw={imu.yaw} />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
          <SeriesChart
            title="Acceleration"
            unit="m/s²"
            data={h}
            legend={false}
            height={130}
            lines={[
              { key: "ax", label: "X", color: CYAN },
              { key: "ay", label: "Y", color: GREEN },
              { key: "az", label: "Z", color: YELLOW },
            ]}
          />
          <SeriesChart
            title="Angular velocity"
            unit="°/s"
            data={h}
            legend={false}
            height={130}
            lines={[
              { key: "gx", label: "X", color: CYAN },
              { key: "gy", label: "Y", color: GREEN },
              { key: "gz", label: "Z", color: YELLOW },
            ]}
          />
          <SeriesChart
            title="Magnetometer"
            unit="µT"
            data={h}
            legend={false}
            height={130}
            lines={[
              { key: "mx", label: "X", color: CYAN },
              { key: "my", label: "Y", color: GREEN },
              { key: "mz", label: "Z", color: YELLOW },
            ]}
          />
        </div>
      </Card>

      {/* ToF */}
      <Card
        title="VL53L1X · Time of Flight"
        purpose="Distance to the ground, landing proximity"
        status={f.tof.valid ? "OK" : "OFF"}
        statusText={f.tof.valid ? "VALID" : "OUT OF RANGE"}
      >
        <div className="grid grid-cols-[70px_1fr] gap-3">
          <ToFGauge mm={f.tof.mm} />
          <div className="flex flex-col gap-2">
            <Stat label="Distance" value={f.tof.mm === null ? "—" : f0(f.tof.mm)} unit="mm" color={CYAN} />
            <Stat label="Proximity" value={proximity(f)} small color={proximityColor(f)} />
            <Stat label="Height (baro)" value={f1(f.altitude)} unit="m" small />
          </div>
        </div>
      </Card>

      {/* Barometer */}
      <Card
        title="MS5611 · Barometer"
        purpose="Pressure, altitude above ground, vertical speed"
        status="OK"
      >
        <div className="grid grid-cols-3 gap-2">
          <Stat label="Pressure" value={f1(f.baro.pressure)} unit="hPa" color={CYAN} small />
          <Stat label="Altitude" value={f1(f.baro.altitude)} unit="m" color={ALT} small />
          <Stat label="V. speed" value={f2(f.baro.vspeed)} unit="m/s" color={YELLOW} small />
        </div>
        <ThresholdRow alt={f.altitude} />
        <SeriesChart
          title="Pressure and altitude"
          data={h}
          legend={false}
          height={130}
          lines={[
            { key: "press", label: "Pressure hPa", color: CYAN },
            { key: "alt", label: "Altitude m", color: ALT, axis: "right" },
          ]}
        />
      </Card>

      {/* SHT30 */}
      <Card title="SHT30 · Climate" purpose="Temperature and relative humidity" status="OK">
        <div className="grid grid-cols-2 gap-2">
          <Stat label="Temperature" value={f1(f.sht.temp)} unit="°C" color={ALT} />
          <Stat label="Humidity" value={f1(f.sht.rh)} unit="% RH" color={CYAN} />
        </div>
        <SeriesChart
          title="Temperature and humidity"
          data={h}
          legend={false}
          height={130}
          lines={[
            { key: "temp", label: "Temp °C", color: ALT },
            { key: "rh", label: "RH %", color: CYAN, axis: "right" },
          ]}
        />
      </Card>

      {/* INA219 */}
      <Card
        title="INA219 · Power"
        purpose="Bus voltage, current, power (electronics rail)"
        status={f.ina.busV < 7.0 ? "WARN" : "OK"}
        statusText={f.ina.busV < 7.0 ? "LOW VOLTAGE" : "NOMINAL"}
      >
        <div className="grid grid-cols-3 gap-2">
          <Stat label="Voltage" value={f2(f.ina.busV)} unit="V" color={GREEN} small />
          <Stat label="Current" value={f0(f.ina.currentMA)} unit="mA" color={YELLOW} small />
          <Stat label="Power" value={f0(f.ina.powerMW)} unit="mW" color={VIOLET} small />
        </div>
        <div>
          <div className="flex justify-between label-mono text-[9px] mb-1">
            <span>Charge (est.)</span>
            <span>{f0(chargePct(f.ina.busV))} %</span>
          </div>
          <Bar value={chargePct(f.ina.busV)} max={100} color={f.ina.busV < 7.0 ? RED : GREEN} mark={20} height={7} />
        </div>
        <SeriesChart
          title="Voltage and current"
          data={h}
          legend={false}
          height={110}
          lines={[
            { key: "busV", label: "V", color: GREEN },
            { key: "curr", label: "mA", color: YELLOW, axis: "right" },
          ]}
        />
      </Card>

      {/* GNSS */}
      <Card
        title="L89HA · GNSS"
        purpose="Position, altitude, speed, time, satellites"
        status={gnssOk ? "OK" : "WARN"}
        statusText={gnssOk ? "3D FIX" : "NO FIX"}
        className="xl:col-span-2"
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <Stat label="Latitude" value={f.gnss.lat.toFixed(6)} unit="°N" color={CYAN} small />
          <Stat label="Longitude" value={f.gnss.lon.toFixed(6)} unit="°E" color={CYAN} small />
          <Stat label="Altitude" value={f1(f.gnss.alt)} unit="m MSL" small />
          <Stat label="Speed" value={f2(f.gnss.speed)} unit="m/s" small />
          <Stat label="Satellites" value={f.gnss.sats} small color={gnssOk ? GREEN : RED} />
          <Stat label="HDOP" value={f2(f.gnss.hdop)} small />
          <Stat label="GNSS time" value={f.gnss.utc} unit="UTC" small />
          <Stat label="Error to target" value={f1(f.errGnss)} unit="m" small color={YELLOW} />
        </div>
        <div className="flex items-end gap-1 h-8" aria-label="Satellite bars">
          {Array.from({ length: 16 }, (_, i) => (
            <div
              key={i}
              className="flex-1 rounded-sm"
              style={{
                height: `${30 + ((i * 37) % 70)}%`,
                background: i < f.gnss.sats ? GREEN : "oklch(0.26 0.04 255)",
              }}
            />
          ))}
        </div>
        <div className="well p-2.5">
          <KV k="Track point count" v={String(f.path.length)} />
          <KV k="Distance to target" v={f1(f.rangeToTarget)} unit="m" />
          <KV k="Bearing to target" v={f0(f.azimuthToTarget)} unit="°" />
        </div>
      </Card>
    </div>
  );
}

function chargePct(v: number): number {
  // simple linear estimate for a 2S pack, 6.0 V empty to 8.4 V full
  return Math.max(0, Math.min(100, ((v - 6.0) / (8.4 - 6.0)) * 100));
}

function proximity(f: CansatFrame): string {
  if (!f.tof.valid) return "OUT OF RANGE";
  const mm = f.tof.mm ?? 9999;
  if (mm < 300) return "TOUCHDOWN";
  if (mm < 1500) return "FLARE";
  return "APPROACH";
}

function proximityColor(f: CansatFrame): string {
  const p = proximity(f);
  if (p === "TOUCHDOWN") return GREEN;
  if (p === "FLARE") return YELLOW;
  return "oklch(0.8 0.03 250)";
}

function ToFGauge({ mm }: { mm: number | null }) {
  const pct = mm === null ? 0 : Math.max(0, Math.min(100, (mm / 4000) * 100));
  return (
    <div className="relative well h-[150px] overflow-hidden">
      <div className="absolute inset-x-0 bottom-0" style={{ height: `${pct}%`, background: "oklch(0.55 0.1 210 / 0.55)" }} />
      {[0, 1, 2, 3, 4].map((m) => (
        <div key={m} className="absolute inset-x-0 flex items-center" style={{ bottom: `${(m / 4) * 100}%` }}>
          <div className="h-px w-3 bg-foreground/50" />
          <span className="label-mono text-[8px] ml-1">{m} m</span>
        </div>
      ))}
      {mm !== null ? (
        <div className="absolute right-1 h-0.5 w-6 bg-[oklch(0.88_0.15_98)]" style={{ bottom: `${pct}%` }} />
      ) : null}
    </div>
  );
}

function ThresholdRow({ alt }: { alt: number }) {
  const rows = [
    { t: 1000, label: "SEPARATION" },
    { t: 700, label: "FLAPS" },
    { t: 600, label: "PROPS" },
  ];
  return (
    <div className="grid grid-cols-3 gap-1.5">
      {rows.map((r) => {
        const passed = alt <= r.t;
        return (
          <div key={r.t} className="well px-2 py-1 flex items-center justify-between">
            <span className="label-mono text-[8.5px]">{r.label}</span>
            <span className="readout text-[11px]" style={{ color: passed ? GREEN : "oklch(0.8 0.03 250)" }}>
              {r.t} m {passed ? "✓" : ""}
            </span>
          </div>
        );
      })}
    </div>
  );
}

