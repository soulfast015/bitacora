import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "No autorizado" }, { status: 401 });

  const count = await prisma.ticket.count({
    where: {
      assignedTo: session.user.id,
      status: { not: "resuelto" },
    },
  });

  return Response.json({ count });
}
