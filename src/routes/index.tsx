import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play, RotateCcw } from "lucide-react";
import { Header, type MissionEvent, type SystemStatus } from "@/components/gcs/Header";
import { StateTimeline } from "@/components/gcs/StateTimeline";
import { TrajectoryMap } from "@/components/gcs/TrajectoryMap";
import { ParameterBox } from "@/components/gcs/ParameterBox";
import { FlightGraphs } from "@/components/gcs/FlightGraphs";
import { SensorsPanel } from "@/components/gcs/SensorsPanel";
import { LandingPanel } from "@/components/gcs/LandingPanel";
import { HealthLinkPanel } from "@/components/gcs/HealthLinkPanel";
import { CommandsPanel } from "@/components/gcs/CommandsPanel";
import {
  AlertsPanel,
  type ActiveAlert,
  type AlertHistoryEntry,
  type AlertType,
} from "@/components/gcs/AlertsPanel";
import { CommandConsole, type ConsoleEntry } from "@/components/gcs/CommandConsole";
import type { CmdStage } from "@/components/gcs/CommandButton";
import {
  CANSAT_STATES,
  useTelemetry,
  type CommandResult,
  type PlaybackSpeed,
} from "@/components/gcs/telemetry";
import { MISSION_ID, SITE_NAME } from "@/components/gcs/mission";

