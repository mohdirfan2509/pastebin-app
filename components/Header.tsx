import Link from "next/link";

export default function Header() {
  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          className="text-lg font-semibold tracking-tight text-zinc-900"
        >
          Pastebin
        </Link>
        <nav>
          <Link
            href="/"
            className="text-sm text-zinc-600 transition-colors hover:text-zinc-900"
          >
            New paste
          </Link>
        </nav>
      </div>
    </header>
  );
}
