export function createTimingCollector() {
  const stages = [];

  return {
    async measure(name, handler) {
      const startedAt = new Date();
      const start = process.hrtime.bigint();
      const value = await handler();
      const end = process.hrtime.bigint();
      stages.push({
        name,
        started_at: startedAt.toISOString(),
        duration_ms: Number(end - start) / 1_000_000,
      });
      return value;
    },
    latest(name) {
      for (let index = stages.length - 1; index >= 0; index -= 1) {
        if (stages[index].name === name) {
          return stages[index];
        }
      }
      return null;
    },
    finish() {
      const totalDurationMs = stages.reduce((sum, stage) => sum + stage.duration_ms, 0);
      return {
        stages,
        total_duration_ms: totalDurationMs,
      };
    },
  };
}
