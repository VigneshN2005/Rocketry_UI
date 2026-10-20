import { useCallback, useEffect, useRef, useState } from "react";
import { useTelemetry, type PlaybackSpeed } from "../telemetry";
import { GroundLink, type CmdStageCb, type LinkFormat } from "./groundLink";
import { RAK_RX, asciiToHex, hexToAscii } from "./protocol";
import { openSerial, serialSupported, type OpenSerial } from "./serialPort";
import { VirtualCansat } from "./virtualCansat";

export type SourceMode = "sim" | "loopback" | "serial" | "replay";
export type LinkStatus = "idle" | "connecting" | "connected" | "error";
const SPEED: Record<PlaybackSpeed, number> = { "1x": 1, "5x": 5, "10x": 10 };
const TICK = 0.2;

function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * One hook for every telemetry source. The screens only ever see `cansat`
 * (a CansatFrame); where it comes from is decided here:
 *   sim      built-in simulator (default, no hardware)
 *   loopback virtual CanSat speaking the real protocol through the real decoder
 *   serial   a real ground receiver on a USB serial port (Web Serial)
 *   replay   a recorded log file played back
 */
export function useGroundLink(speed: PlaybackSpeed, paused: boolean) {
  const [mode, setModeState] = useState<SourceMode>("sim");
  const [status, setStatus] = useState<LinkStatus>("connected");
  const [error, setError] = useState<string | null>(null);
  const [baud, setBaud] = useState(115200);
  const [format, setFormatState] = useState<LinkFormat>("raw");
  const [label, setLabel] = useState("built-in simulator");

  const sim = useTelemetry(speed, paused || mode !== "sim");

  const linkRef = useRef<GroundLink | null>(null);
  if (linkRef.current === null) linkRef.current = new GroundLink();
  const link = linkRef.current;

  const [liveFrame, setLiveFrame] = useState(() => link.builder.frame(Date.now()));
  const [, setTick] = useState(0);

  const speedRef = useRef(speed);
  const pausedRef = useRef(paused);
  const formatRef = useRef(format);
  speedRef.current = speed;
  pausedRef.current = paused;
  formatRef.current = format;
  link.format = format;

  const serialRef = useRef<OpenSerial | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const virtualRef = useRef<VirtualCansat | null>(null);
  const replayRef = useRef<{ lines: string[]; idx: number; budget: number } | null>(null);

  // refresh the frame when packets arrive (throttled) and every 500 ms for link ageing
  useEffect(() => {
    let dirty = false;
    const unsub = link.subscribe(() => {
      if (dirty) return;
      dirty = true;
      setTimeout(() => {
        dirty = false;
        setLiveFrame(link.builder.frame(Date.now()));
        setTick((t) => t + 1);
      }, 120);
    });
    const id = setInterval(() => {
      if (mode !== "sim") setLiveFrame(link.builder.frame(Date.now()));
    }, 500);
    return () => {
      unsub();
      clearInterval(id);
    };
  }, [link, mode]);

  const stopAll = useCallback(async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    virtualRef.current = null;
    replayRef.current = null;
    link.setTransport(null);
    const s = serialRef.current;
    serialRef.current = null;
    if (s) await s.close();
  }, [link]);

  useEffect(
    () => () => {
      void stopAll();
    },
    [stopAll],
  );

  const setMode = useCallback(
    async (m: SourceMode) => {
      await stopAll();
      setError(null);
      setModeState(m);
      if (m === "sim") {
        setStatus("connected");
        setLabel("built-in simulator");
      } else {
        link.reset();
        setLiveFrame(link.builder.frame(Date.now()));
        setStatus("idle");
        setLabel("");
      }
    },
    [link, stopAll],
  );

  const wrap = (line: string) =>
    formatRef.current === "rak"
      ? `+EVT:RXP2P:${(-72 + Math.random() * 6).toFixed(0)}:${(8 + Math.random() * 3).toFixed(1)}:${asciiToHex(line)}`
      : line;

  const startLoopback = useCallback(async () => {
    await stopAll();
    link.reset();
    const v = new VirtualCansat(Math.floor(Math.random() * 900) + 1);
    virtualRef.current = v;
    link.setTransport({
      async write(text: string) {
        const t = text.trim();
        if (t.startsWith("AT+PSEND=")) setTimeout(() => link.feedText("+EVT:TXP2P DONE\r\n"), 40);
        const packet = t.startsWith("AT+PSEND=") ? hexToAscii(t.slice(9)) : t.startsWith("AT+") ? null : t;
        if (!packet) return;
        const r = v.handle(packet);
        if (!r) return;
        setTimeout(() => link.feedLine(wrap(r.ack)), 250);
        if (r.exe) setTimeout(() => link.feedLine(wrap(r.exe!.line)), 250 + r.exe.delayMs);
      },
    });
    timerRef.current = setInterval(() => {
      if (pausedRef.current) return;
      for (const l of v.step(TICK * SPEED[speedRef.current])) link.feedLine(wrap(l));
    }, TICK * 1000);
    setStatus("connected");
    setLabel("virtual CanSat (loopback)");
    link.info("loopback started: virtual CanSat → decoder");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [link, stopAll]);

  const connectSerial = useCallback(async () => {
    if (!serialSupported()) {
      setStatus("error");
      setError("Web Serial is not available. Use Chrome or Edge on localhost or https.");
      return;
    }
    setStatus("connecting");
    setError(null);
    try {
      await stopAll();
      link.reset();
      const port = await openSerial(
        baud,
        (text) => link.feedText(text),
        (err) => {
          link.setTransport(null);
          serialRef.current = null;
          setStatus("error");
          setError(err ? `Port closed: ${err}` : "Port closed");
          link.info(`port closed${err ? `: ${err}` : ""}`);
        },
      );
      serialRef.current = port;
      link.setTransport({ write: port.write });
      setLabel(port.label);
      setStatus("connected");
      link.info(`connected: ${port.label}`);
      if (formatRef.current === "rak") await port.write(RAK_RX + "\r\n"); // start continuous receive
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setStatus(msg.includes("No port selected") ? "idle" : "error");
      setError(msg.includes("No port selected") ? null : msg);
    }
  }, [baud, link, stopAll]);

  const loadReplay = useCallback(
    async (text: string, name: string) => {
      await stopAll();
      link.reset();
      const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      replayRef.current = { lines, idx: 0, budget: 0 };
      timerRef.current = setInterval(() => {
        const r = replayRef.current;
        if (!r || pausedRef.current) return;
        r.budget += TICK * SPEED[speedRef.current];
        while (r.idx < r.lines.length) {
          const line = r.lines[r.idx];
          const isPacket = !line.startsWith("$");
          if (isPacket && r.budget < 1) break;
          if (isPacket) r.budget -= 1;
          link.feedLine(line.replace(/^\d{4}-\d\d-\d\dT[\d:.]+Z\s+/, "")); // accept our own logs (UTC stamp prefix) too
          r.idx++;
        }
        if (r.idx >= r.lines.length) {
          link.info("replay finished");
          if (timerRef.current) clearInterval(timerRef.current);
          timerRef.current = null;
        }
      }, TICK * 1000);
      setStatus("connected");
      setLabel(`replay · ${name} · ${lines.length} lines`);
    },
    [link, stopAll],
  );

  const disconnect = useCallback(async () => {
    await stopAll();
    setStatus("idle");
    setLabel("");
    link.info("disconnected");
  }, [link, stopAll]);

  const restart = useCallback(() => {
    if (mode === "sim") sim.restart();
    else {
      link.reset();
      if (mode === "loopback") void startLoopback();
      else if (mode === "replay" && replayRef.current) replayRef.current.idx = 0;
      setLiveFrame(link.builder.frame(Date.now()));
    }
  }, [link, mode, sim, startLoopback]);

  const sendCommand = useCallback((cmd: string, cb: CmdStageCb) => link.sendCommand(cmd, cb), [link]);

  return {
    mode,
    setMode,
    status,
    error,
    label,
    baud,
    setBaud,
    format,
    setFormat: setFormatState,
    live: mode !== "sim",
    cansat: mode === "sim" ? sim.cansat : liveFrame,
    sim,
    restart,
    startLoopback,
    connectSerial,
    loadReplay,
    disconnect,
    sendCommand,
    log: link.log,
    stats: link.builder.stats(),
    fields: link.builder.snapshotFields(),
    serialSupported: serialSupported(),
    downloadCsv: () => download(`Flight_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.csv`, link.builder.csv()),
    downloadRawLog: () => download(`raw_link_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.log`, link.rawLog.join("\n") + "\n"),
  };
}
