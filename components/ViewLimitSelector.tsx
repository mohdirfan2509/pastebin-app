"use client";

export type ViewLimitOption = {
  label: string;
  value: string;
  maxViews: number | null;
};

export const VIEW_LIMIT_OPTIONS: ViewLimitOption[] = [
  { label: "No view limit", value: "none", maxViews: null },
  { label: "1 view", value: "1", maxViews: 1 },
  { label: "5 views", value: "5", maxViews: 5 },
  { label: "10 views", value: "10", maxViews: 10 },
  { label: "50 views", value: "50", maxViews: 50 },
  { label: "Custom…", value: "custom", maxViews: null },
];

type ViewLimitSelectorProps = {
  selected: string;
  customViews: string;
  onSelectedChange: (value: string) => void;
  onCustomViewsChange: (value: string) => void;
};

export default function ViewLimitSelector({
  selected,
  customViews,
  onSelectedChange,
  onCustomViewsChange,
}: ViewLimitSelectorProps) {
  return (
    <div className="space-y-2">
      <label htmlFor="view-limit" className="block text-sm font-medium text-zinc-700">
        Maximum views
      </label>
      <select
        id="view-limit"
        value={selected}
        onChange={(e) => onSelectedChange(e.target.value)}
        className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
      >
        {VIEW_LIMIT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {selected === "custom" && (
        <div>
          <label htmlFor="custom-views" className="sr-only">
            Custom maximum views
          </label>
          <input
            id="custom-views"
            type="number"
            min={1}
            step={1}
            inputMode="numeric"
            placeholder="Positive integer"
            value={customViews}
            onChange={(e) => onCustomViewsChange(e.target.value)}
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
          />
        </div>
      )}
    </div>
  );
}

export function resolveMaxViews(
  selected: string,
  customViews: string
): { max_views?: number; error?: string } {
  if (selected === "none") return {};
  if (selected === "custom") {
    const parsed = Number(customViews);
    if (!customViews.trim() || !Number.isInteger(parsed) || parsed <= 0) {
      return { error: "Custom max views must be a positive integer" };
    }
    return { max_views: parsed };
  }
  const option = VIEW_LIMIT_OPTIONS.find((o) => o.value === selected);
  if (!option || option.maxViews === null) return {};
  return { max_views: option.maxViews };
}
