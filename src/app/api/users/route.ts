import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "No autorizado" }, { status: 401 });

  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      roleId: true,
      role: { select: { id: true, name: true } },
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return Response.json(users);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "No autorizado" }, { status: 401 });

  const permissions = session.user.permissions || [];
  if (!permissions.includes("crear_usuarios")) {
    return Response.json({ error: "Sin permisos" }, { status: 403 });
  }

  const body = await req.json();
  const { email, name, password, roleId } = body;

  if (!email || !name || !password || !roleId) {
    return Response.json({ error: "Todos los campos son requeridos" }, { status: 400 });
  }

  const normalizedEmail = email.trim().toLowerCase();

  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) {
    return Response.json({ error: "El email ya está registrado" }, { status: 409 });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: { email: normalizedEmail, name, password: hashedPassword, roleId },
    select: {
      id: true,
      email: true,
      name: true,
      role: { select: { id: true, name: true } },
      createdAt: true,
    },
  });

  return Response.json(user, { status: 201 });
}
