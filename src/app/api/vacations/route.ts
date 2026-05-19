import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const createSchema = z.object({
  dateFrom: z.string(),
  dateTo: z.string(),
  reason: z.string().optional().nullable(),
})

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const isAdmin = ["SUPERADMIN", "ADMIN", "GERENTE"].includes(session.user.role ?? "")
  const { searchParams } = new URL(req.url)
  const status = searchParams.get("status")

  const requests = await prisma.vacationRequest.findMany({
    where: {
      ...(isAdmin ? {} : { employeeId: session.user.employeeId ?? "__none__" }),
      ...(status ? { status: status as any } : {}),
    },
    include: {
      employee: { select: { fullName: true, department: { select: { name: true } } } },
      approvedBy: { select: { fullName: true } },
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 200,
  })

  return NextResponse.json(requests)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  if (!session.user.employeeId) return NextResponse.json({ error: "Sin perfil de empleado" }, { status: 400 })

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const from = new Date(parsed.data.dateFrom)
  const to = new Date(parsed.data.dateTo)
  const days = Math.max(1, Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)) + 1)

  const request = await prisma.vacationRequest.create({
    data: {
      employeeId: session.user.employeeId,
      dateFrom: from,
      dateTo: to,
      daysRequested: days,
      reason: parsed.data.reason ?? null,
    },
    include: {
      employee: { select: { fullName: true, department: { select: { name: true } } } },
    },
  })

  return NextResponse.json(request, { status: 201 })
}
