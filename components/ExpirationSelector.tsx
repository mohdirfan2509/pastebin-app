"use client";

export type ExpirationOption = {
  label: string;
  value: string;
  ttl: number | null;
};

export const EXPIRATION_OPTIONS: ExpirationOption[] = [
  { label: "Never expire", value: "never", ttl: null },
  { label: "1 minute", value: "1m", ttl: 60 },
  { label: "10 minutes", value: "10m", ttl: 600 },
  { label: "1 hour", value: "1h", ttl: 3600 },
  { label: "1 day", value: "1d", ttl: 86400 },
  { label: "7 days", value: "7d", ttl: 604800 },
  { label: "Custom…", value: "custom", ttl: null },
];

type ExpirationSelectorProps = {
  selected: string;
  customSeconds: string;
  onSelectedChange: (value: string) => void;
  onCustomSecondsChange: (value: string) => void;
};

export default function ExpirationSelector({
  selected,
  customSeconds,
  onSelectedChange,
  onCustomSecondsChange,
}: ExpirationSelectorProps) {
  return (
    <div className="space-y-2">
      <label htmlFor="expiration" className="block text-sm font-medium text-zinc-700">
        Expiration
      </label>
      <select
        id="expiration"
        value={selected}
        onChange={(e) => onSelectedChange(e.target.value)}
        className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
      >
        {EXPIRATION_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {selected === "custom" && (
        <div>
          <label htmlFor="custom-ttl" className="sr-only">
            Custom TTL in seconds
          </label>
          <input
            id="custom-ttl"
            type="number"
            min={1}
            step={1}
            inputMode="numeric"
            placeholder="Seconds until expiration"
            value={customSeconds}
            onChange={(e) => onCustomSecondsChange(e.target.value)}
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
          />
        </div>
      )}
    </div>
  );
}

export function resolveTtl(
  selected: string,
  customSeconds: string
): { ttl?: number; error?: string } {
  if (selected === "never") return {};
  if (selected === "custom") {
    const parsed = Number(customSeconds);
    if (
      !customSeconds.trim() ||
      !Number.isInteger(parsed) ||
      parsed <= 0
    ) {
      return { error: "Custom expiration must be a positive integer (seconds)" };
    }
    return { ttl: parsed };
  }
  const option = EXPIRATION_OPTIONS.find((o) => o.value === selected);
  if (!option || option.ttl === null) return {};
  return { ttl: option.ttl };
}
