"use client";

import { useState } from "react";
import SettingsSheet from "@/components/SettingsSheet";

export default function ProfileSettingsMenu() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Settings"
        className="p-2 -mr-2"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="4" y1="6" x2="20" y2="6" />
          <line x1="4" y1="12" x2="20" y2="12" />
          <line x1="4" y1="18" x2="20" y2="18" />
        </svg>
      </button>
      <SettingsSheet open={open} onClose={() => setOpen(false)} />
    </>
  );
}
