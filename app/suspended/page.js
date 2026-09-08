"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Mail } from "lucide-react";

function SuspendedInner() {
  const params = useSearchParams();
  const reason = params.get("reason");

  return (
    <div className="w-full max-w-sm text-center">
      <div className="font-display italic font-semibold text-2xl mb-4">Account suspended</div>
      <p className="text-sm text-inksoft mb-3">
        Your account has been suspended and you&apos;ve been signed out.
      </p>
      {reason && (
        <p className="text-sm text-ink mb-6 border border-hairline rounded-lg p-3">
          Reason: {reason}
        </p>
      )}
      <p className="text-xs text-inksoft mb-3">
        If you think this is a mistake, contact support:
      </p>
      <a
        href="mailto:frameapp29@gmail.com?subject=Account%20suspension%20appeal"
        className="inline-flex items-center gap-1.5 text-amber font-semibold text-sm mb-6"
      >
        <Mail size={16} strokeWidth={1.8} />
        frameapp29@gmail.com
      </a>
      <div>
        <Link href="/login" className="text-ink font-semibold text-sm underline">
          Back to login
        </Link>
      </div>
    </div>
  );
}

export default function SuspendedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <Suspense fallback={<div className="text-sm text-inksoft">Loading...</div>}>
        <SuspendedInner />
      </Suspense>
    </div>
  );
}
