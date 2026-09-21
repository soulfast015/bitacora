import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";

  let where = {};
  if (search) {
    const conditions: Record<string, unknown>[] = [
      { title: { contains: search } },
      { usuarioAfectado: { contains: search } },
      { applicativo: { contains: search } },
      { localidad: { contains: search } },
    ];
    const asNum = Number(search.replace(/\D/g, ""));
    if (!isNaN(asNum) && asNum > 0) {
      conditions.push({ ticketNumber: asNum });
    }
    where = { OR: conditions };
  }

  const tickets = await prisma.ticket.findMany({
    where,
    include: {
      assignee: { select: { id: true, name: true, email: true } },
      receiver: { select: { id: true, name: true, email: true } },
      creator: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return Response.json(tickets);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "No autorizado" }, { status: 401 });

  const permissions = session.user.permissions || [];
  if (!permissions.includes("crear_tickets")) {
    return Response.json({ error: "Sin permisos" }, { status: 403 });
  }

  const body = await req.json();
  const { title, applicativo, solucion, localidad, usuarioAfectado, priority, assignedTo, recibidoPor, status } = body;

  if (!title || !applicativo || !localidad || !usuarioAfectado) {
    return Response.json({ error: "Título, aplicativo, localidad y usuario afectado son requeridos" }, { status: 400 });
  }

  const lastTicket = await prisma.ticket.findFirst({
    orderBy: { ticketNumber: "desc" },
    select: { ticketNumber: true },
  });
  const nextNumber = (lastTicket?.ticketNumber || 0) + 1;

  const ticket = await prisma.ticket.create({
    data: {
      ticketNumber: nextNumber,
      title,
      applicativo,
      solucion: solucion || "",
      localidad,
      usuarioAfectado,
      priority: priority || "media",
      assignedTo: assignedTo || null,
      recibidoPor: recibidoPor || null,
      status: status || "proceso",
      createdBy: session.user.id,
    },
    include: {
      assignee: { select: { id: true, name: true, email: true } },
      receiver: { select: { id: true, name: true, email: true } },
      creator: { select: { id: true, name: true, email: true } },
    },
  });

  return Response.json(ticket, { status: 201 });
}
