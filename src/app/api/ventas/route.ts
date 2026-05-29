import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const projects = await prisma.salesProject.findMany({
    where: { isActive: true },
    include: { payments: { orderBy: { date: "desc" } } },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(projects)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const isAdmin = ["SUPERADMIN", "ADMIN"].includes(session.user.role ?? "")
  if (!isAdmin) return NextResponse.json({ error: "Sin permiso" }, { status: 403 })

  const body = await req.json()
  const { name, clientName, concept, status, servicePrice, invoiceNumber, invoiceDate,
          paymentType, advanceAmount, promiseDate, notes } = body

  if (!name?.trim() || !clientName?.trim()) {
    return NextResponse.json({ error: "Nombre y cliente son requeridos" }, { status: 400 })
  }

  const project = await prisma.salesProject.create({
    data: {
      name: name.trim(),
      clientName: clientName.trim(),
      concept: concept?.trim() || null,
      status: status || "NUEVO",
      servicePrice: servicePrice ? parseFloat(servicePrice) : null,
      invoiceNumber: invoiceNumber?.trim() || null,
      invoiceDate: invoiceDate ? new Date(invoiceDate) : null,
      paymentType: paymentType || "CREDITO",
      advanceAmount: advanceAmount ? parseFloat(advanceAmount) : null,
      promiseDate: promiseDate ? new Date(promiseDate) : null,
      notes: notes?.trim() || null,
      createdById: session.user.id,
    },
    include: { payments: true },
  })

  return NextResponse.json(project, { status: 201 })
}
