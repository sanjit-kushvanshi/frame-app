"use client";

const PALETTE = ["#FF6B35", "#1C1A17", "#6B6459", "#9A6B4C", "#3D5A80", "#7A6C5D", "#8C5E58"];

function colorForUsername(username) {
  const str = username || "?";
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % PALETTE.length;
  return PALETTE[index];
}

export default function Avatar({ username, avatarUrl, size = 40, className = "", onClick }) {
  const initial = username?.[0]?.toUpperCase() || "?";
  const bg = colorForUsername(username);

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={username || ""}
        onClick={onClick}
        className={`rounded-full object-cover ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      onClick={onClick}
      className={`rounded-full flex items-center justify-center shrink-0 ${className}`}
      style={{ width: size, height: size, background: bg }}
    >
      <span
        style={{
          fontFamily: "Fraunces, Georgia, serif",
          fontStyle: "italic",
          fontWeight: 600,
          fontSize: size * 0.42,
          color: "#F7F4EE",
          lineHeight: 1,
        }}
      >
        {initial}
      </span>
    </div>
  );
}
