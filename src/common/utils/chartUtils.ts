export const generateMockCandlestickData = (seed: number, days: number) => {
  return Array.from({ length: days }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - i);

    // Seeded random math for consistent patterns
    const base = (seed % 300) + 200 + Math.sin(i + seed) * 12;
    return {
      x: date.getTime(),
      y: [
        parseFloat(base.toFixed(2)),
        parseFloat((base + 5).toFixed(2)),
        parseFloat((base - 3).toFixed(2)),
        parseFloat((base + 2).toFixed(2)),
      ],
    };
  }).reverse();
};
