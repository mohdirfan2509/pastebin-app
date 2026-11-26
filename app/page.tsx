import PasteEditor from "@/components/PasteEditor";

export default function HomePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
          Create a paste
        </h1>
        <p className="mt-1 text-sm text-zinc-600">
          Store text, get a shareable link, and optionally limit lifetime or views.
        </p>
      </div>
      <PasteEditor />
    </div>
  );
}
