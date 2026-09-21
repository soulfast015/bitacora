"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Search,
  Edit3,
  Trash2,
  X,
  Filter,
  TicketCheck,
  Hash,
  Copy,
  Check,
  Eye,
  Clock,
  MessageSquare,
  Send,
  AlertTriangle,
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
  slaHours: number;
  resolvedAt: string | null;
  assignedTo: string | null;
  assignee: User | null;
  recibidoPor: string | null;
  receiver: User | null;
  creator: User | null;
  createdAt: string;
  updatedAt: string;
}

interface Comment {
  id: string;
  content: string;
  author: User;
  createdAt: string;
}

const emptyForm = {
  title: "",
  applicativo: "",
  solucion: "",
  localidad: "",
  usuarioAfectado: "",
  priority: "media",
  assignedTo: "",
  recibidoPor: "",
  status: "proceso",
};

export default function TicketsPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailTicket, setDetailTicket] = useState<Ticket | null>(null);
  const [editingTicket, setEditingTicket] = useState<Ticket | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("todos");
  const [filterPriority, setFilterPriority] = useState("todos");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [createdTicketNumber, setCreatedTicketNumber] = useState<number | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loadingComments, setLoadingComments] = useState(false);

  const [form, setForm] = useState({ ...emptyForm });

  const permissions = session?.user?.permissions || [];
  const isAdmin = session?.user?.role === "administrador";

  const fetchTickets = useCallback(async (search?: string) => {
    const params = search ? `?search=${encodeURIComponent(search)}` : "";
    const res = await fetch(`/api/tickets${params}`);
    const data = await res.json();
    setTickets(Array.isArray(data) ? data : []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (authStatus === "unauthenticated") router.push("/login");
  }, [authStatus, router]);

  useEffect(() => {
    if (session) {
      fetchTickets();
      fetch("/api/users")
        .then((r) => r.json())
        .then((data) => setUsers(Array.isArray(data) ? data : []));
    }
  }, [session, fetchTickets]);

  useEffect(() => {
    if (!session) return;
    const timeout = setTimeout(() => {
      fetchTickets(searchTerm || undefined);
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchTerm, session, fetchTickets]);

  const handleSearch = () => {
    fetchTickets(searchTerm);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  const openCreateModal = () => {
    setEditingTicket(null);
    setForm({ ...emptyForm });
    setCreatedTicketNumber(null);
    setShowModal(true);
  };

  const openEditModal = (ticket: Ticket) => {
    setEditingTicket(ticket);
    setForm({
      title: ticket.title,
      applicativo: ticket.applicativo,
      solucion: ticket.solucion,
      localidad: ticket.localidad,
      usuarioAfectado: ticket.usuarioAfectado,
      priority: ticket.priority,
      assignedTo: ticket.assignedTo || "",
      recibidoPor: ticket.recibidoPor || "",
      status: ticket.status,
    });
    setCreatedTicketNumber(null);
    setShowModal(true);
  };

  const openDetailModal = (ticket: Ticket) => {
    openDetail(ticket);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editingTicket ? `/api/tickets/${editingTicket.id}` : "/api/tickets";
    const method = editingTicket ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (res.ok && !editingTicket) {
      const created = await res.json();
      setCreatedTicketNumber(created.ticketNumber);
    } else {
      setShowModal(false);
    }

    fetchTickets();
    window.dispatchEvent(new Event("tickets-updated"));
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de eliminar este ticket?")) return;
    await fetch(`/api/tickets/${id}`, { method: "DELETE" });
    fetchTickets();
    window.dispatchEvent(new Event("tickets-updated"));
  };

  const copyTicketNumber = (num: number) => {
    navigator.clipboard.writeText(`TK-${String(num).padStart(5, "0")}`);
    setCopiedId(String(num));
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatTicketNum = (n: number) => `TK-${String(n).padStart(5, "0")}`;

  const openDetail = async (ticket: Ticket) => {
    setDetailTicket(ticket);
    setShowDetailModal(true);
    setComments([]);
    setNewComment("");
    setLoadingComments(true);
    const res = await fetch(`/api/tickets/${ticket.id}/comments`);
    if (res.ok) {
      const data = await res.json();
      setComments(Array.isArray(data) ? data : []);
    }
    setLoadingComments(false);
  };

  const handlePostComment = async () => {
    if (!newComment.trim() || !detailTicket) return;
    const res = await fetch(`/api/tickets/${detailTicket.id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: newComment }),
    });
    if (res.ok) {
      const comment = await res.json();
      setComments((prev) => [comment, ...prev]);
      setNewComment("");
    }
  };

  const getSlaStatus = (ticket: Ticket) => {
    if (ticket.status === "resuelto" && ticket.resolvedAt) {
      const created = new Date(ticket.createdAt).getTime();
      const resolved = new Date(ticket.resolvedAt).getTime();
      const hours = (resolved - created) / (1000 * 60 * 60);
      const exceeded = hours > ticket.slaHours;
      return { hours: Math.round(hours * 10) / 10, exceeded, resolved: true };
    }
    const created = new Date(ticket.createdAt).getTime();
    const now = Date.now();
    const hours = (now - created) / (1000 * 60 * 60);
    const exceeded = hours > ticket.slaHours;
    return { hours: Math.round(hours * 10) / 10, exceeded, resolved: false };
  };

  const filtered = tickets.filter((t) => {
    const matchStatus = filterStatus === "todos" || t.status === filterStatus;
    const matchPriority = filterPriority === "todos" || t.priority === filterPriority;
    return matchStatus && matchPriority;
  });

  if (authStatus === "loading" || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-primary text-lg">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary flex items-center gap-3">
            <TicketCheck className="w-8 h-8" />
            Tickets
          </h1>
          <p className="text-muted mt-1">{tickets.length} tickets en total</p>
        </div>
        {permissions.includes("crear_tickets") && (
          <button onClick={openCreateModal} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Nuevo Ticket
          </button>
        )}
      </div>

      {/* Panel de búsqueda */}
      <div className="card !p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Buscar por # ticket, título, usuario afectado, aplicativo o localidad..."
              className="input-field pl-10"
            />
          </div>
          <button onClick={handleSearch} className="btn-primary flex items-center gap-2">
            <Search className="w-4 h-4" />
            Buscar
          </button>
          <div className="flex gap-3">
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="input-field pl-10 pr-8 appearance-none cursor-pointer"
              >
                <option value="todos">Todos los estados</option>
                <option value="proceso">En Proceso</option>
                <option value="pendiente">Pendiente</option>
                <option value="resuelto">Resuelto</option>
              </select>
            </div>
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="input-field pr-8 appearance-none cursor-pointer"
            >
              <option value="todos">Todas las prioridades</option>
              <option value="baja">Baja</option>
              <option value="media">Media</option>
              <option value="alta">Alta</option>
              <option value="urgente">Urgente</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabla de tickets */}
      <div className="card">
        {filtered.length === 0 ? (
          <p className="text-muted text-center py-12">No se encontraron tickets</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-border text-left">
                  <th className="pb-3 font-semibold"># Ticket</th>
                  <th className="pb-3 font-semibold">Título</th>
                  <th className="pb-3 font-semibold hidden md:table-cell">Aplicativo</th>
                  <th className="pb-3 font-semibold">Estado</th>
                  <th className="pb-3 font-semibold hidden md:table-cell">Técnico</th>
                  <th className="pb-3 font-semibold hidden lg:table-cell">Usuario Afectado</th>
                  <th className="pb-3 font-semibold hidden lg:table-cell">Localidad</th>
                  <th className="pb-3 font-semibold hidden xl:table-cell">Fecha y Hora</th>
                  <th className="pb-3 font-semibold text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filtered.map((ticket) => (
                  <tr key={ticket.id} className="hover:bg-amber-50/50">
                    <td className="py-3">
                      <div className="flex items-center gap-1">
                        <Hash className="w-3.5 h-3.5 text-muted" />
                        <span className="font-mono font-bold text-primary">{formatTicketNum(ticket.ticketNumber)}</span>
                        <button
                          onClick={() => copyTicketNumber(ticket.ticketNumber)}
                          className="p-1 hover:bg-amber-100 rounded transition-colors text-muted"
                          title="Copiar número"
                        >
                          {copiedId === String(ticket.ticketNumber) ? (
                            <Check className="w-3 h-3 text-green-600" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="py-3 font-medium max-w-[180px] truncate">{ticket.title}</td>
                    <td className="py-3 hidden md:table-cell text-muted">{ticket.applicativo}</td>
                    <td className="py-3">
                      <div className="flex items-center gap-1">
                        <StatusBadge status={ticket.status} />
                        {ticket.status !== "resuelto" && getSlaStatus(ticket).exceeded && (
                          <span title="SLA excedido"><AlertTriangle className="w-3.5 h-3.5 text-red-500" /></span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 hidden md:table-cell text-muted">
                      {ticket.assignee?.name || "Sin asignar"}
                    </td>
                    <td className="py-3 hidden lg:table-cell text-muted">{ticket.usuarioAfectado}</td>
                    <td className="py-3 hidden lg:table-cell text-muted">{ticket.localidad}</td>
                    <td className="py-3 hidden xl:table-cell text-muted">
                      {new Date(ticket.createdAt).toLocaleString("es-MX", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openDetailModal(ticket)}
                          className="p-1.5 hover:bg-blue-100 rounded-lg transition-colors text-blue-600"
                          title="Ver detalle"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {(permissions.includes("editar_tickets") || isAdmin) && (
                          <button
                            onClick={() => openEditModal(ticket)}
                            className="p-1.5 hover:bg-amber-100 rounded-lg transition-colors text-primary"
                            title="Editar"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                        )}
                        {(permissions.includes("eliminar_tickets") || isAdmin) && (
                          <button
                            onClick={() => handleDelete(ticket.id)}
                            className="p-1.5 hover:bg-red-100 rounded-lg transition-colors text-red-600"
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Crear/Editar */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => { setShowModal(false); setCreatedTicketNumber(null); }} />
          <div className="relative bg-card-bg rounded-xl border-2 border-border shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b-2 border-border">
              <h2 className="text-xl font-bold text-primary">
                {editingTicket ? `Editar Ticket ${formatTicketNum(editingTicket.ticketNumber)}` : "Nuevo Ticket"}
              </h2>
              <button onClick={() => { setShowModal(false); setCreatedTicketNumber(null); }} className="text-muted hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            {createdTicketNumber ? (
              <div className="p-8 text-center space-y-4">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full">
                  <Check className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-2xl font-bold text-primary">Ticket Creado</h3>
                <p className="text-muted">Número de ticket para el usuario:</p>
                <div className="flex items-center justify-center gap-3">
                  <span className="text-3xl font-mono font-bold text-primary bg-amber-100 px-6 py-3 rounded-xl border-2 border-border">
                    {formatTicketNum(createdTicketNumber)}
                  </span>
                  <button
                    onClick={() => copyTicketNumber(createdTicketNumber)}
                    className="btn-secondary flex items-center gap-2"
                  >
                    {copiedId === String(createdTicketNumber) ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                    Copiar
                  </button>
                </div>
                <button
                  onClick={() => { setShowModal(false); setCreatedTicketNumber(null); }}
                  className="btn-primary mt-4"
                >
                  Cerrar
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold mb-1.5">Título del Incidente</label>
                    <input
                      type="text"
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                      className="input-field"
                      placeholder="Descripción breve del incidente"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1.5">Aplicativo del Incidente</label>
                    <input
                      type="text"
                      value={form.applicativo}
                      onChange={(e) => setForm({ ...form, applicativo: e.target.value })}
                      className="input-field"
                      placeholder="Ej: SAP, Outlook, VPN..."
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1.5">Localidad Afectada</label>
                    <input
                      type="text"
                      value={form.localidad}
                      onChange={(e) => setForm({ ...form, localidad: e.target.value })}
                      className="input-field"
                      placeholder="Ej: Oficina Central, Sucursal Norte..."
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1.5">Usuario Afectado</label>
                    <input
                      type="text"
                      value={form.usuarioAfectado}
                      onChange={(e) => setForm({ ...form, usuarioAfectado: e.target.value })}
                      className="input-field"
                      placeholder="Nombre del usuario afectado"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1.5">Prioridad</label>
                    <select
                      value={form.priority}
                      onChange={(e) => setForm({ ...form, priority: e.target.value })}
                      className="input-field"
                    >
                      <option value="baja">Baja</option>
                      <option value="media">Media</option>
                      <option value="alta">Alta</option>
                      <option value="urgente">Urgente</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-1.5">Solución Aplicada</label>
                  <textarea
                    value={form.solucion}
                    onChange={(e) => setForm({ ...form, solucion: e.target.value })}
                    className="input-field min-h-[80px] resize-y"
                    placeholder="Describir la solución técnica aplicada (puede llenarse después)"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-1.5">Estado del Ticket</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="input-field"
                  >
                    <option value="proceso">En Proceso</option>
                    <option value="pendiente">Pendiente</option>
                    <option value="resuelto">Resuelto</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-1.5">Técnico que lo Trabaja</label>
                    <select
                      value={form.assignedTo}
                      onChange={(e) => setForm({ ...form, assignedTo: e.target.value })}
                      className="input-field"
                    >
                      <option value="">Sin asignar</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1.5">Recibido Por</label>
                    <select
                      value={form.recibidoPor}
                      onChange={(e) => setForm({ ...form, recibidoPor: e.target.value })}
                      className="input-field"
                    >
                      <option value="">Seleccionar...</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="submit" className="btn-primary flex-1">
                    {editingTicket ? "Guardar Cambios" : "Crear Ticket"}
                  </button>
                  <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">
                    Cancelar
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Modal Detalle */}
      {showDetailModal && detailTicket && (() => {
        const sla = getSlaStatus(detailTicket);
        return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowDetailModal(false)} />
          <div className="relative bg-card-bg rounded-xl border-2 border-border shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b-2 border-border">
              <div>
                <p className="text-sm text-muted">Ticket</p>
                <h2 className="text-xl font-bold text-primary font-mono">
                  {formatTicketNum(detailTicket.ticketNumber)}
                </h2>
              </div>
              <div className="flex items-center gap-3">
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ${
                  sla.exceeded
                    ? "bg-red-100 text-red-700 border border-red-300"
                    : "bg-green-100 text-green-700 border border-green-300"
                }`}>
                  {sla.exceeded ? <AlertTriangle className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                  {sla.resolved ? `Resuelto en ${sla.hours}h` : `${sla.hours}h / ${detailTicket.slaHours}h SLA`}
                </div>
                <button onClick={() => setShowDetailModal(false)} className="text-muted hover:text-foreground">
                  <X className="w-5 h-5" />
                </button>
              </div>
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

              {/* Comentarios */}
              <div className="vintage-divider" />
              <div>
                <h4 className="font-semibold text-sm flex items-center gap-2 mb-3">
                  <MessageSquare className="w-4 h-4" />
                  Notas / Comentarios ({comments.length})
                </h4>
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handlePostComment()}
                    placeholder="Agregar una nota..."
                    className="input-field flex-1 text-sm"
                  />
                  <button
                    onClick={handlePostComment}
                    disabled={!newComment.trim()}
                    className="btn-primary px-3 disabled:opacity-40"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {loadingComments ? (
                    <p className="text-xs text-muted text-center py-3">Cargando...</p>
                  ) : comments.length === 0 ? (
                    <p className="text-xs text-muted text-center py-3">Sin comentarios</p>
                  ) : (
                    comments.map((c) => (
                      <div key={c.id} className="p-2.5 bg-amber-50/50 rounded-lg border border-border/50">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs font-semibold text-primary">{c.author.name}</span>
                          <span className="text-[10px] text-muted">
                            {new Date(c.createdAt).toLocaleString("es-MX", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        <p className="text-sm">{c.content}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                {(permissions.includes("editar_tickets") || isAdmin) && (
                  <button
                    onClick={() => { setShowDetailModal(false); openEditModal(detailTicket); }}
                    className="btn-primary flex-1 flex items-center justify-center gap-2"
                  >
                    <Edit3 className="w-4 h-4" /> Editar
                  </button>
                )}
                <button onClick={() => setShowDetailModal(false)} className="btn-secondary flex-1">
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
        );
      })()}
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
