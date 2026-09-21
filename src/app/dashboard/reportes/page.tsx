"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { BarChart3, Calendar, TrendingUp, Download, Users } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from "recharts";

interface ReportData {
  total: number;
  totalAll: number;
  statusCount: Record<string, number>;
  priorityCount: Record<string, number>;
  dailyCount: Record<string, number>;
  assigneeCount: Record<string, number>;
  period: string;
}

interface UserOption {
  id: string;
  name: string;
  email: string;
}

const COLORS = ["#8b4513", "#d2691e", "#b8860b", "#a0522d", "#cd853f", "#deb887"];
const STATUS_COLORS: Record<string, string> = {
  proceso: "#3b82f6",
  pendiente: "#eab308",
  resuelto: "#22c55e",
};
const STATUS_LABELS: Record<string, string> = {
  proceso: "En Proceso",
  pendiente: "Pendiente",
  resuelto: "Resuelto",
};
const PRIORITY_COLORS: Record<string, string> = {
  baja: "#22c55e",
  media: "#eab308",
  alta: "#f97316",
  urgente: "#ef4444",
};

export default function ReportesPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const [report, setReport] = useState<ReportData | null>(null);
  const [period, setPeriod] = useState("month");
  const [selectedUser, setSelectedUser] = useState("");
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(true);

  const permissions = session?.user?.permissions || [];

  const fetchReport = useCallback(async (p: string, userId: string) => {
    setLoading(true);
    const params = new URLSearchParams({ period: p });
    if (userId) params.set("userId", userId);
    const res = await fetch(`/api/reports?${params.toString()}`);
    const data = await res.json();
    setReport(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (authStatus === "unauthenticated") router.push("/login");
  }, [authStatus, router]);

  useEffect(() => {
    if (session) {
      if (!permissions.includes("ver_reportes")) {
        router.push("/dashboard");
        return;
      }
      fetchReport(period, selectedUser);
      fetch("/api/users")
        .then((r) => r.json())
        .then((data) => setUsers(Array.isArray(data) ? data : []));
    }
  }, [session, permissions, router, fetchReport, period, selectedUser]);

  const handleExportCSV = () => {
    if (!report) return;

    const periodLabels: Record<string, string> = {
      day: "Hoy",
      month: "Este Mes",
      quarter: "Este Trimestre",
      year: "Este Año",
    };

    const userName = selectedUser
      ? users.find((u) => u.id === selectedUser)?.name || "Usuario"
      : "Todos";

    let csv = "Reporte de Tickets\n";
    csv += `Periodo,${periodLabels[period]}\n`;
    csv += `Filtro Usuario,${userName}\n`;
    csv += `Total en Periodo,${report.total}\n`;
    csv += `Total Historico,${report.totalAll}\n`;
    csv += `Tasa de Resolucion,${report.total > 0 ? Math.round((report.statusCount["resuelto"] || 0) / report.total * 100) : 0}%\n`;
    csv += "\n";

    csv += "Estado,Cantidad\n";
    for (const [status, count] of Object.entries(report.statusCount)) {
      csv += `${STATUS_LABELS[status] || status},${count}\n`;
    }
    csv += "\n";

    csv += "Prioridad,Cantidad\n";
    for (const [priority, count] of Object.entries(report.priorityCount)) {
      csv += `${priority.charAt(0).toUpperCase() + priority.slice(1)},${count}\n`;
    }
    csv += "\n";

    csv += "Fecha,Tickets\n";
    for (const [date, count] of Object.entries(report.dailyCount).sort(([a], [b]) => a.localeCompare(b))) {
      csv += `${date},${count}\n`;
    }
    csv += "\n";

    csv += "Tecnico,Tickets\n";
    for (const [name, count] of Object.entries(report.assigneeCount).sort(([, a], [, b]) => b - a)) {
      csv += `${name},${count}\n`;
    }

    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `reporte_${period}_${userName.replace(/\s/g, "_")}_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (authStatus === "loading" || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-primary text-lg">Cargando...</div>
      </div>
    );
  }

  if (!report) return null;

  const statusData = Object.entries(report.statusCount).map(([name, value]) => ({
    name: STATUS_LABELS[name] || name.charAt(0).toUpperCase() + name.slice(1),
    value,
    fill: STATUS_COLORS[name] || "#8b4513",
  }));

  const priorityData = Object.entries(report.priorityCount).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
    fill: PRIORITY_COLORS[name] || "#8b4513",
  }));

  const dailyData = Object.entries(report.dailyCount)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({
      date: new Date(date).toLocaleDateString("es-MX", { day: "2-digit", month: "short" }),
      tickets: count,
    }));

  const assigneeData = Object.entries(report.assigneeCount)
    .sort(([, a], [, b]) => b - a)
    .map(([name, value]) => ({ name, tickets: value }));

  const periodLabels: Record<string, string> = {
    day: "Hoy",
    month: "Este Mes",
    quarter: "Este Trimestre",
    year: "Este Año",
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary flex items-center gap-3">
            <BarChart3 className="w-8 h-8" />
            Reportes
          </h1>
          <p className="text-muted mt-1">
            Análisis de tickets - {periodLabels[period]}
            {selectedUser && ` - ${users.find((u) => u.id === selectedUser)?.name}`}
          </p>
        </div>
        <button
          onClick={handleExportCSV}
          className="btn-primary flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          Exportar CSV
        </button>
      </div>

      {/* Filtros */}
      <div className="card !p-4">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
          <div className="flex gap-2 flex-wrap">
            {["day", "month", "quarter", "year"].map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  period === p
                    ? "bg-primary text-white shadow-md"
                    : "bg-card-bg border-2 border-border text-foreground hover:bg-amber-100"
                }`}
              >
                {periodLabels[p]}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 flex-1">
            <Users className="w-4 h-4 text-muted" />
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="input-field flex-1"
            >
              <option value="">Todos los usuarios</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card text-center">
          <TrendingUp className="w-8 h-8 text-primary mx-auto mb-2" />
          <p className="text-3xl font-bold text-primary">{report.total}</p>
          <p className="text-muted text-sm">Tickets en período</p>
        </div>
        <div className="card text-center">
          <Calendar className="w-8 h-8 text-secondary mx-auto mb-2" />
          <p className="text-3xl font-bold text-secondary">{report.totalAll}</p>
          <p className="text-muted text-sm">Total histórico</p>
        </div>
        <div className="card text-center">
          <BarChart3 className="w-8 h-8 text-accent mx-auto mb-2" />
          <p className="text-3xl font-bold text-accent">
            {report.total > 0
              ? Math.round((report.statusCount["resuelto"] || 0) / report.total * 100)
              : 0}%
          </p>
          <p className="text-muted text-sm">Tasa de resolución</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-bold text-primary mb-4">Tickets por Estado</h3>
          {statusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-muted text-center py-8">Sin datos</p>
          )}
        </div>

        <div className="card">
          <h3 className="text-lg font-bold text-primary mb-4">Tickets por Prioridad</h3>
          {priorityData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={priorityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#d4a574" />
                <XAxis dataKey="name" tick={{ fill: "#3c2415" }} />
                <YAxis tick={{ fill: "#3c2415" }} />
                <Tooltip />
                <Bar dataKey="value" name="Tickets">
                  {priorityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-muted text-center py-8">Sin datos</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-bold text-primary mb-4">Tendencia Diaria</h3>
          {dailyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#d4a574" />
                <XAxis dataKey="date" tick={{ fill: "#3c2415", fontSize: 12 }} />
                <YAxis tick={{ fill: "#3c2415" }} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="tickets"
                  stroke="#8b4513"
                  strokeWidth={3}
                  dot={{ fill: "#8b4513", r: 5 }}
                  name="Tickets"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-muted text-center py-8">Sin datos</p>
          )}
        </div>

        <div className="card">
          <h3 className="text-lg font-bold text-primary mb-4">Tickets por Asignado</h3>
          {assigneeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={assigneeData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#d4a574" />
                <XAxis type="number" tick={{ fill: "#3c2415" }} />
                <YAxis type="category" dataKey="name" tick={{ fill: "#3c2415", fontSize: 12 }} width={120} />
                <Tooltip />
                <Bar dataKey="tickets" name="Tickets">
                  {assigneeData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-muted text-center py-8">Sin datos</p>
          )}
        </div>
      </div>
    </div>
  );
}
