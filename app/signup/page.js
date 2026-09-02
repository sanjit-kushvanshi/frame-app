"use client";
import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const supabase = createClient();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9._]/g, "");
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username: cleanUsername || undefined } },
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setSent(true);
  };

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="w-full max-w-sm text-center">
          <div className="font-display italic font-semibold text-3xl mb-4">Frame</div>
          <p className="text-sm text-ink mb-2">Check your email</p>
          <p className="text-sm text-inksoft">
            We sent a confirmation link to <span className="text-ink font-semibold">{email}</span>. Tap it to activate your account, then come back and log in.
          </p>
          <Link href="/login" className="text-amber font-semibold text-sm mt-6 inline-block">
            Back to log in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="font-display italic font-semibold text-3xl">Frame</div>
          <div className="font-mono text-xs text-inksoft mt-1">load a new roll</div>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text"
            required
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full border border-hairline rounded-lg px-4 py-3 text-sm bg-white outline-none"
          />
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
            minLength={6}
            placeholder="Password (min 6 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-hairline rounded-lg px-4 py-3 text-sm bg-white outline-none"
          />
          {error && <div className="text-amber text-xs">{error}</div>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-amber text-white rounded-lg py-3 text-sm font-semibold disabled:opacity-50"
          >
            {loading ? "Creating account..." : "Sign up"}
          </button>
        </form>
        <div className="text-center mt-6 text-sm text-inksoft">
          Already have an account?{" "}
          <Link href="/login" className="text-amber font-semibold">
            Log in
          </Link>
        </div>
      </div>
    </div>
  );
}