export const Route = createFileRoute("/")({
  component: GroundStation,
  head: () => ({
    meta: [
      { title: "Mission Ground Station · CanSat Telemetry" },
      {
        name: "description",
        content:
          "CanSat ground station: descent trajectory, flight graphs, sensor panels, landing-logic status, health, signal and command console.",
      },
      { property: "og:title", content: "Mission Ground Station · CanSat Telemetry" },
      {
        property: "og:description",
        content:
          "Real-time CanSat telemetry, trajectory, error tracking, health and command uplink for a CanSat competition flight.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function stamp() {
  return new Date().toISOString().slice(11, 19);
}

type TabId = "graphs" | "sensors" | "landing" | "health" | "commands";
const TABS: { id: TabId; label: string }[] = [
  { id: "graphs", label: "Flight Graphs" },
  { id: "sensors", label: "Sensors" },
  { id: "landing", label: "Landing Logic" },
  { id: "health", label: "Health & Signal" },
  { id: "commands", label: "Commands" },
];

function GroundStation() {
  const [speed, setSpeed] = useState<PlaybackSpeed>("5x");
  const [paused, setPaused] = useState(false);
  const { cansat, restart, assistOff, setTarget } = useTelemetry(speed, paused);
  const [tab, setTab] = useState<TabId>("graphs");

  const [entries, setEntries] = useState<ConsoleEntry[]>([]);
  const nextId = useRef(1);

  // ---- Command lifecycle -------------------------------------------------
  const [parachuteFail, setParachuteFail] = useState(false);
  const raiseParachuteFailure = () => {
    setParachuteFail(true);
    setTimeout(() => setParachuteFail(false), 12000);
  };

  const pushCommand = (
    channel: ConsoleEntry["channel"],
    cmd: string,
    onStage?: (stage: CmdStage) => void,
    run?: () => CommandResult,
  ) => {
    const id = nextId.current++;
    setEntries((e) =>
      [...e, { id, t: stamp(), channel, cmd, ack: "PENDING" as const, exec: "PENDING" as const }].slice(-80),
    );
    onStage?.("SENT");

    const acked = run ? true : Math.random() > 0.06;
    setTimeout(
      () => {
        setEntries((e) => e.map((x) => (x.id === id ? { ...x, ack: acked ? "ACK" : "NAK" } : x)));
        onStage?.(acked ? "ACK" : "NAK");
        if (!acked) {
          setEntries((e) => e.map((x) => (x.id === id ? { ...x, exec: "FAIL" } : x)));
          if (cmd.startsWith("DEPLOY")) raiseParachuteFailure();
          return;
        }
        setTimeout(
          () => {
            const result = run ? run() : undefined;
            const passed = result ? result.ok : Math.random() > 0.08;
            setEntries((e) =>
              e.map((x) =>
                x.id === id ? { ...x, exec: passed ? "PASS" : "FAIL", note: result?.reason } : x,
              ),
            );
            onStage?.(passed ? "PASS" : "FAIL");
            if (!passed && cmd.startsWith("DEPLOY")) raiseParachuteFailure();
          },
          500 + Math.random() * 500,
        );
      },
      400 + Math.random() * 400,
    );
  };

  const onCommand = (c: string, onStage: (s: CmdStage) => void) =>
    pushCommand("CANSAT", c, onStage, c === "ASSIST_OFF" ? assistOff : undefined);

  const onSetTarget = (lat: number, lon: number, onStage: (s: CmdStage) => void) =>
    pushCommand("CANSAT", `SET_TARGET ${lat.toFixed(5)},${lon.toFixed(5)}`, onStage, () => setTarget(lat, lon));

  // ---- Alerts ------------------------------------------------------------
  const now = Date.now();
  const conditions = useMemo(() => {
    const list: {
      type: AlertType;
      level: "warn" | "danger";
      source: ActiveAlert["source"];
      detail?: string;
    }[] = [];
    const stale = !paused && cansat.lastPacketAt > 0 && now - cansat.lastPacketAt > 3000;
    if (cansat.linkQuality < 58 || cansat.rssi < -100)
      list.push({ type: "COMMUNICATION LOST", level: "danger", source: "CANSAT" });
    if (stale) list.push({ type: "TELEMETRY TIMEOUT", level: "danger", source: "CANSAT" });
    if (cansat.ina.busV < 7.0)
      list.push({ type: "LOW BATTERY", level: "warn", source: "CANSAT", detail: `${cansat.ina.busV.toFixed(2)} V` });
    if (cansat.sht.temp > 45)
      list.push({ type: "HIGH TEMPERATURE", level: "warn", source: "CANSAT", detail: `${cansat.sht.temp.toFixed(1)} °C` });
    if (cansat.gnss.fix !== "3D") list.push({ type: "GPS INVALID", level: "warn", source: "CANSAT" });
    for (const fault of cansat.faults) {
      if (
        fault === "VISION LOW SCORE" ||
        fault === "VISION DEGRADED" ||
        fault === "TARGET OUT OF REACH" ||
        fault === "WEAK LINK"
      )
        list.push({ type: fault, level: "warn", source: "CANSAT" });
      if (fault === "PASSIVE SAFE LATCHED")
        list.push({ type: "PASSIVE SAFE LATCHED", level: "danger", source: "CANSAT" });
    }
    if (parachuteFail) list.push({ type: "PARACHUTE COMMAND FAILED", level: "danger", source: "SYS" });
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    cansat.linkQuality,
    cansat.rssi,
    cansat.ina.busV,
    cansat.sht.temp,
    cansat.gnss.fix,
    cansat.faults.join("|"),
    cansat.lastPacketAt,
    parachuteFail,
    paused,
    now,
  ]);

  const [activeAlerts, setActiveAlerts] = useState<ActiveAlert[]>([]);
  const [alertHistory, setAlertHistory] = useState<AlertHistoryEntry[]>([]);
  const alertId = useRef(1);
  useEffect(() => {
    setActiveAlerts((prev) => {
      const key = (a: { type: string; source: string }) => `${a.type}|${a.source}`;
      const prevMap = new Map(prev.map((a) => [key(a), a]));
      const next: ActiveAlert[] = conditions.map((c) => {
        const existing = prevMap.get(key(c));
        return existing ? { ...existing, detail: c.detail } : { ...c, since: stamp() };
      });
      const nextKeys = new Set(next.map(key));
      const added = next.filter((a) => !prevMap.has(key(a)));
      const removed = prev.filter((a) => !nextKeys.has(key(a)));
      if (added.length || removed.length) {
        setAlertHistory((h) =>
          [
            ...h,
            ...added.map((a) => ({ id: alertId.current++, type: a.type, source: a.source, time: stamp(), action: "RAISED" as const })),
            ...removed.map((a) => ({ id: alertId.current++, type: a.type, source: a.source, time: stamp(), action: "CLEARED" as const })),
          ].slice(-60),
        );
      }
      return added.length || removed.length ? next : prev;
    });
  }, [conditions]);

  // ---- Header data -------------------------------------------------------
  const events: MissionEvent[] = useMemo(
    () => cansat.events.map((e) => ({ label: e.label, time: `T+${e.t.toFixed(0)}s` })).slice(-30),
    [cansat.events],
  );

  const missionPhase = useMemo(() => {
    switch (cansat.landing) {
      case "IDLE":
        return "PRE-SEPARATION";
      case "L0":
        return "PARACHUTE DESCENT";
      case "L1":
      case "L2":
        return "ARMS DEPLOY";
      case "L9":
        return "PASSIVE SAFE DESCENT";
      case "L10":
        return cansat.state === "MISSION_COMPLETE" ? "MISSION COMPLETE" : "LANDED · RECOVERY";
      default:
        return `CONTROLLED DESCENT · ${cansat.landingName}`;
    }
  }, [cansat.landing, cansat.landingName, cansat.state]);

  const systemStatus: SystemStatus = activeAlerts.some((a) => a.level === "danger")
    ? "CRITICAL"
    : activeAlerts.length > 0
      ? "DEGRADED"
      : "NOMINAL";

  const alert = useMemo(() => {
    const danger = activeAlerts.find((a) => a.level === "danger");
    if (danger) return { level: "danger" as const, message: `${danger.type} · ${danger.source}` };
    const warn = activeAlerts[0];
    if (warn) return { level: "warn" as const, message: `${warn.type} · ${warn.source}` };
    if (cansat.state === "MISSION_COMPLETE") return { level: "info" as const, message: "MISSION COMPLETE" };
    return { level: "info" as const, message: "SIMULATION MODE · TELEMETRY NOMINAL" };
  }, [activeAlerts, cansat.state]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header
        cansatRf={{ rssi: cansat.rssi, snr: cansat.snr, quality: cansat.linkQuality }}
        missionId={MISSION_ID}
        launchSite={SITE_NAME}
        alert={alert}
        events={events}
        missionPhase={missionPhase}
        systemStatus={systemStatus}
      />

      <main className="flex-1 p-4 flex flex-col gap-4 max-w-[1800px] w-full mx-auto">
        <StateTimeline
          states={CANSAT_STATES.filter((s) => s !== "BOOT")}
          current={cansat.state}
          accent="var(--cansat)"
        />

        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_380px] gap-4 items-start">
          <TrajectoryMap f={cansat} />
          <ParameterBox f={cansat} />
        </div>

        {/* tab strip + playback */}
        <div className="flex items-center justify-between gap-3 flex-wrap border-b border-border">
          <div className="flex gap-1 overflow-x-auto scroll-thin">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className="px-4 py-2.5 label-mono text-[10.5px] whitespace-nowrap border-b-2 -mb-px transition-colors"
                style={{
                  borderColor: tab === t.id ? "var(--cansat)" : "transparent",
                  color: tab === t.id ? "oklch(0.97 0 0)" : undefined,
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5 pb-1.5">
            <span className="label-mono text-[9px] mr-1 opacity-70">SIMULATED · PLAYBACK</span>
            {(["1x", "5x", "10x"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                className="panel px-2.5 py-1 label-mono text-[10px] hover:bg-[oklch(0.25_0.045_255)]"
                style={{
                  borderColor: speed === s ? "var(--cansat)" : undefined,
                  color: speed === s ? "var(--cansat)" : undefined,
                }}
              >
                {s}
              </button>
            ))}
            <button
              onClick={() => setPaused((p) => !p)}
              className="panel px-2.5 py-1 label-mono text-[10px] flex items-center gap-1 hover:bg-[oklch(0.25_0.045_255)]"
              style={{ color: paused ? "var(--warn)" : undefined }}
            >
              {paused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
              {paused ? "Resume" : "Pause"}
            </button>
            <button
              onClick={restart}
              className="panel px-2.5 py-1 label-mono text-[10px] flex items-center gap-1 hover:bg-[oklch(0.25_0.045_255)]"
            >
              <RotateCcw className="h-3 w-3" /> Restart
            </button>
          </div>
        </div>

        {tab === "graphs" ? <FlightGraphs f={cansat} /> : null}
        {tab === "sensors" ? <SensorsPanel f={cansat} /> : null}
        {tab === "landing" ? <LandingPanel f={cansat} /> : null}
        {tab === "health" ? <HealthLinkPanel f={cansat} /> : null}
        {tab === "commands" ? (
          <CommandsPanel f={cansat} onCommand={onCommand} onSetTarget={onSetTarget} />
        ) : null}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <AlertsPanel active={activeAlerts} history={alertHistory} />
          <CommandConsole entries={entries} />
        </div>
      </main>

      <footer className="border-t border-border px-5 py-2 flex items-center justify-between text-xs">
        <span className="label-mono text-[10px]">Ground Station v1.1 · Simulated Telemetry</span>
        <span className="label-mono text-[10px]">© CanSat Team 2026</span>
      </footer>
    </div>
  );
}
