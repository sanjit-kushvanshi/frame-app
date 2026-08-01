import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import TopBar from "@/components/TopBar";
import BottomNav from "@/components/BottomNav";

export default async function MainLayout({ children }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .single();

  return (
    <div className="min-h-screen flex justify-center">
      <div className="w-full max-w-[480px] min-h-screen flex flex-col shadow-[0_0_40px_rgba(0,0,0,0.06)]">
        <TopBar />
        <div className="flex-1">{children}</div>
        <BottomNav myUsername={profile?.username} />
      </div>
    </div>
  );
}
