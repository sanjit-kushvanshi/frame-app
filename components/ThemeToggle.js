"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";

const ACCENTS = [
  { key: "amber", color: "#FF6B35", label: "Original amber" },
  { key: "rose", color: "#FF4D6A", label: "Rose" },
  { key: "mint", color: "#2FAE66", label: "Mint" },
  { key: "sky", color: "#22ADD1", label: "Sky" },
  { key: "blue", color: "#3B7DDD", label: "Blue" },
  { key: "violet", color: "#8B5CF6", label: "Violet" },
  { key: "lavender", color: "#A78BDE", label: "Lavender" },
  { key: "mocha", color: "#8B5E3C", label: "Mocha" },
];

export default function ThemeToggle() {
  const [theme, setTheme] = useState("light");
  const [accent, setAccent] = useState("amber");

  useEffect(() => {
    const savedTheme = localStorage.getItem("frame-theme");
    const currentTheme = document.documentElement.getAttribute("data-theme") || "light";
    setTheme(savedTheme || currentTheme);

    const savedAccent = localStorage.getItem("frame-accent");
    setAccent(savedAccent || "amber");
  }, []);

  function applyTheme(next) {
    setTheme(next);
    if (next === "system") {
      localStorage.removeItem("frame-theme");
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      document.documentElement.setAttribute("data-theme", prefersDark ? "dark" : "light");
    } else {
      localStorage.setItem("frame-theme", next);
      document.documentElement.setAttribute("data-theme", next);
    }
  }

  function applyAccent(key) {
    setAccent(key);
    if (key === "amber") {
      localStorage.removeItem("frame-accent");
      document.documentElement.removeAttribute("data-accent");
    } else {
      localStorage.setItem("frame-accent", key);
      document.documentElement.setAttribute("data-accent", key);
    }
  }

  const options = [
    { key: "light", label: "Light" },
    { key: "dark", label: "Dark" },
    { key: "system", label: "System" },
  ];

  return (
    <div className="space-y-3">
      <div className="flex gap-1 rounded-full border border-hairline p-1 bg-paperdim w-fit">
        {options.map((opt) => (
          <button
            key={opt.key}
            onClick={() => applyTheme(opt.key)}
            className={`px-3 py-1 rounded-full text-xs font-mono transition ${
              theme === opt.key ? "bg-amber text-paper" : "text-inksoft"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2.5">
        {ACCENTS.map((a) => (
          <button
            key={a.key}
            onClick={() => applyAccent(a.key)}
            aria-label={a.label}
            className="relative w-7 h-7 rounded-full flex items-center justify-center transition-transform duration-150 active:scale-90"
            style={{ background: a.color }}
          >
            {accent === a.key && <Check size={14} color="#fff" strokeWidth={2.5} />}
          </button>
        ))}
      </div>
    </div>
  );
}
