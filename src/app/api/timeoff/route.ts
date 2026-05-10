import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { getEmployeeTotalBalance } from "@/lib/overtime"

const createSchema = z.object({
  hoursRequested: z.number().positive(),
  dateFrom: z.string(),
  dateTo: z.string(),
  reason: z.string().optional(),
})

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const isAdmin = ["SUPERADMIN", "ADMIN", "GERENTE"].includes(session.user.role ?? "")
  const where: any = isAdmin ? {} : { employeeId: session.user.employeeId }

  const requests = await prisma.timeOffRequest.findMany({
    where,
    include: {
      employee: { select: { fullName: true, department: { select: { name: true } } } },
      approvedBy: { select: { fullName: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  })

  return NextResponse.json(requests)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const employeeId = session.user.employeeId
  if (!employeeId) return NextResponse.json({ error: "Empleado no encontrado" }, { status: 400 })

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { hoursRequested, dateFrom, dateTo, reason } = parsed.data

  // Verificar saldo disponible
  const now = new Date()
  await prisma.hoursBank.updateMany({
    where: { employeeId, isExpired: false, expiresAt: { lt: now } },
    data: { isExpired: true, hoursAvailable: 0 },
  })

  const entries = await prisma.hoursBank.findMany({
    where: { employeeId, isExpired: false },
    select: { hoursAvailable: true, expiresAt: true, isExpired: true },
  })

  const balance = getEmployeeTotalBalance(
    entries.map((e) => ({
      hoursAvailable: Number(e.hoursAvailable),
      expiresAt: e.expiresAt,
      isExpired: e.isExpired,
    }))
  )

  if (hoursRequested > balance) {
    return NextResponse.json(
      { error: `Saldo insuficiente. Tienes ${balance.toFixed(1)} hrs disponibles.` },
      { status: 400 }
    )
  }

  const request = await prisma.timeOffRequest.create({
    data: {
      employeeId,
      hoursRequested,
      dateFrom: new Date(dateFrom),
      dateTo: new Date(dateTo),
      reason,
      status: "PENDIENTE",
    },
  })

  return NextResponse.json(request, { status: 201 })
}
