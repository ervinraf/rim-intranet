import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const schema = z.object({
  employeeId: z.string().min(1),
  hours: z.number().positive().max(500),
  note: z.string().optional(),
  expiresAt: z.string().optional().nullable(),
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const isAdmin = ["SUPERADMIN", "ADMIN", "GERENTE"].includes(session.user.role ?? "")
  if (!isAdmin) return NextResponse.json({ error: "Sin permiso" }, { status: 403 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { employeeId, hours, note, expiresAt } = parsed.data

  const employee = await prisma.employee.findUnique({ where: { id: employeeId } })
  if (!employee) return NextResponse.json({ error: "Empleado no encontrado" }, { status: 404 })

  const entry = await prisma.hoursBank.create({
    data: {
      employeeId,
      hoursCredited: hours,
      hoursAvailable: hours,
      hoursUsed: 0,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    },
  })

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: "CREAR",
      module: "overtime",
      entityId: entry.id,
      entityType: "HoursBank",
      newData: JSON.parse(JSON.stringify({ employeeId, hours, note })),
    },
  })

  return NextResponse.json(entry, { status: 201 })
}
