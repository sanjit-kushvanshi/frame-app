"use client";
import { usePathname } from "next/navigation";
import TopBar from "@/components/TopBar";

export default function ConditionalTopBar({ currentUserId }) {
  const pathname = usePathname();

  // TopBar only shows on the main feed page.
  if (pathname !== "/") return null;

  return <TopBar currentUserId={currentUserId} />;
}
