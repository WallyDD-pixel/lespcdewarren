"use client";
import { useState } from "react";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Tags,
  Store,
  Banknote,
  Package,
  ShoppingCart,
  MessageSquare,
  Star,
  FolderTree,
  Menu,
  X,
  Settings,
  Gift,
} from "lucide-react";

const sections: Array<{ title?: string; items: Array<{ href: string; label: string; Icon: any }> }> = [
  { items: [ { href: "/admin", label: "Dashboard", Icon: LayoutDashboard } ] },
  {
    title: "Marketplace",
    items: [
      { href: "/admin/marketplace-orders", label: "Cmd Marketplace", Icon: Store },
      { href: "/admin/withdrawals", label: "Retraits", Icon: Banknote },
      { href: "/admin/listings", label: "Annonces", Icon: Tags },
    ],
  },
  {
    title: "Boutique",
    items: [
  { href: "/admin/orders", label: "Cmd Boutique", Icon: ShoppingCart },
  { href: "/admin/contest", label: "Créer une commande", Icon: Banknote },
  { href: "/admin/contest/manage", label: "Concours", Icon: Gift },
      { href: "/admin/products", label: "Produits", Icon: Package },
      { href: "/admin/invoices", label: "Factures", Icon: FolderTree },
      { href: "/admin/categories", label: "Catégories", Icon: FolderTree },
    ],
  },
  {
    title: "Contenu",
    items: [
      { href: "/admin/testimonials", label: "Témoignages", Icon: MessageSquare },
      { href: "/admin/reviews", label: "Avis", Icon: Star },
      { href: "/admin/sliders", label: "Sliders", Icon: Tags },
    ],
  },
  {
    title: "Configuration",
    items: [
      { href: "/admin/users", label: "Utilisateurs", Icon: Users },
      { href: "/admin/settings", label: "Paramètres", Icon: Settings },
      { href: "/admin/email-test", label: "Test Email", Icon: MessageSquare },
    ],
  },
];

export default function AdminNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <div>
      <div className="md:hidden flex items-center justify-between p-3 border-b border-white/10">
        <div className="text-lg font-semibold">Admin</div>
        <button aria-label="Menu" onClick={() => setOpen((s) => !s)} className="btn-ghost p-2">
          {open ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      <nav className={`md:block ${open ? "block" : "hidden"} md:static p-3 md:p-4`}>
        {sections.map((sec, idx) => (
          <div key={idx} className="mb-3">
            {sec.title && <div className="px-3 pb-1 text-xs uppercase tracking-wider text-white/50">{sec.title}</div>}
            <ul className="space-y-1">
              {sec.items.map(({ href, label, Icon }) => {
                const active = pathname === href || pathname.startsWith(href + "/");
                return (
                  <li key={href}>
                    <a
                      href={href}
                      className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm border transition-colors ${
                        active
                          ? "bg-white/10 border-white/15 text-white"
                          : "bg-transparent border-transparent text-white/85 hover:bg-white/5 hover:border-white/10"
                      }`}
                      onClick={() => setOpen(false)}
                    >
                      <Icon size={16} />
                      <span>{label}</span>
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </div>
  );
}
