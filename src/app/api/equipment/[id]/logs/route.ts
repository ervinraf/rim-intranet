import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const schema = z.object({
  type: z.enum(["SERVICIO", "INSPECCION", "INCIDENCIA", "ENTREGA", "RECEPCION", "REPARACION"]),
  description: z.string().min(1),
  projectId: z.string().optional(),
})

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id: equipmentId } = await params
  const logs = await prisma.equipmentLog.findMany({
    where: { equipmentId },
    include: { project: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(logs)
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id: equipmentId } = await params
  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const log = await prisma.equipmentLog.create({
    data: {
      equipmentId,
      type: parsed.data.type,
      description: parsed.data.description,
      projectId: parsed.data.projectId ?? null,
      createdById: session.user.employeeId ?? session.user.id,
    },
  })

  // Actualizar estado del equipo segun el tipo de log
  const statusMap: Record<string, any> = {
    ENTREGA: { status: "EN_PROYECTO" },
    RECEPCION: { status: "DISPONIBLE" },
    REPARACION: { status: "EN_REPARACION" },
  }
  if (statusMap[parsed.data.type]) {
    await prisma.equipment.update({
      where: { id: equipmentId },
      data: statusMap[parsed.data.type],
    })
  }

  return NextResponse.json(log, { status: 201 })
}
