import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const isAdmin = ["SUPERADMIN", "ADMIN"].includes(session.user.role ?? "")
  if (!isAdmin) return NextResponse.json({ error: "Sin permiso" }, { status: 403 })

  const { id } = await params
  const body = await req.json()
  const { name, clientName, concept, status, servicePrice, invoiceNumber, invoiceDate,
          paymentType, advanceAmount, promiseDate, notes } = body

  const updated = await prisma.salesProject.update({
    where: { id },
    data: {
      ...(name !== undefined && { name: name.trim() }),
      ...(clientName !== undefined && { clientName: clientName.trim() }),
      ...(concept !== undefined && { concept: concept?.trim() || null }),
      ...(status !== undefined && { status }),
      ...(servicePrice !== undefined && { servicePrice: servicePrice ? parseFloat(servicePrice) : null }),
      ...(invoiceNumber !== undefined && { invoiceNumber: invoiceNumber?.trim() || null }),
      ...(invoiceDate !== undefined && { invoiceDate: invoiceDate ? new Date(invoiceDate) : null }),
      ...(paymentType !== undefined && { paymentType }),
      ...(advanceAmount !== undefined && { advanceAmount: advanceAmount ? parseFloat(advanceAmount) : null }),
      ...(promiseDate !== undefined && { promiseDate: promiseDate ? new Date(promiseDate) : null }),
      ...(notes !== undefined && { notes: notes?.trim() || null }),
    },
    include: { payments: { orderBy: { date: "desc" } } },
  })

  return NextResponse.json(updated)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const isAdmin = ["SUPERADMIN", "ADMIN"].includes(session.user.role ?? "")
  if (!isAdmin) return NextResponse.json({ error: "Sin permiso" }, { status: 403 })

  const { id } = await params
  await prisma.salesProject.update({ where: { id }, data: { isActive: false } })
  return NextResponse.json({ ok: true })
}
