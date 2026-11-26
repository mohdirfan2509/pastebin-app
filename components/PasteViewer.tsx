import Link from "next/link";
import CopyButton from "@/components/CopyButton";

export type PasteViewData = {
  id: string;
  content: string;
  created_at: string;
  expires_at: string | null;
  views: number;
  max_views: number | null;
  remaining_views: number | null;
};

type PasteViewerProps = {
  paste: PasteViewData;
};

function formatDate(value: string): string {
  return new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function PasteViewer({ paste }: PasteViewerProps) {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Paste</h1>
          <p className="mt-1 font-mono text-sm text-zinc-500">{paste.id}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <CopyButton value={paste.content} label="Copy content" />
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-800 transition-colors hover:bg-zinc-50"
          >
            Create new paste
          </Link>
        </div>
      </div>

      <dl className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-zinc-600">
        <div>
          <dt className="inline text-zinc-500">Created: </dt>
          <dd className="inline">{formatDate(paste.created_at)}</dd>
        </div>
        {paste.expires_at && (
          <div>
            <dt className="inline text-zinc-500">Expires: </dt>
            <dd className="inline">{formatDate(paste.expires_at)}</dd>
          </div>
        )}
        {paste.max_views !== null && (
          <div>
            <dt className="inline text-zinc-500">Views: </dt>
            <dd className="inline">
              {paste.views} / {paste.max_views}
              {paste.remaining_views !== null
                ? ` (${paste.remaining_views} remaining)`
                : ""}
            </dd>
          </div>
        )}
        {paste.max_views === null && (
          <div>
            <dt className="inline text-zinc-500">Views: </dt>
            <dd className="inline">{paste.views}</dd>
          </div>
        )}
      </dl>

      <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-md border border-zinc-200 bg-zinc-50 p-4 font-mono text-sm leading-relaxed text-zinc-900">
        {paste.content}
      </pre>
    </div>
  );
}
