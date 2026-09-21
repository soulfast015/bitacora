import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const ticket = await prisma.ticket.findUnique({
    where: { id },
    include: {
      assignee: { select: { id: true, name: true, email: true } },
      receiver: { select: { id: true, name: true, email: true } },
      creator: { select: { id: true, name: true, email: true } },
    },
  });

  if (!ticket) return Response.json({ error: "Ticket no encontrado" }, { status: 404 });

  return Response.json(ticket);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "No autorizado" }, { status: 401 });

  const permissions = session.user.permissions || [];
  if (!permissions.includes("editar_tickets")) {
    return Response.json({ error: "Sin permisos" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const { title, applicativo, solucion, localidad, usuarioAfectado, status, priority, assignedTo, recibidoPor, slaHours } = body;

  const resolvedAtData: { resolvedAt?: Date | null } = {};
  if (status === "resuelto") {
    const existing = await prisma.ticket.findUnique({ where: { id }, select: { resolvedAt: true } });
    if (!existing?.resolvedAt) {
      resolvedAtData.resolvedAt = new Date();
    }
  } else if (status !== undefined) {
    resolvedAtData.resolvedAt = null;
  }

  const ticket = await prisma.ticket.update({
    where: { id },
    data: {
      ...(title !== undefined && { title }),
      ...(applicativo !== undefined && { applicativo }),
      ...(solucion !== undefined && { solucion }),
      ...(localidad !== undefined && { localidad }),
      ...(usuarioAfectado !== undefined && { usuarioAfectado }),
      ...(status !== undefined && { status }),
      ...(priority !== undefined && { priority }),
      ...(assignedTo !== undefined && { assignedTo: assignedTo || null }),
      ...(recibidoPor !== undefined && { recibidoPor: recibidoPor || null }),
      ...(slaHours !== undefined && { slaHours: Number(slaHours) }),
      ...resolvedAtData,
    },
    include: {
      assignee: { select: { id: true, name: true, email: true } },
      receiver: { select: { id: true, name: true, email: true } },
      creator: { select: { id: true, name: true, email: true } },
    },
  });

  return Response.json(ticket);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "No autorizado" }, { status: 401 });

  const permissions = session.user.permissions || [];
  if (!permissions.includes("eliminar_tickets")) {
    return Response.json({ error: "Sin permisos" }, { status: 403 });
  }

  const { id } = await params;
  await prisma.ticket.delete({ where: { id } });

  return Response.json({ message: "Ticket eliminado" });
}
