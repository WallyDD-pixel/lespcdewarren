"use client";
import React from "react";
import { usePathname } from "next/navigation";

export default function ConditionalFooter({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isMessages = pathname?.startsWith("/messages");
  if (isMessages) return null; // Masque le footer sur toutes les pages messagerie
  return <>{children}</>;
}
