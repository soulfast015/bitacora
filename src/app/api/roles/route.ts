import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "No autorizado" }, { status: 401 });

  const roles = await prisma.role.findMany({
    include: { permissions: true },
    orderBy: { name: "asc" },
  });

  return Response.json(roles);
}
