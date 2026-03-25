export type ForecastPoint = {
  x: string;
  y: number;
  is_predicted?: boolean;
};

const dateISO = (offsetDays: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
};

export const generateFakeForecast = (
  symbol: string,
  days: number,
  predictedShare = 0.3,
): ForecastPoint[] => {
  const total = Math.max(6, days);
  const predictedCount = Math.max(2, Math.round(total * predictedShare));
  const actualCount = total - predictedCount;

  const seedOffset = symbol
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0) % 25;
  let value = 90 + seedOffset + Math.random() * 25;

  const actual: ForecastPoint[] = Array.from({ length: actualCount }, (_, idx) => {
    value += (Math.random() - 0.4) * 5;
    return {
      x: dateISO(idx - (actualCount - 1)),
      y: Number(value.toFixed(2)),
      is_predicted: false,
    };
  });

  const predicted: ForecastPoint[] = Array.from(
    { length: predictedCount },
    (_, idx) => {
      value += (Math.random() - 0.3) * 6;
      return {
        x: dateISO(idx + 1),
        y: Number(value.toFixed(2)),
        is_predicted: true,
      };
    },
  );

  return [...actual, ...predicted];
};

export const generateFakeApiPayload = (
  symbol: string,
  days: number,
): { name: string; data: ForecastPoint[] }[] => [
  { name: symbol, data: generateFakeForecast(symbol, days) },
];
