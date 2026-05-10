import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id } = await params
  const { status, resolution, cost } = await req.json()

  const repair = await prisma.repairRequest.findUnique({ where: { id } })
  if (!repair) return NextResponse.json({ error: "No encontrada" }, { status: 404 })

  const updated = await prisma.repairRequest.update({
    where: { id },
    data: {
      status,
      resolution: resolution ?? null,
      resolvedAt: status === "SURTIDO" ? new Date() : null,
    },
  })

  // Si se resuelve, liberar el activo
  if (status === "SURTIDO") {
    if (repair.toolId) {
      await prisma.tool.update({ where: { id: repair.toolId }, data: { status: "DISPONIBLE" } })
    }
    if (repair.equipmentId) {
      await prisma.equipment.update({ where: { id: repair.equipmentId }, data: { status: "DISPONIBLE" } })
    }
  }

  return NextResponse.json(updated)
}
