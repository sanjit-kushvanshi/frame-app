"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

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
    <div className="min-h-screen flex items-center justify-center px-6">
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
  );
}
