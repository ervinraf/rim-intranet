import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { calculateOvertime, calculateBankExpiry } from "@/lib/overtime"
import { z } from "zod"

const createSchema = z.object({
  employeeId: z.string().optional(),
  weekStart: z.string(),
  weekEnd: z.string(),
  hoursWorked: z.number().positive().max(80),
  notes: z.string().optional(),
})

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const employeeId = searchParams.get("employeeId")
  const status = searchParams.get("status")
  const isAdmin = ["SUPERADMIN", "ADMIN", "GERENTE"].includes(session.user.role ?? "")

  const where: any = {}

  if (!isAdmin) {
    where.employeeId = session.user.employeeId
  } else if (employeeId) {
    where.employeeId = employeeId
  }

  if (status) where.status = status

  const records = await prisma.overtimeRecord.findMany({
    where,
    include: {
      employee: {
        select: { fullName: true, department: { select: { name: true } } },
      },
      approvedBy: { select: { fullName: true } },
    },
    orderBy: { weekStart: "desc" },
    take: 100,
  })

  return NextResponse.json(records)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { weekStart, weekEnd, hoursWorked, notes } = parsed.data

  // El empleado solo puede registrar sus propias horas
  const employeeId = session.user.employeeId
  if (!employeeId) {
    return NextResponse.json({ error: "Empleado no encontrado" }, { status: 400 })
  }

  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: { salarioBase: true, sdi: true, employeeType: true },
  })

  if (!employee || employee.employeeType !== "OPERATIVO") {
    return NextResponse.json(
      { error: "Solo el personal operativo puede registrar horas extras" },
      { status: 403 }
    )
  }

  // Verificar que no exista ya un registro para esa semana
  const existing = await prisma.overtimeRecord.findFirst({
    where: {
      employeeId,
      weekStart: new Date(weekStart),
      status: { not: "RECHAZADO" },
    },
  })
  if (existing) {
    return NextResponse.json(
      { error: "Ya existe un registro de horas extras para esa semana" },
      { status: 409 }
    )
  }

  const salarioBase = Number(employee.salarioBase ?? 0)
  const sdi = Number(employee.sdi ?? 0)

  const calc = calculateOvertime({
    hoursWorked,
    salarioBase,
    sdi,
    isMinimumWage: false,
  })

  const record = await prisma.overtimeRecord.create({
    data: {
      employeeId,
      weekStart: new Date(weekStart),
      weekEnd: new Date(weekEnd),
      hoursWorked: calc.hoursWorked,
      doubleHours: calc.doubleHours,
      tripleHours: calc.tripleHours,
      grossHours: calc.grossHours,
      isMinimumWage: calc.isMinimumWage,
      exceeds9Hours: calc.exceeds9Hours,
      exemptHours: calc.exemptHours,
      taxableHours: calc.taxableHours,
      isrRate: calc.isrRate,
      taxAmount: calc.taxAmount,
      netHours: calc.netHours,
      notes,
      status: "PENDIENTE",
    },
  })

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: "CREAR",
      module: "overtime",
      entityId: record.id,
      entityType: "OvertimeRecord",
      newData: JSON.parse(JSON.stringify({ hoursWorked, weekStart, weekEnd })),
    },
  })

  return NextResponse.json(record, { status: 201 })
}
