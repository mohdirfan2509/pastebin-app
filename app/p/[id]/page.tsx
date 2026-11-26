import Link from "next/link";
import { headers } from "next/headers";
import PasteViewer from "@/components/PasteViewer";
import { PasteNotFoundError, retrievePaste } from "@/lib/paste-service";
import { getNow, InvalidTestTimeError } from "@/lib/time";
import { pasteIdSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type PageProps = {
  params: Promise<{ id: string }>;
};

/**
 * Server Component: retrieves the paste once per request through the same
 * paste-service used by GET /api/pastes/:id. This guarantees atomic view-count
 * enforcement without client-side double-fetching (React Strict Mode).
 */
export default async function PastePage({ params }: PageProps) {
  const { id: rawId } = await params;

  const parsed = pasteIdSchema.safeParse(rawId);
  if (!parsed.success) {
    return <UnavailableState />;
  }

  try {
    const requestHeaders = await headers();
    const now = getNow(requestHeaders);
    const paste = await retrievePaste(parsed.data, now);
    return <PasteViewer paste={paste} />;
  } catch (error) {
    if (
      error instanceof PasteNotFoundError ||
      error instanceof InvalidTestTimeError
    ) {
      return <UnavailableState />;
    }
    console.error("Failed to load paste page:", error);
    return <UnavailableState message="Something went wrong while loading this paste." />;
  }
}

function UnavailableState({
  message = "This paste does not exist, has expired, or has reached its view limit.",
}: {
  message?: string;
}) {
  return (
    <div className="mx-auto max-w-lg space-y-4 py-16 text-center">
      <h1 className="text-2xl font-semibold text-zinc-900">Paste unavailable</h1>
      <p className="text-sm text-zinc-600">{message}</p>
      <Link
        href="/"
        className="inline-flex items-center justify-center rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
      >
        Create new paste
      </Link>
    </div>
  );
}
