"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ThemeToggle from "@/components/ThemeToggle";
import { createClient } from "@/lib/supabase/client";

export default function SettingsSheet({ open, onClose }) {
  const router = useRouter();
  const supabase = createClient();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  const handleDelete = async () => {
    setDeleting(true);
    setError("");
    const { error } = await supabase.rpc("delete_user_account");
    if (error) {
      setError("Something went wrong. Please try again.");
      setDeleting(false);
      return;
    }
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-paper rounded-t-2xl border-t border-hairline px-5 pt-4 pb-8 max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-hairline rounded-full mx-auto mb-4" />
        <h2 className="font-display text-lg mb-5">Settings</h2>

        <div className="mb-6">
          <div className="text-[11px] font-mono text-inksoft uppercase tracking-wide mb-2">
            Appearance
          </div>
          <ThemeToggle />
        </div>

        <div className="mb-6">
          <div className="text-[11px] font-mono text-inksoft uppercase tracking-wide mb-2">
            Account
          </div>

          {!confirming ? (
            <button
              onClick={() => setConfirming(true)}
              className="w-full text-left text-sm text-amber font-semibold py-2"
            >
              Delete account
            </button>
          ) : (
            <div className="border border-amber rounded-lg p-3 space-y-3">
              <p className="text-sm text-ink">
                This permanently deletes your account, posts, and messages. This can&apos;t be undone.
              </p>
              {error && <div className="text-amber text-xs">{error}</div>}
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirming(false)}
                  disabled={deleting}
                  className="flex-1 border border-hairline rounded-lg py-2 text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 bg-amber text-white rounded-lg py-2 text-sm font-semibold disabled:opacity-50"
                >
                  {deleting ? "Deleting..." : "Yes, delete"}
                </button>
              </div>
            </div>
          )}
        </div>

        <button
          onClick={onClose}
          className="mt-4 w-full text-center text-sm text-inksoft font-mono py-2"
        >
          Close
        </button>
      </div>
    </div>
  );
}
