"use client";

import ThemeToggle from "@/components/ThemeToggle";

export default function SettingsSheet({ open, onClose }) {
  if (!open) return null;

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

        {/* Future settings sections go here, same pattern as above */}

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
