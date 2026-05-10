import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const isManager = ["SUPERADMIN", "ADMIN", "GERENTE"].includes(session.user.role ?? "")
  if (!isManager) return NextResponse.json({ error: "Sin permiso" }, { status: 403 })

  const { id } = await params
  const { action, rejectionReason } = await req.json()

  const request = await prisma.timeOffRequest.findUnique({ where: { id } })
  if (!request) return NextResponse.json({ error: "Solicitud no encontrada" }, { status: 404 })
  if (request.status !== "PENDIENTE") {
    return NextResponse.json({ error: "La solicitud ya fue procesada" }, { status: 409 })
  }

  if (action === "reject") {
    const updated = await prisma.timeOffRequest.update({
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

  if (action === "approve") {
    // Descontar horas del banco — FIFO por fecha de credito
    const hours = Number(request.hoursRequested)
    let remaining = hours

    const bankEntries = await prisma.hoursBank.findMany({
      where: {
        employeeId: request.employeeId,
        isExpired: false,
        hoursAvailable: { gt: 0 },
      },
      orderBy: { creditedAt: "asc" },
    })

    const deductions: { id: string; hoursUsed: number; hoursAvailable: number }[] = []
    for (const entry of bankEntries) {
      if (remaining <= 0) break
      const available = Number(entry.hoursAvailable)
      const deduct = Math.min(available, remaining)
      remaining -= deduct
      deductions.push({
        id: entry.id,
        hoursUsed: Number(entry.hoursUsed) + deduct,
        hoursAvailable: available - deduct,
      })
    }

    const updatedRequest = await prisma.$transaction(async (tx) => {
      const req = await tx.timeOffRequest.update({
        where: { id },
        data: {
          status: "APROBADO",
          approvedById: session.user.employeeId,
          approvedAt: new Date(),
        },
      })
      for (const d of deductions) {
        await tx.hoursBank.update({
          where: { id: d.id },
          data: { hoursUsed: d.hoursUsed, hoursAvailable: d.hoursAvailable },
        })
      }
      return req
    })

    return NextResponse.json(updatedRequest)
  }

  return NextResponse.json({ error: "Accion invalida" }, { status: 400 })
}
