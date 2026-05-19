import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id } = await params
  const { status, rejectionReason } = await req.json()

  const isAdmin = ["SUPERADMIN", "ADMIN", "GERENTE"].includes(session.user.role ?? "")

  if (status === "APROBADO" || status === "RECHAZADO") {
    if (!isAdmin) return NextResponse.json({ error: "Sin permiso" }, { status: 403 })
  }

  const updated = await prisma.vacationRequest.update({
    where: { id },
    data: {
      status,
      rejectionReason: rejectionReason ?? null,
      approvedById: (status === "APROBADO" || status === "RECHAZADO") ? session.user.employeeId : undefined,
      approvedAt: (status === "APROBADO" || status === "RECHAZADO") ? new Date() : undefined,
    },
    include: {
      employee: { select: { fullName: true, department: { select: { name: true } } } },
      approvedBy: { select: { fullName: true } },
    },
  })

  return NextResponse.json(updated)
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id } = await params
  const record = await prisma.vacationRequest.findUnique({ where: { id } })
  if (!record) return NextResponse.json({ error: "No encontrado" }, { status: 404 })

  const isOwner = record.employeeId === session.user.employeeId
  if (!isOwner || record.status !== "PENDIENTE") {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 })
  }

  await prisma.vacationRequest.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
