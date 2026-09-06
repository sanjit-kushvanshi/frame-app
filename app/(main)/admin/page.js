"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function AdminPage() {
  const supabase = createClient();
  const router = useRouter();

  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [reports, setReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .single();

      if (profileError || !profile?.is_admin) {
        router.push("/");
        return;
      }

      setIsAdmin(true);
      setChecking(false);
      loadReports();
    };
    init();
  }, []);

  const loadReports = async () => {
    setLoadingReports(true);
    setError("");

    const { data, error: reportsError } = await supabase
      .from("reports")
      .select("*")
      .order("created_at", { ascending: false });

    if (reportsError) {
      setError(reportsError.message);
      setLoadingReports(false);
      return;
    }

    // Fetch reporter usernames separately (no direct FK join)
    const reporterIds = [...new Set(data.map((r) => r.reporter_id).filter(Boolean))];
    let profileMap = {};
    if (reporterIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username")
        .in("id", reporterIds);
      profileMap = Object.fromEntries((profiles || []).map((p) => [p.id, p.username]));
    }

    setReports(
      data.map((r) => ({ ...r, reporterUsername: profileMap[r.reporter_id] || "unknown" }))
    );
    setLoadingReports(false);
  };

  const updateStatus = async (reportId, status) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { error: updateError } = await supabase
      .from("reports")
      .update({ status, reviewed_at: new Date().toISOString(), reviewed_by: user.id })
      .eq("id", reportId);

    if (updateError) {
      setError(updateError.message);
      return;
    }
    loadReports();
  };

  if (checking) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-inksoft">Checking access...</div>;
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen px-5 pt-4 pb-8">
      <div className="flex items-center gap-2 mb-6">
        <Link href="/" className="p-1 -ml-1">
          <ChevronLeft size={22} strokeWidth={1.8} />
        </Link>
        <h1 className="font-display text-lg">Admin</h1>
      </div>

      <div className="text-[11px] font-mono text-inksoft uppercase tracking-wide mb-3">
        Reports {loadingReports ? "" : `(${reports.filter((r) => r.status === "open").length} open)`}
      </div>

      {error && <div className="text-amber text-xs mb-3">{error}</div>}

      {loadingReports ? (
        <div className="text-sm text-inksoft">Loading...</div>
      ) : reports.length === 0 ? (
        <div className="text-sm text-inksoft">No reports yet.</div>
      ) : (
        <div className="space-y-3">
          {reports.map((r) => (
            <div key={r.id} className="border border-hairline rounded-lg p-3">
              <div className="flex justify-between items-start mb-1">
                <div className="text-[11px] font-mono text-inksoft">
                  {r.target_type} · {new Date(r.created_at).toLocaleString()}
                </div>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                    r.status === "open"
                      ? "bg-amber/15 text-amber"
                      : r.status === "reviewed"
                      ? "bg-green-100 text-green-700"
                      : "bg-hairline text-inksoft"
                  }`}
                >
                  {r.status}
                </span>
              </div>
              <div className="text-sm text-ink mb-1">
                Reported by <span className="font-semibold">@{r.reporterUsername}</span>
              </div>
              {r.reason && <div className="text-sm text-inksoft mb-2">{r.reason}</div>}
              {r.status === "open" && (
                <div className="flex gap-2">
                  <button
                    onClick={() => updateStatus(r.id, "reviewed")}
                    className="flex-1 bg-ink text-white rounded-lg py-1.5 text-xs font-semibold"
                  >
                    Mark reviewed
                  </button>
                  <button
                    onClick={() => updateStatus(r.id, "dismissed")}
                    className="flex-1 border border-hairline rounded-lg py-1.5 text-xs"
                  >
                    Dismiss
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
