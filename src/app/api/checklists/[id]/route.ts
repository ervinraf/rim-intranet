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
  const body = await req.json()

  // Marcar item como completado
  if (body.itemId !== undefined) {
    const item = await prisma.checkListItem.update({
      where: { id: body.itemId },
      data: {
        isCompleted: body.isCompleted,
        completedAt: body.isCompleted ? new Date() : null,
        completedById: body.isCompleted ? session.user.id : null,
      },
    })

    // Si todos los items estan completos, marcar checklist como completado
    const list = await prisma.checkList.findUnique({
      where: { id },
      include: { items: true },
    })
    if (list && list.items.every((i) => i.isCompleted)) {
      await prisma.checkList.update({
        where: { id },
        data: { completedAt: new Date() },
      })
    }

    return NextResponse.json(item)
  }

  // Archivar checklist
  if (body.isActive !== undefined) {
    const list = await prisma.checkList.update({
      where: { id },
      data: { isActive: body.isActive },
    })
    return NextResponse.json(list)
  }

  return NextResponse.json({ error: "Sin cambios validos" }, { status: 400 })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const isAdmin = ["SUPERADMIN", "ADMIN"].includes(session.user.role ?? "")
  if (!isAdmin) return NextResponse.json({ error: "Sin permiso" }, { status: 403 })

  const { id } = await params
  await prisma.checkList.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
