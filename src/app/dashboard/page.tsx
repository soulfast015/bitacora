"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  TicketCheck,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Users,
  TrendingUp,
} from "lucide-react";

interface TicketData {
  id: string;
  ticketNumber: number;
  title: string;
  applicativo: string;
  status: string;
  priority: string;
  createdAt: string;
  assignee: { name: string } | null;
  creator: { name: string } | null;
  usuarioAfectado: string;
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [tickets, setTickets] = useState<TicketData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (session) {
      fetch("/api/tickets")
        .then((r) => r.json())
        .then((data) => {
          setTickets(Array.isArray(data) ? data : []);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [session]);

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-primary text-lg">Cargando...</div>
      </div>
    );
  }

  const proceso = tickets.filter((t) => t.status === "proceso").length;
  const pendiente = tickets.filter((t) => t.status === "pendiente").length;
  const resuelto = tickets.filter((t) => t.status === "resuelto").length;
  const highPriority = tickets.filter((t) => t.priority === "alta" || t.priority === "urgente").length;

  const stats = [
    { label: "Total Tickets", value: tickets.length, icon: TicketCheck, color: "bg-amber-100 text-amber-800 border-amber-300" },
    { label: "En Proceso", value: proceso, icon: Clock, color: "bg-blue-100 text-blue-800 border-blue-300" },
    { label: "Pendientes", value: pendiente, icon: TrendingUp, color: "bg-yellow-100 text-yellow-800 border-yellow-300" },
    { label: "Resueltos", value: resuelto, icon: CheckCircle2, color: "bg-green-100 text-green-800 border-green-300" },
    { label: "Alta Prioridad", value: highPriority, icon: AlertTriangle, color: "bg-red-100 text-red-800 border-red-300" },
  ];

  const recentTickets = tickets.slice(0, 5);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-primary">
          Bienvenido, {session?.user.name}
        </h1>
        <p className="text-muted mt-1">
          Panel de control de la mesa de servicio
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className={`card flex items-center gap-4 ${stat.color} !border`}>
            <div className="p-3 rounded-full bg-white/60">
              <stat.icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-sm opacity-80">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-primary">Tickets Recientes</h2>
          <button
            onClick={() => router.push("/dashboard/tickets")}
            className="btn-secondary text-sm"
          >
            Ver Todos
          </button>
        </div>

        {recentTickets.length === 0 ? (
          <p className="text-muted text-center py-8">No hay tickets aún</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-border text-left">
                  <th className="pb-3 font-semibold"># Ticket</th>
                  <th className="pb-3 font-semibold">Título</th>
                  <th className="pb-3 font-semibold">Estado</th>
                  <th className="pb-3 font-semibold hidden sm:table-cell">Técnico</th>
                  <th className="pb-3 font-semibold hidden md:table-cell">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {recentTickets.map((ticket) => (
                  <tr key={ticket.id} className="hover:bg-amber-50/50">
                    <td className="py-3 font-mono font-bold text-primary text-sm">TK-{String(ticket.ticketNumber).padStart(5, "0")}</td>
                    <td className="py-3 font-medium">{ticket.title}</td>
                    <td className="py-3">
                      <StatusBadge status={ticket.status} />
                    </td>
                    <td className="py-3 hidden sm:table-cell text-muted">
                      {ticket.assignee?.name || "Sin asignar"}
                    </td>
                    <td className="py-3 hidden md:table-cell text-muted">
                      {new Date(ticket.createdAt).toLocaleDateString("es-MX")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    proceso: "bg-blue-100 text-blue-700 border-blue-300",
    pendiente: "bg-yellow-100 text-yellow-700 border-yellow-300",
    resuelto: "bg-green-100 text-green-700 border-green-300",
  };
  const labels: Record<string, string> = {
    proceso: "En Proceso",
    pendiente: "Pendiente",
    resuelto: "Resuelto",
  };
  return (
    <span className={`badge ${colors[status] || "bg-gray-100 text-gray-700 border-gray-300"}`}>
      {labels[status] || status}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const colors: Record<string, string> = {
    baja: "bg-green-100 text-green-700 border-green-300",
    media: "bg-yellow-100 text-yellow-700 border-yellow-300",
    alta: "bg-orange-100 text-orange-700 border-orange-300",
    urgente: "bg-red-100 text-red-700 border-red-300",
  };
  return (
    <span className={`badge ${colors[priority] || "bg-gray-100 text-gray-700 border-gray-300"}`}>
      {priority.charAt(0).toUpperCase() + priority.slice(1)}
    </span>
  );
}
