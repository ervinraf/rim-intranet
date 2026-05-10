import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const schema = z.object({
  toolId: z.string().optional(),
  equipmentId: z.string().optional(),
  description: z.string().min(1),
  priority: z.enum(["NORMAL", "URGENTE"]).default("NORMAL"),
})

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get("status")

  const repairs = await prisma.repairRequest.findMany({
    where: { ...(status ? { status: status as any } : {}) },
    include: {
      tool: { select: { name: true, code: true } },
      equipment: { select: { name: true, code: true } },
    },
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
  })

  return NextResponse.json(repairs)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  if (!parsed.data.toolId && !parsed.data.equipmentId) {
    return NextResponse.json({ error: "Se requiere herramienta o equipo" }, { status: 400 })
  }

  const repair = await prisma.repairRequest.create({
    data: {
      ...parsed.data,
      requestedById: session.user.employeeId ?? session.user.id,
    },
  })

  // Marcar el equipo como EN_REPARACION
  if (parsed.data.equipmentId) {
    await prisma.equipment.update({
      where: { id: parsed.data.equipmentId },
      data: { status: "EN_REPARACION" },
    })
  }
  if (parsed.data.toolId) {
    await prisma.tool.update({
      where: { id: parsed.data.toolId },
      data: { status: "EN_REPARACION" },
    })
  }

  return NextResponse.json(repair, { status: 201 })
}
