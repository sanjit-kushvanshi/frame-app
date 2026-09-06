"use client";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

export default function SuspendedPage() {
  const params = useSearchParams();
  const reason = params.get("reason");

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
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
        <p className="text-xs text-inksoft mb-6">
          If you think this is a mistake, contact support.
        </p>
        <Link href="/login" className="text-amber font-semibold text-sm">
          Back to login
        </Link>
      </div>
    </div>
  );
}
