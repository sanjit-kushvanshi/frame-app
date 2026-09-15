"use client";

import { useEffect, useRef, useState } from "react";

export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  pendingLabel,
  pending = false,
  destructive = false,
}) {
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(false);
  const raf2Ref = useRef(null);

  useEffect(() => {
    if (open) {
      setMounted(true);
      const raf1 = requestAnimationFrame(() => {
        raf2Ref.current = requestAnimationFrame(() => setVisible(true));
      });
      return () => {
        cancelAnimationFrame(raf1);
        if (raf2Ref.current) cancelAnimationFrame(raf2Ref.current);
      };
    } else {
      setVisible(false);
      const t = setTimeout(() => setMounted(false), 160);
      return () => clearTimeout(t);
    }
  }, [open]);

  if (!mounted) return null;

  return (
    <div
      className={`fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-6 transition-opacity duration-150 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-xs bg-paper rounded-2xl overflow-hidden transition-transform duration-150 ease-out motion-reduce:transition-none ${
          visible ? "scale-100" : "scale-95"
        }`}
      >
        <div className="px-4 pt-4 pb-3 text-center">
          <div className="text-[14px] font-semibold">{title}</div>
          {description && <div className="text-[12.5px] text-inksoft pt-1">{description}</div>}
        </div>
        <div className="flex border-t border-hairline">
          <button onClick={onClose} className="flex-1 py-3 text-[14px] border-r border-hairline">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={pending}
            className={`flex-1 py-3 text-[14px] font-semibold disabled:opacity-50 ${
              destructive ? "text-red-500" : "text-amber"
            }`}
          >
            {pending ? pendingLabel || "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
