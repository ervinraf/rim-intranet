import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const createSchema = z.object({
  type: z.enum(["COMBUSTIBLE", "CAJA_CHICA", "VIATICOS", "HERRAMIENTA"]),
  employeeId: z.string(),
  projectId: z.string().optional().nullable(),
  concept: z.string().min(1),
  vehicle: z.string().optional().nullable(),
  liters: z.number().optional().nullable(),
  amount: z.number().optional().nullable(),
  vendor: z.string().optional().nullable(),
  date: z.string(),
  notes: z.string().optional().nullable(),
})

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get("status")
  const type = searchParams.get("type")
  const employeeId = searchParams.get("employeeId")

  const isAdmin = ["SUPERADMIN", "ADMIN", "GERENTE"].includes(session.user.role ?? "")

  const where: any = {}
  if (status) where.status = status
  if (type) where.type = type
  if (employeeId) {
    where.employeeId = employeeId
  } else if (!isAdmin) {
    where.employeeId = session.user.employeeId
  }

  const vales = await prisma.vale.findMany({
    where,
    include: {
      employee: { select: { fullName: true, department: { select: { name: true } } } },
      project: { select: { name: true } },
      approvedBy: { select: { fullName: true } },
    },
    orderBy: [{ status: "asc" }, { date: "desc" }],
    take: 200,
  })

  return NextResponse.json(vales)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { date, ...rest } = parsed.data

  const vale = await prisma.vale.create({
    data: {
      ...rest,
      date: new Date(date),
    },
    include: {
      employee: { select: { fullName: true, department: { select: { name: true } } } },
      project: { select: { name: true } },
    },
  })

  return NextResponse.json(vale, { status: 201 })
}
