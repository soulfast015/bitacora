import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import bcrypt from "bcryptjs";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  // Crear permisos
  const permisos = [
    "ver_tickets",
    "crear_tickets",
    "editar_tickets",
    "eliminar_tickets",
    "asignar_tickets",
    "ver_usuarios",
    "crear_usuarios",
    "editar_usuarios",
    "eliminar_usuarios",
    "ver_reportes",
    "gestionar_roles",
    "cambiar_contraseñas",
  ];

  const permisosCreados = [];
  for (const nombre of permisos) {
    const p = await prisma.permission.upsert({
      where: { name: nombre },
      update: {},
      create: { name: nombre },
    });
    permisosCreados.push(p);
  }

  // Crear roles
  const adminRole = await prisma.role.upsert({
    where: { name: "administrador" },
    update: {},
    create: {
      name: "administrador",
      permissions: {
        connect: permisosCreados.map((p) => ({ id: p.id })),
      },
    },
  });

  const tecnicoRole = await prisma.role.upsert({
    where: { name: "tecnico" },
    update: {},
    create: {
      name: "tecnico",
      permissions: {
        connect: permisosCreados
          .filter((p) =>
            [
              "ver_tickets",
              "crear_tickets",
              "editar_tickets",
              "asignar_tickets",
            ].includes(p.name)
          )
          .map((p) => ({ id: p.id })),
      },
    },
  });

  const usuarioRole = await prisma.role.upsert({
    where: { name: "usuario" },
    update: {},
    create: {
      name: "usuario",
      permissions: {
        connect: permisosCreados
          .filter((p) => ["ver_tickets", "crear_tickets"].includes(p.name))
          .map((p) => ({ id: p.id })),
      },
    },
  });

  // Crear usuario administrador
  const hashedPassword = await bcrypt.hash("admin123", 10);

  await prisma.user.upsert({
    where: { email: "admin@bitacora.com" },
    update: {},
    create: {
      email: "admin@bitacora.com",
      name: "Administrador",
      password: hashedPassword,
      roleId: adminRole.id,
    },
  });

  // Crear usuario técnico
  const tecnicoPassword = await bcrypt.hash("tecnico123", 10);
  await prisma.user.upsert({
    where: { email: "tecnico@bitacora.com" },
    update: {},
    create: {
      email: "tecnico@bitacora.com",
      name: "Técnico Soporte",
      password: tecnicoPassword,
      roleId: tecnicoRole.id,
    },
  });

  // Crear usuario normal
  const userPassword = await bcrypt.hash("usuario123", 10);
  await prisma.user.upsert({
    where: { email: "usuario@bitacora.com" },
    update: {},
    create: {
      email: "usuario@bitacora.com",
      name: "Usuario Demo",
      password: userPassword,
      roleId: usuarioRole.id,
    },
  });

  console.log("Seed completado exitosamente");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
