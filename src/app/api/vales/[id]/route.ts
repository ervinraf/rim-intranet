import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const updateSchema = z.object({
  status: z.enum(["APROBADO", "RECHAZADO"]).optional(),
  rejectionReason: z.string().optional().nullable(),
  concept: z.string().optional(),
  vehicle: z.string().optional().nullable(),
  liters: z.number().optional().nullable(),
  amount: z.number().optional().nullable(),
  vendor: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const isAdmin = ["SUPERADMIN", "ADMIN", "GERENTE"].includes(session.user.role ?? "")

  const existing = await prisma.vale.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: "Vale no encontrado" }, { status: 404 })

  if (parsed.data.status && !isAdmin) {
    return NextResponse.json({ error: "Sin permiso para aprobar/rechazar" }, { status: 403 })
  }

  const updateData: any = { ...parsed.data }
  if (parsed.data.status === "APROBADO" || parsed.data.status === "RECHAZADO") {
    updateData.approvedById = session.user.employeeId
    updateData.approvedAt = new Date()
  }

  const vale = await prisma.vale.update({
    where: { id },
    data: updateData,
    include: {
      employee: { select: { fullName: true, department: { select: { name: true } } } },
      project: { select: { name: true } },
      approvedBy: { select: { fullName: true } },
    },
  })

  return NextResponse.json(vale)
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id } = await params
  const existing = await prisma.vale.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: "Vale no encontrado" }, { status: 404 })

  const isAdmin = ["SUPERADMIN", "ADMIN"].includes(session.user.role ?? "")
  const isOwner = existing.employeeId === session.user.employeeId

  if (!isAdmin && !(isOwner && existing.status === "PENDIENTE")) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 })
  }

  await prisma.vale.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
