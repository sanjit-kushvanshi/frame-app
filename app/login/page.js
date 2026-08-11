"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

function InstallBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    const alreadyInstalled = window.matchMedia("(display-mode: standalone)").matches;
    const dismissed = localStorage.getItem("frame_install_banner_dismissed");
    if (isMobile && !alreadyInstalled && !dismissed) {
      setVisible(true);
    }
  }, []);

  const dismiss = () => {
    localStorage.setItem("frame_install_banner_dismissed", "1");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="w-full border-b border-hairline bg-paperdim px-4 py-2.5 flex items-center gap-3">
      <p className="flex-1 font-mono text-[11px] leading-snug text-inksoft">
        Install Frame to your home screen: tap the browser menu (⋮) and select <span className="text-ink font-semibold">&ldquo;Add to Home Screen&rdquo;</span>.
      </p>
      <button onClick={dismiss} aria-label="Dismiss" className="flex-shrink-0 text-inksoft p-1">
        <X size={14} strokeWidth={1.8} />
      </button>
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push("/");
    router.refresh();
  };

  return (
    <div className="min-h-screen flex flex-col">
      <InstallBanner />
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="font-display italic font-semibold text-3xl">Frame</div>
            <div className="font-mono text-xs text-inksoft mt-1">develop your log in</div>
          </div>
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="email"
              required
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-hairline rounded-lg px-4 py-3 text-sm bg-white outline-none"
            />
            <input
              type="password"
              required
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-hairline rounded-lg px-4 py-3 text-sm bg-white outline-none"
            />
            {error && <div className="text-amber text-xs">{error}</div>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-ink text-white rounded-lg py-3 text-sm font-semibold disabled:opacity-50"
            >
              {loading ? "Signing in..." : "Log in"}
            </button>
          </form>
          <div className="text-center mt-6 text-sm text-inksoft">
            New here?{" "}
            <Link href="/signup" className="text-amber font-semibold">
              Create an account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
