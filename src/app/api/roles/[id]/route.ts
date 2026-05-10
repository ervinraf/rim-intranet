import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const isAdmin = ["SUPERADMIN", "ADMIN"].includes(session.user.role ?? "")
  if (!isAdmin) return NextResponse.json({ error: "Sin permiso" }, { status: 403 })

  const { id } = await params
  const body = await req.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const role = await prisma.role.update({
    where: { id },
    data: parsed.data,
    include: { _count: { select: { employees: true } } },
  })

  return NextResponse.json(role)
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const isAdmin = ["SUPERADMIN", "ADMIN"].includes(session.user.role ?? "")
  if (!isAdmin) return NextResponse.json({ error: "Sin permiso" }, { status: 403 })

  const { id } = await params

  const existing = await prisma.role.findUnique({ where: { id }, include: { _count: { select: { employees: true } } } })
  if (!existing) return NextResponse.json({ error: "Rol no encontrado" }, { status: 404 })
  if (existing.isSystem) return NextResponse.json({ error: "No se puede eliminar un rol del sistema" }, { status: 409 })
  if (existing._count.employees > 0) {
    return NextResponse.json(
      { error: `No se puede eliminar: hay ${existing._count.employees} empleado(s) con este rol` },
      { status: 409 }
    )
  }

  await prisma.role.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
