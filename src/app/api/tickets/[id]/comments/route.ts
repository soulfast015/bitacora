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

  const comments = await prisma.ticketComment.findMany({
    where: { ticketId: id },
    include: {
      author: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return Response.json(comments);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { content } = body;

  if (!content || !content.trim()) {
    return Response.json({ error: "El comentario no puede estar vacío" }, { status: 400 });
  }

  const comment = await prisma.ticketComment.create({
    data: {
      content: content.trim(),
      ticketId: id,
      authorId: session.user.id,
    },
    include: {
      author: { select: { id: true, name: true, email: true } },
    },
  });

  return Response.json(comment, { status: 201 });
}
