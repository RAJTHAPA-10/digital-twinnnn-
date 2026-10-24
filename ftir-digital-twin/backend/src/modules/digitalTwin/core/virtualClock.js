export class VirtualClock {
  constructor({ tickIntervalMs = 100, durationMs = 10000 } = {}) {
    if (!Number.isInteger(tickIntervalMs) || tickIntervalMs <= 0) {
      throw new Error("tickIntervalMs must be a positive integer.");
    }

    if (!Number.isInteger(durationMs) || durationMs < tickIntervalMs) {
      throw new Error("durationMs must be greater than or equal to tickIntervalMs.");
    }

    this.tickIntervalMs = tickIntervalMs;
    this.durationMs = durationMs;
    this.maxTicks = Math.ceil(durationMs / tickIntervalMs);
    this.reset();
  }

  reset() {
    this.tick = 0;
    this.timeMs = 0;
  }

  advance() {
    if (this.isComplete()) {
      return this.getSnapshot();
    }

    this.tick += 1;
    this.timeMs = Math.min(this.tick * this.tickIntervalMs, this.durationMs);

    return this.getSnapshot();
  }

  isComplete() {
    return this.timeMs >= this.durationMs;
  }

  getProgressPercentage() {
    return Number(((this.timeMs / this.durationMs) * 100).toFixed(2));
  }

  getSnapshot() {
    return {
      tick: this.tick,
      timeMs: this.timeMs,
      durationMs: this.durationMs,
      tickIntervalMs: this.tickIntervalMs,
      progressPercentage: this.getProgressPercentage(),
      isComplete: this.isComplete(),
    };
  }
}