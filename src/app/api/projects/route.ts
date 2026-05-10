import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const createSchema = z.object({
  name: z.string().min(1),
  clientName: z.string().min(1),
  clientEmail: z.string().email().optional().or(z.literal("")),
  location: z.string().optional(),
  description: z.string().optional(),
  startDate: z.string(),
  endDate: z.string().optional(),
  status: z.enum(["NUEVO", "EN_DESARROLLO", "CERRADO"]).default("NUEVO"),
})

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get("status")

  const projects = await prisma.project.findMany({
    where: {
      isActive: true,
      ...(status ? { status: status as any } : {}),
    },
    include: {
      tasks: { orderBy: { order: "asc" } },
      _count: { select: { photos: true, updates: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(projects)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const canCreate = ["SUPERADMIN", "ADMIN", "GERENTE"].includes(session.user.role ?? "")
  if (!canCreate) return NextResponse.json({ error: "Sin permiso" }, { status: 403 })

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { clientEmail, ...data } = parsed.data

  const project = await prisma.project.create({
    data: {
      ...data,
      clientEmail: clientEmail || null,
      startDate: new Date(data.startDate),
      endDate: data.endDate ? new Date(data.endDate) : null,
      createdById: session.user.employeeId ?? session.user.id,
    },
  })

  return NextResponse.json(project, { status: 201 })
}
