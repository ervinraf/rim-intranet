import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { calculateBankExpiry } from "@/lib/overtime"

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const isManager = ["SUPERADMIN", "ADMIN", "GERENTE"].includes(session.user.role ?? "")
  if (!isManager) return NextResponse.json({ error: "Sin permiso" }, { status: 403 })

  const { id } = await params
  const body = await req.json()
  const { action, rejectionReason } = body

  if (!["approve", "reject"].includes(action)) {
    return NextResponse.json({ error: "Accion invalida" }, { status: 400 })
  }

  const record = await prisma.overtimeRecord.findUnique({ where: { id } })
  if (!record) return NextResponse.json({ error: "Registro no encontrado" }, { status: 404 })
  if (record.status !== "PENDIENTE") {
    return NextResponse.json({ error: "El registro ya fue procesado" }, { status: 409 })
  }

  if (action === "reject") {
    const updated = await prisma.overtimeRecord.update({
      where: { id },
      data: {
        status: "RECHAZADO",
        approvedById: session.user.employeeId,
        approvedAt: new Date(),
        rejectionReason,
      },
    })
    return NextResponse.json(updated)
  }

  // Aprobar: crear entrada en banco de horas
  const config = await prisma.systemConfig.findMany({
    where: { key: { in: ["hours_bank_expiration_months"] } },
  })
  const expirationMonths = parseInt(
    config.find((c) => c.key === "hours_bank_expiration_months")?.value ?? "6"
  )

  const now = new Date()
  const expiresAt = calculateBankExpiry(now, expirationMonths)

  const [updatedRecord] = await prisma.$transaction([
    prisma.overtimeRecord.update({
      where: { id },
      data: {
        status: "APROBADO",
        approvedById: session.user.employeeId,
        approvedAt: now,
      },
    }),
    prisma.hoursBank.create({
      data: {
        employeeId: record.employeeId,
        overtimeRecordId: id,
        hoursCredited: record.netHours,
        hoursUsed: 0,
        hoursAvailable: record.netHours,
        creditedAt: now,
        expiresAt,
      },
    }),
  ])

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: "APROBAR",
      module: "overtime",
      entityId: id,
      entityType: "OvertimeRecord",
      newData: { status: "APROBADO", netHours: Number(record.netHours) },
    },
  })

  return NextResponse.json(updatedRecord)
}
