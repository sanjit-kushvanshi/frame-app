"use client";
import { useState } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function ReportPage() {
  const supabase = createClient();
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    let username = "unknown";
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", user.id)
        .single();
      if (profile?.username) username = profile.username;
    }

    const { data, error: fnError } = await supabase.functions.invoke("report-problem", {
      body: {
        message,
        userEmail: user?.email || "unknown",
        username,
      },
    });

    setLoading(false);

    if (fnError || data?.error) {
      setError("Something went wrong. Please try again.");
      return;
    }

    setSent(true);
  };

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="w-full max-w-sm text-center">
          <div className="font-display italic font-semibold text-2xl mb-4">Thank you</div>
          <p className="text-sm text-inksoft mb-6">
            Your report has been sent. We&apos;ll take a look as soon as we can.
          </p>
          <Link href="/" className="text-amber font-semibold text-sm">
            Back to Frame
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-5 pt-4 pb-8">
      <div className="flex items-center gap-2 mb-6">
        <Link href="/" className="p-1 -ml-1">
          <ChevronLeft size={22} strokeWidth={1.8} />
        </Link>
        <h1 className="font-display text-lg">Report a problem</h1>
      </div>

      <p className="text-sm text-inksoft mb-4">
        Tell us what went wrong. Be as specific as you can — screenshots aren&apos;t needed, just describe it.
      </p>

      <form onSubmit={handleSubmit} className="space-y-3">
        <textarea
          required
          rows={6}
          placeholder="Describe the problem..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full border border-hairline rounded-lg px-4 py-3 text-sm bg-white outline-none resize-none"
        />
        {error && <div className="text-amber text-xs">{error}</div>}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-ink text-white rounded-lg py-3 text-sm font-semibold disabled:opacity-50"
        >
          {loading ? "Sending..." : "Submit report"}
        </button>
      </form>
    </div>
  );
}
