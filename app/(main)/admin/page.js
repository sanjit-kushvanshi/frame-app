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

  // User search state
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [suspensionReason, setSuspensionReason] = useState("");
  const [userActionLoading, setUserActionLoading] = useState(false);
  const [userActionMsg, setUserActionMsg] = useState("");

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

  const handleUserSearch = async (e) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;
    setSearching(true);
    setSelectedUser(null);
    setUserActionMsg("");

    const { data, error: searchError } = await supabase
      .from("profiles")
      .select("id, username, is_admin, suspension_status, suspension_reason")
      .ilike("username", `%${searchTerm.trim()}%`)
      .limit(10);

    if (searchError) {
      setError(searchError.message);
      setSearching(false);
      return;
    }

    setSearchResults(data || []);
    setSearching(false);
  };

  const selectUser = (u) => {
    setSelectedUser(u);
    setSuspensionReason(u.suspension_reason || "");
    setUserActionMsg("");
  };

  const applySuspension = async (status) => {
    if (!selectedUser) return;
    setUserActionLoading(true);
    setUserActionMsg("");

    const { data: { user } } = await supabase.auth.getUser();

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        suspension_status: status,
        suspension_reason: status === "none" ? null : suspensionReason,
        suspended_by: status === "none" ? null : user.id,
        suspended_at: status === "none" ? null : new Date().toISOString(),
      })
      .eq("id", selectedUser.id);

    setUserActionLoading(false);

    if (updateError) {
      setUserActionMsg(`Error: ${updateError.message}`);
      return;
    }

    setUserActionMsg(`Status updated to "${status}".`);
    setSelectedUser({ ...selectedUser, suspension_status: status });
    setSearchResults((prev) =>
      prev.map((u) => (u.id === selectedUser.id ? { ...u, suspension_status: status } : u))
    );
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

      {error && <div className="text-amber text-xs mb-3">{error}</div>}

      {/* ---------- Reports ---------- */}
      <div className="text-[11px] font-mono text-inksoft uppercase tracking-wide mb-3">
        Reports {loadingReports ? "" : `(${reports.filter((r) => r.status === "open").length} open)`}
      </div>

      {loadingReports ? (
        <div className="text-sm text-inksoft mb-6">Loading...</div>
      ) : reports.length === 0 ? (
        <div className="text-sm text-inksoft mb-6">No reports yet.</div>
      ) : (
        <div className="space-y-3 mb-8">
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

      {/* ---------- Users ---------- */}
      <div className="text-[11px] font-mono text-inksoft uppercase tracking-wide mb-3">
        Users
      </div>

      <form onSubmit={handleUserSearch} className="flex gap-2 mb-3">
        <input
          type="text"
          placeholder="Search username..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 border border-hairline rounded-lg px-3 py-2 text-sm bg-white outline-none"
        />
        <button
          type="submit"
          disabled={searching}
          className="bg-ink text-white rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50"
        >
          {searching ? "..." : "Search"}
        </button>
      </form>

      {searchResults.length > 0 && !selectedUser && (
        <div className="space-y-2 mb-4">
          {searchResults.map((u) => (
            <button
              key={u.id}
              onClick={() => selectUser(u)}
              className="w-full text-left border border-hairline rounded-lg p-3 flex justify-between items-center"
            >
              <div>
                <span className="text-sm font-semibold">@{u.username}</span>
                {u.is_admin && <span className="ml-2 text-[10px] font-mono text-amber">ADMIN</span>}
              </div>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                  u.suspension_status === "none"
                    ? "bg-hairline text-inksoft"
                    : u.suspension_status === "restricted"
                    ? "bg-amber/15 text-amber"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {u.suspension_status}
              </span>
            </button>
          ))}
        </div>
      )}

      {selectedUser && (
        <div className="border border-hairline rounded-lg p-4 mb-6">
          <div className="flex justify-between items-center mb-3">
            <div className="text-sm font-semibold">@{selectedUser.username}</div>
            <button
              onClick={() => setSelectedUser(null)}
              className="text-xs text-inksoft font-mono"
            >
              Close
            </button>
          </div>

          <div className="text-xs text-inksoft mb-2">
            Current status: <span className="font-semibold">{selectedUser.suspension_status}</span>
          </div>

          <textarea
            placeholder="Reason (shown to user if suspended)"
            value={suspensionReason}
            onChange={(e) => setSuspensionReason(e.target.value)}
            rows={2}
            className="w-full border border-hairline rounded-lg px-3 py-2 text-sm bg-white outline-none resize-none mb-3"
          />

          <div className="grid grid-cols-3 gap-2 mb-2">
            <button
              onClick={() => applySuspension("none")}
              disabled={userActionLoading}
              className="border border-hairline rounded-lg py-2 text-xs font-semibold disabled:opacity-50"
            >
              Clear
            </button>
            <button
              onClick={() => applySuspension("restricted")}
              disabled={userActionLoading}
              className="bg-amber text-white rounded-lg py-2 text-xs font-semibold disabled:opacity-50"
            >
              Restrict
            </button>
            <button
              onClick={() => applySuspension("suspended")}
              disabled={userActionLoading}
              className="bg-red-600 text-white rounded-lg py-2 text-xs font-semibold disabled:opacity-50"
            >
              Suspend
            </button>
          </div>

          {userActionMsg && <div className="text-xs text-inksoft">{userActionMsg}</div>}
        </div>
      )}
    </div>
  );
}
