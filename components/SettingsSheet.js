"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ThemeToggle from "@/components/ThemeToggle";
import { createClient } from "@/lib/supabase/client";

export default function SettingsSheet({ open, onClose }) {
  const router = useRouter();
  const supabase = createClient();

  // Delete account state
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // Change password state
  const [changingPassword, setChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState(false);

  if (!open) return null;

  const handleDelete = async () => {
    setDeleting(true);
    setDeleteError("");
    const { error } = await supabase.rpc("delete_user_account");
    if (error) {
      setDeleteError("Something went wrong. Please try again.");
      setDeleting(false);
      return;
    }
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPwError("");
    setPwSuccess(false);

    if (newPassword.length < 6) {
      setPwError("New password must be at least 6 characters.");
      return;
    }

    setPwLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Re-verify current password before allowing the change
    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });

    if (verifyError) {
      setPwError("Current password is incorrect.");
      setPwLoading(false);
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    setPwLoading(false);

    if (updateError) {
      setPwError("Something went wrong. Please try again.");
      return;
    }

    setPwSuccess(true);
    setCurrentPassword("");
    setNewPassword("");
    setTimeout(() => {
      setChangingPassword(false);
      setPwSuccess(false);
    }, 1500);
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

          {!changingPassword ? (
            <button
              onClick={() => setChangingPassword(true)}
              className="w-full text-left text-sm text-ink py-2"
            >
              Change password
            </button>
          ) : (
            <form onSubmit={handlePasswordChange} className="space-y-2 border border-hairline rounded-lg p-3">
              <input
                type="password"
                required
                placeholder="Current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full border border-hairline rounded-lg px-3 py-2 text-sm bg-white outline-none"
              />
              <input
                type="password"
                required
                minLength={6}
                placeholder="New password (min 6 characters)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full border border-hairline rounded-lg px-3 py-2 text-sm bg-white outline-none"
              />
              {pwError && <div className="text-amber text-xs">{pwError}</div>}
              {pwSuccess && <div className="text-green-600 text-xs">Password updated.</div>}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setChangingPassword(false);
                    setCurrentPassword("");
                    setNewPassword("");
                    setPwError("");
                  }}
                  disabled={pwLoading}
                  className="flex-1 border border-hairline rounded-lg py-2 text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pwLoading}
                  className="flex-1 bg-ink text-white rounded-lg py-2 text-sm font-semibold disabled:opacity-50"
                >
                  {pwLoading ? "Updating..." : "Update"}
                </button>
              </div>
            </form>
          )}

          <div className="border-t border-hairline mt-4 pt-4">
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
                {deleteError && <div className="text-amber text-xs">{deleteError}</div>}
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
