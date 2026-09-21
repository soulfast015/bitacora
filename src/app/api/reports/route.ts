import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "No autorizado" }, { status: 401 });

  const permissions = session.user.permissions || [];
  if (!permissions.includes("ver_reportes")) {
    return Response.json({ error: "Sin permisos" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const period = searchParams.get("period") || "month";
  const userId = searchParams.get("userId") || "";

  const whereClause = userId ? { assignedTo: userId } : {};

  const tickets = await prisma.ticket.findMany({
    where: whereClause,
    include: {
      assignee: { select: { name: true } },
      creator: { select: { name: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const now = new Date();
  let startDate: Date;

  switch (period) {
    case "day":
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case "month":
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case "quarter":
      const quarterMonth = Math.floor(now.getMonth() / 3) * 3;
      startDate = new Date(now.getFullYear(), quarterMonth, 1);
      break;
    case "year":
      startDate = new Date(now.getFullYear(), 0, 1);
      break;
    default:
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  }

  const filteredTickets = tickets.filter(
    (t) => new Date(t.createdAt) >= startDate
  );

  const statusCount: Record<string, number> = {};
  const priorityCount: Record<string, number> = {};
  const dailyCount: Record<string, number> = {};
  const assigneeCount: Record<string, number> = {};

  for (const ticket of filteredTickets) {
    statusCount[ticket.status] = (statusCount[ticket.status] || 0) + 1;
    priorityCount[ticket.priority] = (priorityCount[ticket.priority] || 0) + 1;

    const day = new Date(ticket.createdAt).toISOString().split("T")[0];
    dailyCount[day] = (dailyCount[day] || 0) + 1;

    const name = ticket.assignee?.name || "Sin asignar";
    assigneeCount[name] = (assigneeCount[name] || 0) + 1;
  }

  return Response.json({
    total: filteredTickets.length,
    totalAll: tickets.length,
    statusCount,
    priorityCount,
    dailyCount,
    assigneeCount,
    period,
  });
}
