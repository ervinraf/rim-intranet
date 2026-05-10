import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const schema = z.object({
  employeeId: z.string(),
  level: z.enum(["VER", "COMENTAR", "EDITAR", "DESCARGAR"]),
})

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const isAdmin = ["SUPERADMIN", "ADMIN"].includes(session.user.role ?? "")
  if (!isAdmin) return NextResponse.json({ error: "Sin permiso" }, { status: 403 })

  const { id } = await params
  const perms = await prisma.documentPermission.findMany({
    where: { documentId: id },
    include: { employee: { select: { fullName: true, department: { select: { name: true } } } } },
  })

  return NextResponse.json(perms)
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const isAdmin = ["SUPERADMIN", "ADMIN"].includes(session.user.role ?? "")
  if (!isAdmin) return NextResponse.json({ error: "Sin permiso" }, { status: 403 })

  const { id: documentId } = await params
  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const perm = await prisma.documentPermission.upsert({
    where: { documentId_employeeId: { documentId, employeeId: parsed.data.employeeId } },
    update: { level: parsed.data.level, grantedById: session.user.employeeId },
    create: {
      documentId,
      employeeId: parsed.data.employeeId,
      level: parsed.data.level,
      grantedById: session.user.employeeId,
    },
  })

  return NextResponse.json(perm, { status: 201 })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const isAdmin = ["SUPERADMIN", "ADMIN"].includes(session.user.role ?? "")
  if (!isAdmin) return NextResponse.json({ error: "Sin permiso" }, { status: 403 })

  const { id: documentId } = await params
  const { employeeId } = await req.json()

  await prisma.documentPermission.delete({
    where: { documentId_employeeId: { documentId, employeeId } },
  })

  return NextResponse.json({ ok: true })
}
