import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const createSchema = z.object({
  employeeId: z.string(),
  date: z.string(),
  checkIn: z.string().optional().nullable(),
  checkOut: z.string().optional().nullable(),
  type: z.enum(["NORMAL", "TARDANZA", "FALTA", "VACACIONES", "PERMISO", "INCAPACIDAD"]).default("NORMAL"),
  notes: z.string().optional().nullable(),
})

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const month = searchParams.get("month") // YYYY-MM
  const employeeId = searchParams.get("employeeId")
  const departmentId = searchParams.get("departmentId")

  const isAdmin = ["SUPERADMIN", "ADMIN", "GERENTE"].includes(session.user.role ?? "")

  let dateFrom: Date | undefined
  let dateTo: Date | undefined
  if (month) {
    const [y, m] = month.split("-").map(Number)
    dateFrom = new Date(y, m - 1, 1)
    dateTo = new Date(y, m, 0, 23, 59, 59)
  }

  const where: any = {}
  if (dateFrom) where.date = { gte: dateFrom, lte: dateTo }
  if (employeeId) {
    where.employeeId = employeeId
  } else if (!isAdmin) {
    where.employeeId = session.user.employeeId
  }

  if (departmentId && isAdmin) {
    where.employee = { departmentId }
  }

  const records = await prisma.attendance.findMany({
    where,
    include: {
      employee: {
        select: {
          fullName: true,
          position: true,
          department: { select: { name: true } },
        },
      },
    },
    orderBy: [{ date: "desc" }, { employee: { fullName: "asc" } }],
    take: 500,
  })

  return NextResponse.json(records)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const isAdmin = ["SUPERADMIN", "ADMIN", "GERENTE"].includes(session.user.role ?? "")

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { date, checkIn, checkOut, ...rest } = parsed.data

  // Empleados solo pueden registrar su propia asistencia
  if (!isAdmin && rest.employeeId !== session.user.employeeId) {
    return NextResponse.json({ error: "Solo puedes registrar tu propia asistencia" }, { status: 403 })
  }
  if (!isAdmin && !session.user.employeeId) {
    return NextResponse.json({ error: "Tu usuario no tiene perfil de empleado" }, { status: 403 })
  }

  const record = await prisma.attendance.upsert({
    where: {
      employeeId_date: {
        employeeId: rest.employeeId,
        date: new Date(date),
      },
    },
    update: {
      checkIn: checkIn ? new Date(checkIn) : null,
      checkOut: checkOut ? new Date(checkOut) : null,
      type: rest.type,
      notes: rest.notes ?? null,
      registeredById: session.user.id,
    },
    create: {
      ...rest,
      date: new Date(date),
      checkIn: checkIn ? new Date(checkIn) : null,
      checkOut: checkOut ? new Date(checkOut) : null,
      registeredById: session.user.id,
    },
    include: {
      employee: { select: { fullName: true, department: { select: { name: true } } } },
    },
  })

  return NextResponse.json(record, { status: 201 })
}
