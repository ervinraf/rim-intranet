import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const isAdmin = ["SUPERADMIN", "ADMIN", "GERENTE"].includes(session.user.role ?? "")
  if (!isAdmin) return NextResponse.json({ error: "Sin permiso" }, { status: 403 })

  const { id: vehicleId } = await params
  const { type, description, cost, date, technician, notes } = await req.json()

  if (!type || !description?.trim() || !date) {
    return NextResponse.json({ error: "Tipo, descripcion y fecha son requeridos" }, { status: 400 })
  }

  const log = await prisma.vehicleMaintenanceLog.create({
    data: {
      vehicleId,
      type,
      description: description.trim(),
      cost: cost ? parseFloat(cost) : null,
      date: new Date(date),
      technician: technician?.trim() || null,
      notes: notes?.trim() || null,
      createdById: session.user.id,
    },
  })

  return NextResponse.json(log, { status: 201 })
}
