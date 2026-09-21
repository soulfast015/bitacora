"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  TicketCheck,
  Eye,
  X,
  Hash,
  Copy,
  Check,
  CheckCircle2,
} from "lucide-react";

interface User {
  id: string;
  name: string;
  email: string;
}

interface Ticket {
  id: string;
  ticketNumber: number;
  title: string;
  applicativo: string;
  solucion: string;
  localidad: string;
  usuarioAfectado: string;
  status: string;
  priority: string;
  assignedTo: string | null;
  assignee: User | null;
  recibidoPor: string | null;
  receiver: User | null;
  creator: User | null;
  createdAt: string;
  updatedAt: string;
}

export default function MisTicketsPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailTicket, setDetailTicket] = useState<Ticket | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchMyTickets = useCallback(async () => {
    const res = await fetch("/api/tickets");
    const data = await res.json();
    if (Array.isArray(data) && session?.user?.id) {
      setTickets(data.filter((t: Ticket) => t.assignedTo === session.user.id));
    }
    setLoading(false);
  }, [session]);

  useEffect(() => {
    if (authStatus === "unauthenticated") router.push("/login");
  }, [authStatus, router]);

  useEffect(() => {
    if (session) {
      fetchMyTickets();
      const handleRefresh = () => fetchMyTickets();
      window.addEventListener("tickets-updated", handleRefresh);
      return () => window.removeEventListener("tickets-updated", handleRefresh);
    }
  }, [session, fetchMyTickets]);

  const formatTicketNum = (n: number) => `TK-${String(n).padStart(5, "0")}`;

  const copyTicketNumber = (num: number) => {
    navigator.clipboard.writeText(formatTicketNum(num));
    setCopiedId(String(num));
    setTimeout(() => setCopiedId(null), 2000);
  };

  const updateTicketStatus = async (ticketId: string, newStatus: string) => {
    await fetch(`/api/tickets/${ticketId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    fetchMyTickets();
    window.dispatchEvent(new Event("tickets-updated"));
  };

  const activeTickets = tickets.filter((t) => t.status !== "resuelto");
  const completedTickets = tickets.filter((t) => t.status === "resuelto");

  if (authStatus === "loading" || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-primary text-lg">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-primary flex items-center gap-3">
          <TicketCheck className="w-8 h-8" />
          Mis Tickets Asignados
        </h1>
        <p className="text-muted mt-1">
          {activeTickets.length} activo{activeTickets.length !== 1 ? "s" : ""} · {completedTickets.length} resuelto{completedTickets.length !== 1 ? "s" : ""}
        </p>
      </div>

      {activeTickets.length === 0 && completedTickets.length === 0 ? (
        <div className="card text-center py-16">
          <TicketCheck className="w-12 h-12 text-muted mx-auto mb-3" />
          <p className="text-lg font-semibold text-muted">No tienes tickets asignados</p>
        </div>
      ) : (
        <>
          {activeTickets.length > 0 && (
            <div className="card">
              <h2 className="text-lg font-bold text-primary mb-4">Tickets Activos</h2>
              <div className="space-y-3">
                {activeTickets.map((ticket) => (
                  <TicketCard
                    key={ticket.id}
                    ticket={ticket}
                    formatTicketNum={formatTicketNum}
                    copyTicketNumber={copyTicketNumber}
                    copiedId={copiedId}
                    onDetail={setDetailTicket}
                    onStatusChange={updateTicketStatus}
                  />
                ))}
              </div>
            </div>
          )}

          {completedTickets.length > 0 && (
            <div className="card">
              <h2 className="text-lg font-bold text-muted mb-4">Resueltos</h2>
              <div className="space-y-3 opacity-70">
                {completedTickets.map((ticket) => (
                  <TicketCard
                    key={ticket.id}
                    ticket={ticket}
                    formatTicketNum={formatTicketNum}
                    copyTicketNumber={copyTicketNumber}
                    copiedId={copiedId}
                    onDetail={setDetailTicket}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal Detalle */}
      {detailTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDetailTicket(null)} />
          <div className="relative bg-card-bg rounded-xl border-2 border-border shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b-2 border-border">
              <div>
                <p className="text-sm text-muted">Ticket</p>
                <h2 className="text-xl font-bold text-primary font-mono">
                  {formatTicketNum(detailTicket.ticketNumber)}
                </h2>
              </div>
              <button onClick={() => setDetailTicket(null)} className="text-muted hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <DetailRow label="Título" value={detailTicket.title} />
              <DetailRow label="Aplicativo" value={detailTicket.applicativo} />
              <DetailRow label="Localidad" value={detailTicket.localidad} />
              <DetailRow label="Usuario Afectado" value={detailTicket.usuarioAfectado} />
              <DetailRow label="Técnico Asignado" value={detailTicket.assignee?.name || "Sin asignar"} />
              <DetailRow label="Recibido Por" value={detailTicket.receiver?.name || "No especificado"} />
              <DetailRow label="Solución" value={detailTicket.solucion || "Pendiente"} />
              <div className="flex gap-4">
                <div className="flex-1">
                  <p className="text-xs text-muted mb-1">Estado</p>
                  <StatusBadge status={detailTicket.status} />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-muted mb-1">Prioridad</p>
                  <PriorityBadge priority={detailTicket.priority} />
                </div>
              </div>
              <div className="vintage-divider" />
              <div className="flex justify-between text-xs text-muted">
                <span>Creado: {new Date(detailTicket.createdAt).toLocaleString("es-MX")}</span>
                <span>Actualizado: {new Date(detailTicket.updatedAt).toLocaleString("es-MX")}</span>
              </div>
              <button onClick={() => setDetailTicket(null)} className="btn-secondary w-full">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TicketCard({
  ticket,
  formatTicketNum,
  copyTicketNumber,
  copiedId,
  onDetail,
  onStatusChange,
}: {
  ticket: Ticket;
  formatTicketNum: (n: number) => string;
  copyTicketNumber: (n: number) => void;
  copiedId: string | null;
  onDetail: (t: Ticket) => void;
  onStatusChange?: (ticketId: string, newStatus: string) => void;
}) {
  return (
    <div className="flex items-center justify-between p-4 rounded-lg border-2 border-border bg-amber-50/30 hover:bg-amber-50/60 transition-colors">
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <Hash className="w-3.5 h-3.5 text-muted" />
          <span className="font-mono font-bold text-primary text-sm">{formatTicketNum(ticket.ticketNumber)}</span>
          <button
            onClick={() => copyTicketNumber(ticket.ticketNumber)}
            className="p-1 hover:bg-amber-100 rounded transition-colors text-muted"
          >
            {copiedId === String(ticket.ticketNumber) ? (
              <Check className="w-3 h-3 text-green-600" />
            ) : (
              <Copy className="w-3 h-3" />
            )}
          </button>
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold truncate">{ticket.title}</p>
          <p className="text-xs text-muted">{ticket.applicativo} · {ticket.localidad} · {ticket.usuarioAfectado}</p>
        </div>
        <StatusBadge status={ticket.status} />
        <PriorityBadge priority={ticket.priority} />
        <span className="text-xs text-muted hidden md:block">
          {new Date(ticket.createdAt).toLocaleString("es-MX", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>
      <div className="flex items-center gap-1 ml-3">
        {onStatusChange && ticket.status !== "resuelto" && (
          <button
            onClick={() => onStatusChange(ticket.id, "resuelto")}
            className="p-2 hover:bg-green-100 rounded-lg transition-colors text-green-600"
            title="Marcar como Resuelto"
          >
            <CheckCircle2 className="w-4 h-4" />
          </button>
        )}
        <button
          onClick={() => onDetail(ticket)}
          className="p-2 hover:bg-blue-100 rounded-lg transition-colors text-blue-600"
          title="Ver detalle"
        >
          <Eye className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted mb-0.5">{label}</p>
      <p className="font-medium">{value}</p>
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
