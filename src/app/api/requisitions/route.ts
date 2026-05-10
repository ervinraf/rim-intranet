import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const itemSchema = z.object({
  name: z.string(),
  quantity: z.number().positive(),
  unit: z.string().optional(),
  notes: z.string().optional(),
})

const schema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  items: z.array(itemSchema).min(1),
  priority: z.enum(["NORMAL", "URGENTE"]).default("NORMAL"),
  departmentId: z.string().optional(),
  projectId: z.string().optional(),
})

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get("status")
  const isAdmin = ["SUPERADMIN", "ADMIN", "GERENTE"].includes(session.user.role ?? "")

  const reqs = await prisma.purchaseRequisition.findMany({
    where: {
      ...(status ? { status: status as any } : {}),
      ...(!isAdmin ? { requestedById: session.user.employeeId ?? "__none__" } : {}),
    },
    include: {
      department: { select: { name: true } },
      project: { select: { name: true } },
    },
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
  })

  return NextResponse.json(reqs)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const req2 = await prisma.purchaseRequisition.create({
    data: {
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      items: parsed.data.items,
      priority: parsed.data.priority,
      departmentId: parsed.data.departmentId ?? null,
      projectId: parsed.data.projectId ?? null,
      requestedById: session.user.employeeId ?? session.user.id,
    },
  })

  return NextResponse.json(req2, { status: 201 })
}
