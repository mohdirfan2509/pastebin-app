"use client";

import { useMemo, useState } from "react";
import CopyButton from "@/components/CopyButton";
import ExpirationSelector, {
  resolveTtl,
} from "@/components/ExpirationSelector";
import ViewLimitSelector, {
  resolveMaxViews,
} from "@/components/ViewLimitSelector";
import { MAX_CONTENT_LENGTH } from "@/lib/validation";

type CreateResponse = {
  id: string;
  url: string;
  expires_at: string | null;
  max_views: number | null;
};

type ErrorResponse = {
  error?: string;
};

export default function PasteEditor() {
  const [content, setContent] = useState("");
  const [expiration, setExpiration] = useState("never");
  const [customSeconds, setCustomSeconds] = useState("");
  const [viewLimit, setViewLimit] = useState("none");
  const [customViews, setCustomViews] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CreateResponse | null>(null);

  const characterCount = content.length;
  const overLimit = characterCount > MAX_CONTENT_LENGTH;

  const canSubmit = useMemo(() => {
    return content.trim().length > 0 && !overLimit && !loading;
  }, [content, overLimit, loading]);

  function resetForm() {
    setContent("");
    setExpiration("never");
    setCustomSeconds("");
    setViewLimit("none");
    setCustomViews("");
    setError(null);
    setResult(null);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setResult(null);

    if (content.trim().length === 0) {
      setError("Content must not be empty or whitespace-only");
      return;
    }

    if (overLimit) {
      setError(`Content must be at most ${MAX_CONTENT_LENGTH.toLocaleString()} characters`);
      return;
    }

    const ttlResult = resolveTtl(expiration, customSeconds);
    if (ttlResult.error) {
      setError(ttlResult.error);
      return;
    }

    const viewsResult = resolveMaxViews(viewLimit, customViews);
    if (viewsResult.error) {
      setError(viewsResult.error);
      return;
    }

    const payload: {
      content: string;
      ttl?: number;
      max_views?: number;
    } = { content };

    if (ttlResult.ttl !== undefined) payload.ttl = ttlResult.ttl;
    if (viewsResult.max_views !== undefined) {
      payload.max_views = viewsResult.max_views;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/pastes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as CreateResponse & ErrorResponse;

      if (!response.ok) {
        setError(data.error || "Failed to create paste");
        return;
      }

      setResult(data);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <div className="flex items-end justify-between gap-3">
            <label htmlFor="content" className="text-sm font-medium text-zinc-700">
              Content
            </label>
            <span
              className={`text-xs tabular-nums ${
                overLimit ? "text-red-600" : "text-zinc-500"
              }`}
            >
              {characterCount.toLocaleString()} / {MAX_CONTENT_LENGTH.toLocaleString()}
            </span>
          </div>
          <textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={16}
            spellCheck={false}
            placeholder="Paste your text here…"
            className="w-full resize-y rounded-md border border-zinc-300 bg-white px-3 py-3 font-mono text-sm leading-relaxed text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <ExpirationSelector
            selected={expiration}
            customSeconds={customSeconds}
            onSelectedChange={setExpiration}
            onCustomSecondsChange={setCustomSeconds}
          />
          <ViewLimitSelector
            selected={viewLimit}
            customViews={customViews}
            onSelectedChange={setViewLimit}
            onCustomViewsChange={setCustomViews}
          />
        </div>

        {error && (
          <div
            role="alert"
            className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={!canSubmit}
            className="inline-flex items-center justify-center rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Creating…" : "Create Paste"}
          </button>
          <button
            type="button"
            onClick={resetForm}
            className="inline-flex items-center justify-center rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
          >
            Clear
          </button>
        </div>
      </form>

      {result && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-4 space-y-3">
          <p className="text-sm font-medium text-emerald-900">
            Paste created successfully
          </p>
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-emerald-800">
              Shareable link
            </p>
            <p className="break-all font-mono text-sm text-emerald-950">
              {result.url}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <CopyButton value={result.url} label="Copy link" />
            <a
              href={result.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-800 transition-colors hover:bg-zinc-50"
            >
              Open paste
            </a>
          </div>
          <dl className="grid gap-1 text-xs text-emerald-900 sm:grid-cols-2">
            <div>
              <dt className="inline text-emerald-700">ID: </dt>
              <dd className="inline font-mono">{result.id}</dd>
            </div>
            <div>
              <dt className="inline text-emerald-700">Expires: </dt>
              <dd className="inline">
                {result.expires_at
                  ? new Date(result.expires_at).toLocaleString()
                  : "Never"}
              </dd>
            </div>
            <div>
              <dt className="inline text-emerald-700">Max views: </dt>
              <dd className="inline">
                {result.max_views === null ? "Unlimited" : result.max_views}
              </dd>
            </div>
          </dl>
        </div>
      )}
    </div>
  );
}
