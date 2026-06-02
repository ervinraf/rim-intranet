import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const isAdmin = ["SUPERADMIN", "ADMIN", "GERENTE"].includes(session.user.role ?? "")
  if (!isAdmin) return NextResponse.json({ error: "Sin permiso" }, { status: 403 })

  const { id } = await params
  const body = await req.json()

  const updated = await prisma.vehicle.update({
    where: { id },
    data: {
      ...(body.brand !== undefined && { brand: body.brand.trim() }),
      ...(body.model !== undefined && { model: body.model.trim() }),
      ...(body.year !== undefined && { year: body.year ? parseInt(body.year) : null }),
      ...(body.plates !== undefined && { plates: body.plates?.trim() || null }),
      ...(body.permit !== undefined && { permit: body.permit?.trim() || null }),
      ...(body.driverId !== undefined && { driverId: body.driverId || null }),
      ...(body.status !== undefined && { status: body.status }),
      ...(body.notes !== undefined && { notes: body.notes?.trim() || null }),
      ...(body.verificacionFecha !== undefined && { verificacionFecha: body.verificacionFecha ? new Date(body.verificacionFecha) : null }),
      ...(body.verificacionVigencia !== undefined && { verificacionVigencia: body.verificacionVigencia ? new Date(body.verificacionVigencia) : null }),
      ...(body.tenenciaAnio !== undefined && { tenenciaAnio: body.tenenciaAnio ? parseInt(body.tenenciaAnio) : null }),
      ...(body.tenenciaFechaPago !== undefined && { tenenciaFechaPago: body.tenenciaFechaPago ? new Date(body.tenenciaFechaPago) : null }),
      ...(body.tenenciaMonto !== undefined && { tenenciaMonto: body.tenenciaMonto ? parseFloat(body.tenenciaMonto) : null }),
      ...(body.tipo !== undefined && { tipo: body.tipo || "OTRO" }),
      ...(body.numeroSerie !== undefined && { numeroSerie: body.numeroSerie?.trim() || null }),
      ...(body.numeroMotor !== undefined && { numeroMotor: body.numeroMotor?.trim() || null }),
      ...(body.cantidadLlantas !== undefined && { cantidadLlantas: body.cantidadLlantas ? parseInt(body.cantidadLlantas) : null }),
      ...(body.polizaNumero !== undefined && { polizaNumero: body.polizaNumero?.trim() || null }),
      ...(body.polizaVigencia !== undefined && { polizaVigencia: body.polizaVigencia ? new Date(body.polizaVigencia) : null }),
    },
    include: {
      driver: { select: { fullName: true, licenciaNumero: true, licenciaVencimiento: true } },
      maintenanceLogs: { orderBy: { date: "desc" }, take: 3 },
      checklists: { orderBy: { date: "desc" }, take: 1, include: { items: true } },
    },
  })

  return NextResponse.json(updated)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const isAdmin = ["SUPERADMIN", "ADMIN"].includes(session.user.role ?? "")
  if (!isAdmin) return NextResponse.json({ error: "Sin permiso" }, { status: 403 })

  const { id } = await params
  await prisma.vehicle.update({ where: { id }, data: { isActive: false } })
  return NextResponse.json({ ok: true })
}
