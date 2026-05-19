import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const itemSchema = z.object({ description: z.string().min(1), order: z.number().optional().nullable() })

const createSchema = z.object({
  title: z.string().min(1),
  type: z.enum(["OPERATIVO", "SEGURIDAD", "MANTENIMIENTO", "INSPECCION"]).default("OPERATIVO"),
  projectId: z.string().optional().nullable(),
  equipmentId: z.string().optional().nullable(),
  items: z.array(itemSchema).min(1),
})

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get("projectId")
  const equipmentId = searchParams.get("equipmentId")
  const type = searchParams.get("type")

  const lists = await prisma.checkList.findMany({
    where: {
      isActive: true,
      ...(projectId ? { projectId } : {}),
      ...(equipmentId ? { equipmentId } : {}),
      ...(type ? { type: type as any } : {}),
    },
    include: {
      items: { orderBy: { order: "asc" } },
      project: { select: { name: true } },
      equipment: { select: { name: true } },
      createdBy: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  })

  return NextResponse.json(lists)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { items, ...rest } = parsed.data

  const list = await prisma.checkList.create({
    data: {
      ...rest,
      createdById: session.user.id,
      items: {
        create: items.map((item, i) => ({
          description: item.description,
          order: item.order ?? i,
        })),
      },
    },
    include: {
      items: { orderBy: { order: "asc" } },
      project: { select: { name: true } },
      equipment: { select: { name: true } },
    },
  })

  return NextResponse.json(list, { status: 201 })
}
