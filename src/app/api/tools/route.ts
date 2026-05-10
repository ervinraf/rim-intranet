import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const schema = z.object({
  code: z.string().optional(),
  name: z.string().min(1),
  brand: z.string().optional(),
  model: z.string().optional(),
  serialNumber: z.string().optional(),
  condition: z.enum(["BUENA", "REGULAR", "MALA", "BAJA"]).default("BUENA"),
  departmentId: z.string().optional(),
  location: z.string().optional(),
  notes: z.string().optional(),
})

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const departmentId = searchParams.get("departmentId")
  const status = searchParams.get("status")
  const search = searchParams.get("search") ?? ""

  const tools = await prisma.tool.findMany({
    where: {
      isActive: true,
      ...(departmentId ? { departmentId } : {}),
      ...(status ? { status: status as any } : {}),
      ...(search ? {
        OR: [
          { name: { contains: search } },
          { code: { contains: search } },
          { brand: { contains: search } },
          { serialNumber: { contains: search } },
        ]
      } : {}),
    },
    include: {
      department: { select: { name: true } },
      checkouts: {
        where: { returnedAt: null },
        include: { employee: { select: { fullName: true } }, project: { select: { name: true } } },
        take: 1,
      },
    },
    orderBy: [{ status: "asc" }, { name: "asc" }],
  })

  return NextResponse.json(tools)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const isAdmin = ["SUPERADMIN", "ADMIN", "GERENTE"].includes(session.user.role ?? "")
  if (!isAdmin) return NextResponse.json({ error: "Sin permiso" }, { status: 403 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const tool = await prisma.tool.create({ data: parsed.data as any })
  return NextResponse.json(tool, { status: 201 })
}
