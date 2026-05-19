import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id } = await params
  const equipment = await prisma.equipment.findUnique({
    where: { id },
    include: {
      department: { select: { name: true } },
      project: { select: { name: true } },
      logs: { orderBy: { createdAt: "desc" }, take: 20 },
    },
  })

  if (!equipment) return NextResponse.json({ error: "No encontrado" }, { status: 404 })
  return NextResponse.json(equipment)
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const isAdmin = ["SUPERADMIN", "ADMIN", "GERENTE"].includes(session.user.role ?? "")
  if (!isAdmin) return NextResponse.json({ error: "Sin permiso" }, { status: 403 })

  const { id } = await params
  const body = await req.json()

  const { nextServiceDate, purchaseDate, technicalSpecs, purchasePrice, ...rest } = body

  const updated = await prisma.equipment.update({
    where: { id },
    data: {
      ...rest,
      ...(technicalSpecs !== undefined ? { technicalSpecs } : {}),
      ...(purchasePrice !== undefined ? { purchasePrice: purchasePrice ? parseFloat(purchasePrice) : null } : {}),
      ...(nextServiceDate !== undefined ? { nextServiceDate: nextServiceDate ? new Date(nextServiceDate) : null } : {}),
      ...(purchaseDate !== undefined ? { purchaseDate: purchaseDate ? new Date(purchaseDate) : null } : {}),
    },
    include: {
      department: { select: { name: true } },
      project: { select: { name: true } },
      logs: { orderBy: { createdAt: "desc" }, take: 3 },
    },
  })

  return NextResponse.json(updated)
}
