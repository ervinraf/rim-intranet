import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const vehicles = await prisma.vehicle.findMany({
    where: { isActive: true },
    include: {
      driver: { select: { fullName: true, licenciaNumero: true, licenciaVencimiento: true } },
      maintenanceLogs: { orderBy: { date: "desc" }, take: 3 },
      checklists: { orderBy: { date: "desc" }, take: 1, include: { items: true } },
    },
    orderBy: { brand: "asc" },
  })

  return NextResponse.json(vehicles)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const isAdmin = ["SUPERADMIN", "ADMIN", "GERENTE"].includes(session.user.role ?? "")
  if (!isAdmin) return NextResponse.json({ error: "Sin permiso" }, { status: 403 })

  const { brand, model, year, plates, permit, driverId, notes } = await req.json()

  if (!brand?.trim() || !model?.trim()) {
    return NextResponse.json({ error: "Marca y modelo son requeridos" }, { status: 400 })
  }

  const vehicle = await prisma.vehicle.create({
    data: {
      brand: brand.trim(),
      model: model.trim(),
      year: year ? parseInt(year) : null,
      plates: plates?.trim() || null,
      permit: permit?.trim() || null,
      driverId: driverId || null,
      notes: notes?.trim() || null,
    },
    include: {
      driver: { select: { fullName: true, licenciaNumero: true, licenciaVencimiento: true } },
      maintenanceLogs: true,
      checklists: true,
    },
  })

  return NextResponse.json(vehicle, { status: 201 })
}
