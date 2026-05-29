import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const isAdmin = ["SUPERADMIN", "ADMIN"].includes(session.user.role ?? "")
  if (!isAdmin) return NextResponse.json({ error: "Sin permiso" }, { status: 403 })

  const { id: salesProjectId } = await params
  const { amount, date, concept } = await req.json()

  if (!amount || !date) return NextResponse.json({ error: "Monto y fecha requeridos" }, { status: 400 })

  const payment = await prisma.salesPayment.create({
    data: {
      salesProjectId,
      amount: parseFloat(amount),
      date: new Date(date),
      concept: concept?.trim() || null,
    },
  })

  return NextResponse.json(payment, { status: 201 })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const isAdmin = ["SUPERADMIN", "ADMIN"].includes(session.user.role ?? "")
  if (!isAdmin) return NextResponse.json({ error: "Sin permiso" }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const paymentId = searchParams.get("paymentId")
  if (!paymentId) return NextResponse.json({ error: "paymentId requerido" }, { status: 400 })

  await prisma.salesPayment.delete({ where: { id: paymentId } })
  return NextResponse.json({ ok: true })
}
