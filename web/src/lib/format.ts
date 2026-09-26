/** Display formatting. Kept in one place so every surface agrees. */

const compact = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

/** $150M, $3.8M, $600K, $0. */
export function formatUsd(value: number): string {
  if (value === 0) return "$0";
  return `$${compact.format(value)}`;
}

/** "150 million dollars" — for screen readers, where "$150M" reads badly. */
export function spokenUsd(value: number): string {
  if (value >= 1e9) return `${+(value / 1e9).toFixed(1)} billion dollars`;
  if (value >= 1e6) return `${+(value / 1e6).toFixed(1)} million dollars`;
  if (value >= 1e3) return `${+(value / 1e3).toFixed(1)} thousand dollars`;
  return `${value} dollars`;
}

/** "Winter 2021" -> "W21". */
export function shortBatch(batch: string): string {
  const match = batch.match(/^(Winter|Summer|Spring|Fall)\s+(\d{4})$/i);
  if (!match) return batch;
  return `${match[1]![0]!.toUpperCase()}${match[2]!.slice(2)}`;
}

/** "2022-09-28" or "2022-09" -> "Sep 2022". */
export function formatRoundDate(date: string | null): string | null {
  if (!date) return null;
  const match = date.match(/^(\d{4})(?:-(\d{2}))?/);
  if (!match) return date;
  if (!match[2]) return match[1]!;
  const month = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, 1));
  return month.toLocaleString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
}

/** "San Francisco, CA, USA" -> "San Francisco". */
export function city(location: string): string {
  return location.split(",")[0]!.trim();
}

export function pluralise(count: number, one: string, many = `${one}s`): string {
  return `${count} ${count === 1 ? one : many}`;
}
