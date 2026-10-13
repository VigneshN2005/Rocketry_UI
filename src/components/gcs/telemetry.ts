import { useCallback, useEffect, useRef, useState } from "react";
import {
  advance,
  createSim,
  simAssistOff,
  simSetTarget,
  snapshot,
  type CansatFrame,
  type SimState,
} from "./sim";

export {
  CANSAT_STATES,
  type CansatFrame,
  type CansatState,
  type HealthItem,
  type HistRow,
  type MissionEventRec,
  type Sample,
  type TrackPt,
} from "./sim";
export { CONTROLLED_DESCENT_TRIGGER_ALT } from "./mission";
export type { LatLon } from "./mission";

export type PlaybackSpeed = "1x" | "5x" | "10x";
const SPEED_FACTOR: Record<PlaybackSpeed, number> = { "1x": 1, "5x": 5, "10x": 10 };
const TICK_MS = 200;

export type CommandResult = { ok: boolean; reason?: string };

/**
 * Simulated telemetry source. The same CansatFrame shape is what the radio
 * decoder must produce later, so the screens do not change when real packets
 * replace the simulator.
 */
export function useTelemetry(speed: PlaybackSpeed = "5x", paused = false) {
  const sim = useRef<SimState>(createSim(7));
  const speedRef = useRef(speed);
  const pausedRef = useRef(paused);
  speedRef.current = speed;
  pausedRef.current = paused;

  const [cansat, setCansat] = useState<CansatFrame>(() => snapshot(sim.current));

  const restart = useCallback(() => {
    const next = createSim(Math.floor(Math.random() * 1000) + 1);
    sim.current = next;
    setCansat(snapshot(next));
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      if (pausedRef.current) return;
      const s = sim.current;
      advance(s, (TICK_MS / 1000) * SPEED_FACTOR[speedRef.current]);
      const frame = snapshot(s);
      if (frame.state === "MISSION_COMPLETE" && frame.autoRestartIn !== null && frame.autoRestartIn <= 0) {
        const next = createSim(Math.floor(Math.random() * 1000) + 1);
        sim.current = next;
        setCansat(snapshot(next));
        return;
      }
      setCansat(frame);
    }, TICK_MS);
    return () => clearInterval(id);
  }, []);

  const assistOff = useCallback((): CommandResult => simAssistOff(sim.current), []);
  const setTarget = useCallback((lat: number, lon: number): CommandResult => {
    const r = simSetTarget(sim.current, lat, lon);
    if (r.ok) setCansat(snapshot(sim.current));
    return r;
  }, []);

  return { cansat, restart, assistOff, setTarget };
}
