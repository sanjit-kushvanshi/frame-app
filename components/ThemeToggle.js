"use client";

import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [theme, setTheme] = useState("light");

  useEffect(() => {
    const saved = localStorage.getItem("frame-theme");
    const current = document.documentElement.getAttribute("data-theme") || "light";
    setTheme(saved || current);
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

  const options = [
    { key: "light", label: "Light" },
    { key: "dark", label: "Dark" },
    { key: "system", label: "System" },
  ];

  return (
    <div className="flex gap-1 rounded-full border border-hairline p-1 bg-paperdim w-fit">
      {options.map((opt) => (
        <button
          key={opt.key}
          onClick={() => applyTheme(opt.key)}
          className={`px-3 py-1 rounded-full text-xs font-mono transition ${
            theme === opt.key
              ? "bg-amber text-paper"
              : "text-inksoft"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
