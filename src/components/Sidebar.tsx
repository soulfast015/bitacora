"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  TicketCheck,
  LayoutDashboard,
  Users,
  BarChart3,
  KeyRound,
  LogOut,
  Menu,
  X,
  ClipboardList,
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";

const navItems = [
  { href: "/dashboard", label: "Panel", icon: LayoutDashboard, permission: null },
  { href: "/dashboard/tickets", label: "Tickets", icon: TicketCheck, permission: "ver_tickets" },
  { href: "/dashboard/mis-tickets", label: "Tickets Asignados", icon: ClipboardList, permission: null },
  { href: "/dashboard/usuarios", label: "Usuarios", icon: Users, permission: "ver_usuarios" },
  { href: "/dashboard/reportes", label: "Reportes", icon: BarChart3, permission: "ver_reportes" },
];

export default function Sidebar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [assignedCount, setAssignedCount] = useState(0);

  const fetchAssignedCount = useCallback(async () => {
    try {
      const res = await fetch("/api/tickets/assigned");
      if (res.ok) {
        const data = await res.json();
        setAssignedCount(data.count || 0);
      }
    } catch {
      // silently ignore
    }
  }, []);

  useEffect(() => {
    if (session) {
      fetchAssignedCount();
      const interval = setInterval(fetchAssignedCount, 10000);
      const handleRefresh = () => fetchAssignedCount();
      window.addEventListener("tickets-updated", handleRefresh);
      return () => {
        clearInterval(interval);
        window.removeEventListener("tickets-updated", handleRefresh);
      };
    }
  }, [session, fetchAssignedCount]);

  if (!session) return null;

  const permissions = session.user.permissions || [];

  const filteredNav = navItems.filter(
    (item) => item.permission === null || permissions.includes(item.permission)
  );

  const roleBadgeColor: Record<string, string> = {
    administrador: "bg-red-100 text-red-800 border-red-300",
    tecnico: "bg-blue-100 text-blue-800 border-blue-300",
    usuario: "bg-green-100 text-green-800 border-green-300",
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b-2 border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center shadow">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-primary font-display">Bitácora</h1>
            <p className="text-xs text-muted">Mesa de Servicio</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {filteredNav.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          const showBadge = item.href === "/dashboard/mis-tickets" && assignedCount > 0;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                isActive
                  ? "bg-primary text-white shadow-md"
                  : "text-foreground hover:bg-amber-100 hover:text-primary"
              }`}
            >
              <div className="relative">
                <item.icon className="w-5 h-5" />
                {showBadge && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center animate-pulse">
                    {assignedCount > 9 ? "9+" : assignedCount}
                  </span>
                )}
              </div>
              <span className="font-medium flex-1">{item.label}</span>
              {showBadge && (
                <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  {assignedCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t-2 border-border">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 bg-secondary rounded-full flex items-center justify-center text-white font-bold text-sm">
            {session.user.name?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{session.user.name}</p>
            <span className={`badge text-[10px] ${roleBadgeColor[session.user.role] || "bg-gray-100 text-gray-800 border-gray-300"}`}>
              {session.user.role}
            </span>
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Cerrar Sesión
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setOpen(!open)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-primary text-white rounded-lg shadow-lg"
      >
        {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Mobile overlay */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 bg-black/40 z-30"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static top-0 left-0 z-40 h-full w-64 bg-card-bg border-r-2 border-border shadow-lg transition-transform duration-300 ${
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
