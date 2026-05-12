import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import AdminNav from "./AdminNav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  const role = session.user?.role;
  if (role !== "ADMIN") {
    redirect("/login?next=/admin");
  }

  return (
    <div className="min-h-screen grid md:grid-cols-[240px_1fr]">
      {/* Sidebar */}
      <aside className="hidden md:block border-r border-white/10 bg-black/30">
        <div className="p-4 text-lg font-bold">Administration</div>
        <AdminNav />
      </aside>

      {/* Mobile top nav */}
      <div className="md:hidden">
        <AdminNav />
      </div>

      {/* Content */}
      <main className="p-4 md:p-6">
        {children}
      </main>
    </div>
  );
}
