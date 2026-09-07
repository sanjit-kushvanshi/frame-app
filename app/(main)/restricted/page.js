"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, AlertTriangle, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function RestrictedPage() {
  const supabase = createClient();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("none");
  const [reason, setReason] = useState("");

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      const { data, error } = await supabase
        .from("profiles")
        .select("suspension_status, suspension_reason")
        .eq("id", user.id)
        .single();

      if (!error && data) {
        setStatus(data.suspension_status || "none");
        setReason(data.suspension_reason || "");
      }
      setLoading(false);
    };
    load();
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-sm text-inksoft">Loading...</div>;
  }

  return (
    <div className="px-5 pt-4 pb-8">
      <div className="flex items-center gap-2 mb-6">
        <Link href="/" className="p-1 -ml-1">
          <ChevronLeft size={22} strokeWidth={1.8} />
        </Link>
        <h1 className="font-display text-lg">Account status</h1>
      </div>

      {status === "restricted" ? (
        <>
          <div className="flex items-center gap-2.5 mb-4">
            <AlertTriangle size={22} className="text-amber flex-shrink-0" strokeWidth={1.8} />
            <div className="font-display text-lg">Your account is restricted</div>
          </div>

          {reason && (
            <div className="border border-hairline rounded-lg p-3 mb-5">
              <div className="text-[11px] font-mono text-inksoft uppercase tracking-wide mb-1">Reason</div>
              <div className="text-sm text-ink">{reason}</div>
            </div>
          )}

          <div className="text-[11px] font-mono text-inksoft uppercase tracking-wide mb-2">
            While restricted, you can't
          </div>
          <ul className="space-y-2 mb-6">
            <li className="text-sm text-ink flex items-start gap-2">
              <span className="text-amber">·</span> Create new posts
            </li>
            <li className="text-sm text-ink flex items-start gap-2">
              <span className="text-amber">·</span> Comment on posts
            </li>
            <li className="text-sm text-ink flex items-start gap-2">
              <span className="text-amber">·</span> Send direct messages
            </li>
          </ul>

          <p className="text-xs text-inksoft mb-6">
            You can still browse Frame, like posts, and view your profile. If you think this is a mistake, use
            "Report a problem" in Settings to reach us.
          </p>
        </>
      ) : (
        <div className="text-center py-10">
          <CheckCircle2 size={32} className="text-green-600 mx-auto mb-3" strokeWidth={1.6} />
          <div className="text-sm text-ink font-semibold mb-1">No active restrictions</div>
          <div className="text-xs text-inksoft">Your account is in good standing.</div>
        </div>
      )}

      <Link href="/" className="block text-center text-amber font-semibold text-sm">
        Back to Frame
      </Link>
    </div>
  );
}
