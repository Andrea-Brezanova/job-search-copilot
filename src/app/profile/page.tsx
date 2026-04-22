// This file repurposes the old profile route so it fits the current MVP.
import Link from "next/link";

export default function ProfilePage() {
  return (
    <main className="mx-auto min-h-screen max-w-3xl px-6 py-16">
      <div className="rounded-2xl border border-stone-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-stone-900">Profile Route</h1>
        <p className="mt-3 text-sm leading-6 text-stone-600">
          Resume input and upload now happen directly on the main workspace so users
          can generate application packages faster.
        </p>
        <Link
          href="/"
          className="mt-4 inline-flex text-sm font-medium text-brand-700 underline-offset-4 hover:underline"
        >
          Go to workspace
        </Link>
      </div>
    </main>
  );
}
