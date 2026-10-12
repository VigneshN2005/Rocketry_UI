import { useEffect, useRef, useState } from "react";

export type CansatState =
  | "BOOT"
  | "STANDBY"
  | "EJECTION"
  | "PRIMARY_DESCENT"
  | "CONTROLLED_DESCENT"
  | "LANDED"
  | "MISSION_COMPLETE";

export const CANSAT_STATES: CansatState[] = [
  "BOOT",
  "STANDBY",
  "EJECTION",
  "PRIMARY_DESCENT",
  "CONTROLLED_DESCENT",
  "LANDED",
  "MISSION_COMPLETE",
];

export type Sample = { t: number; v: number };
export type LatLon = [number, number];

export const CONTROLLED_DESCENT_TRIGGER_ALT = 600;

export type CansatMarkers = {
  ejection?: LatLon;
  propeller?: LatLon;
  landing?: LatLon;
  predicted?: LatLon;
};

export type CansatFrame = {
  state: CansatState;
  t: number;
  altitude: number;
  velocity: number;
  pressure: number;
  radiationCpm: number;
  irTemp: number;
  battery: number;
  current: number;
  propellers: "STOWED" | "DEPLOYED" | "FAILED";
  rssi: number;
  snr: number;
  linkQuality: number;
  lastPacketAt: number;
  updateRate: number;
  gpsValid: boolean;
  lat: number;
  lon: number;
  path: LatLon[];
  markers: CansatMarkers;
  charts: {
    altitude: Sample[];
    velocity: Sample[];
    pressure: Sample[];
    radiation: Sample[];
    batteryCurrent: Sample[];
    batteryVoltage: Sample[];
    irTemp: Sample[];
  };
};

const MAX = 120;

function push(arr: Sample[], t: number, v: number): Sample[] {
  const next = arr.length >= MAX ? arr.slice(1) : arr.slice();
  next.push({ t, v });
  return next;
}

export function useTelemetry() {
  const t0 = useRef(Date.now());
  const [cansat, setCansat] = useState<CansatFrame>(() => ({
    state: "STANDBY",
    t: 0,
    altitude: 0,
    velocity: 0,
    pressure: 1013,
    radiationCpm: 18,
    irTemp: 22,
    battery: 7.8,
    current: 0.42,
    propellers: "STOWED",
    rssi: -71,
    snr: 7.2,
    linkQuality: 92,
    lastPacketAt: 0,
    updateRate: 5,
    gpsValid: true,
    lat: 13.0829,
    lon: 80.2705,
    path: [[13.0829, 80.2705]],
    markers: {},
    charts: {
      altitude: [],
      velocity: [],
      pressure: [],
      radiation: [],
      batteryCurrent: [],
      batteryVoltage: [],
      irTemp: [],
    },
  }));

  useEffect(() => {
    const id = setInterval(() => {
      const t = (Date.now() - t0.current) / 1000;
      const now = Date.now();

      setCansat((c) => {
        let state = c.state;
        if (t > 28 && state === "STANDBY") state = "EJECTION";
        if (t > 34 && state === "EJECTION") state = "PRIMARY_DESCENT";
        if (t > 60 && state === "PRIMARY_DESCENT") state = "CONTROLLED_DESCENT";
        if (t > 95 && state === "CONTROLLED_DESCENT") state = "LANDED";
        if (t > 105 && state === "LANDED") state = "MISSION_COMPLETE";

        let alt = c.altitude;
        let vel = c.velocity;
        if (state === "STANDBY") {
          alt = 0;
        } else if (state === "EJECTION") {
          alt = 900 + Math.random() * 30;
          vel = -18;
        } else if (state === "PRIMARY_DESCENT") {
          vel = -12 + Math.random() * 2;
          alt = Math.max(0, alt + vel * 0.2);
        } else if (state === "CONTROLLED_DESCENT") {
          vel = -4 + Math.random();
          alt = Math.max(0, alt + vel * 0.2);
        } else {
          vel = 0;
          alt = 0;
        }

        const propellers: CansatFrame["propellers"] =
          state === "CONTROLLED_DESCENT" || state === "LANDED" || state === "MISSION_COMPLETE"
            ? "DEPLOYED"
            : "STOWED";

        const lat = c.lat + (Math.random() - 0.5) * 0.00006;
        const lon = c.lon + (Math.random() - 0.5) * 0.00006;
        const path: LatLon[] =
          c.path.length > 160 ? [...c.path.slice(1), [lat, lon]] : [...c.path, [lat, lon]];

        const markers = { ...c.markers };
        if (state !== c.state) {
          if (state === "EJECTION") markers.ejection = [lat, lon];
          if (state === "CONTROLLED_DESCENT") markers.propeller = [lat, lon];
          if (state === "LANDED") markers.landing = [lat, lon];
        }
        if (!markers.predicted || state === "PRIMARY_DESCENT" || state === "CONTROLLED_DESCENT") {
          markers.predicted = [lat + 0.00025, lon + 0.0002];
        }

        const radiationCpm = 15 + Math.random() * 10;
        const battery = Math.max(6.6, c.battery - 0.0005);
        const motorCurrent = propellers === "DEPLOYED" && state === "CONTROLLED_DESCENT" ? 2.3 : 0;
        const current = 0.4 + Math.random() * 0.2 + motorCurrent * 0.3;
        const pressure = Math.max(200, 1013 - alt * 0.11 + (Math.random() - 0.5));

        return {
          ...c,
          state,
          t,
          altitude: alt,
          velocity: vel,
          pressure,
          radiationCpm,
          irTemp: 22 - alt * 0.005 + (Math.random() - 0.5) * 0.5,
          battery,
          current,
          propellers,
          rssi: -65 - Math.round(Math.random() * 18),
          snr: Math.max(-6, Math.min(11, c.snr + (Math.random() - 0.5) * 1.4)),
          linkQuality: Math.max(55, Math.min(100, c.linkQuality + (Math.random() - 0.5) * 4)),
          lastPacketAt: now,
          updateRate: 4.4 + Math.random() * 0.9,
          gpsValid: Math.random() > 0.03,
          lat,
          lon,
          path,
          markers,
          charts: {
            altitude: push(c.charts.altitude, t, alt),
            velocity: push(c.charts.velocity, t, vel),
            pressure: push(c.charts.pressure, t, pressure),
            radiation: push(c.charts.radiation, t, radiationCpm),
            batteryCurrent: push(c.charts.batteryCurrent, t, current),
            batteryVoltage: push(c.charts.batteryVoltage, t, battery),
            irTemp: push(c.charts.irTemp, t, 22 - alt * 0.005),
          },
        };
      });
    }, 200);
    return () => clearInterval(id);
  }, []);

  return { cansat };
}
