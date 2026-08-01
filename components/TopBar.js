"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Send, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function TopBar() {
  const supabase = createClient();
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <div className="sticky top-0 z-20 bg-paper border-b border-hairline">
      <div className="flex items-center justify-between px-4 pt-3.5 pb-2.5">
        <button onClick={handleLogout} aria-label="Log out" className="text-ink p-1">
          <LogOut size={18} strokeWidth={1.6} />
        </button>
        <div className="font-display italic font-semibold text-2xl">Frame</div>
        <Link href="/messages" aria-label="Messages" className="text-ink p-1">
          <Send size={20} strokeWidth={1.6} />
        </Link>
      </div>
      <div className="flex justify-between px-2.5 pb-1.5">
        {Array.from({ length: 18 }).map((_, i) => (
          <div key={i} className="w-[5px] h-[5px] rounded-sm bg-hairline" />
        ))}
      </div>
    </div>
  );
}
