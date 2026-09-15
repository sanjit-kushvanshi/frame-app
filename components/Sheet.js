"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

export default function Sheet({ open, onClose, title, children, maxHeight = "72%" }) {
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
      const t = setTimeout(() => setMounted(false), 220);
      return () => clearTimeout(t);
    }
  }, [open]);

  if (!mounted) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-end bg-[rgba(28,26,23,0.5)] transition-opacity duration-200 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`bg-paper w-full rounded-t-2xl flex flex-col transition-transform duration-[220ms] ease-out motion-reduce:transition-none ${
          visible ? "translate-y-0" : "translate-y-full"
        }`}
        style={{ maxHeight }}
      >
        <div className="flex justify-center pt-2.5 pb-1 flex-shrink-0">
          <div className="w-9 h-1 rounded-full bg-hairline" />
        </div>

        {title && (
          <div className="flex justify-between items-center px-4 pb-3 pt-1.5 border-b border-hairline flex-shrink-0">
            <span className="font-semibold text-sm">{title}</span>
            <button onClick={onClose} aria-label="Close" className="text-ink p-1 -m-1">
              <X size={20} strokeWidth={1.6} />
            </button>
          </div>
        )}

        {children}
      </div>
    </div>
  );
}
