import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const schema = z.object({
  employeeId: z.string(),
  itemId: z.string(),
  brand: z.string().optional(),
  size: z.string().optional(),
  quantity: z.number().int().positive().default(1),
  condition: z.enum(["BUENA", "REGULAR", "MALA", "BAJA"]).default("BUENA"),
  notes: z.string().optional(),
})

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const employeeId = searchParams.get("employeeId")
  const departmentId = searchParams.get("departmentId")
  const isAdmin = ["SUPERADMIN", "ADMIN", "GERENTE"].includes(session.user.role ?? "")

  const records = await prisma.ePPRecord.findMany({
    where: {
      returnedAt: null,
      ...(employeeId ? { employeeId } : {}),
      ...(departmentId ? { employee: { departmentId } } : {}),
      ...(!isAdmin && !employeeId
        ? { employeeId: session.user.employeeId ?? "__none__" }
        : {}),
    },
    include: {
      item: { select: { name: true } },
      employee: { select: { fullName: true, department: { select: { name: true } } } },
    },
    orderBy: [{ employeeId: "asc" }, { issuedAt: "desc" }],
  })

  return NextResponse.json(records)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const isAdmin = ["SUPERADMIN", "ADMIN", "GERENTE"].includes(session.user.role ?? "")
  if (!isAdmin) return NextResponse.json({ error: "Sin permiso" }, { status: 403 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const record = await prisma.ePPRecord.create({
    data: {
      ...parsed.data,
      issuedById: session.user.employeeId ?? null,
    },
    include: {
      item: { select: { name: true } },
      employee: { select: { fullName: true, department: { select: { name: true } } } },
    },
  })

  return NextResponse.json(record, { status: 201 })
}
