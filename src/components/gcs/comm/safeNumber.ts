/**
 * Live telemetry can have unknown values (NaN) when the CanSat does not send
 * something. Make every numeric formatter in the UI print an em dash for those
 * instead of "NaN". Applies to Number.prototype.toFixed only; finite numbers
 * are formatted exactly as before.
 */
const original = Number.prototype.toFixed;
if (!(original as unknown as { __safe?: boolean }).__safe) {
  const safe = function (this: number, digits?: number) {
    const v = Number(this);
    return Number.isFinite(v) ? original.call(v, digits) : "—";
  };
  (safe as unknown as { __safe: boolean }).__safe = true;
  Number.prototype.toFixed = safe;
}
export {};
