import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "No autorizado" }, { status: 401 });

  const permissions = session.user.permissions || [];
  if (!permissions.includes("eliminar_usuarios") && session.user.role !== "administrador") {
    return Response.json({ error: "Sin permisos" }, { status: 403 });
  }

  const { id } = await params;

  if (id === session.user.id) {
    return Response.json({ error: "No puedes eliminarte a ti mismo" }, { status: 400 });
  }

  const ticketCount = await prisma.ticket.count({
    where: {
      OR: [
        { assignedTo: id },
        { createdBy: id },
        { recibidoPor: id },
      ],
    },
  });

  if (ticketCount > 0) {
    await prisma.ticket.updateMany({
      where: { assignedTo: id },
      data: { assignedTo: null },
    });
    await prisma.ticket.updateMany({
      where: { recibidoPor: id },
      data: { recibidoPor: null },
    });
  }

  await prisma.user.delete({ where: { id } });

  return Response.json({ message: "Usuario eliminado" });
}
