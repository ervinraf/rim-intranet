import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const isAdmin = ["SUPERADMIN", "ADMIN"].includes(session.user.role ?? "")
  if (!isAdmin) return NextResponse.json({ error: "Sin permiso" }, { status: 403 })

  const { id } = await params
  const body = await req.json()

  // Toggle a single item
  if (body.itemId !== undefined) {
    const item = await prisma.onboardingItem.findUnique({ where: { id: body.itemId } })
    if (!item || item.onboardingId !== id) {
      return NextResponse.json({ error: "Item no encontrado" }, { status: 404 })
    }
    const updated = await prisma.onboardingItem.update({
      where: { id: body.itemId },
      data: {
        done: !item.done,
        doneAt: !item.done ? new Date() : null,
        notes: body.notes ?? item.notes,
      },
    })
    // Check if all items done — auto-complete onboarding
    const siblings = await prisma.onboardingItem.findMany({ where: { onboardingId: id } })
    const allDone = siblings.every((s) => (s.id === updated.id ? updated.done : s.done))
    if (allDone) {
      await prisma.onboarding.update({ where: { id }, data: { completedAt: new Date() } })
    } else {
      await prisma.onboarding.update({ where: { id }, data: { completedAt: null } })
    }
    return NextResponse.json(updated)
  }

  // Update onboarding metadata
  const { notes, completedAt } = body
  const onboarding = await prisma.onboarding.update({
    where: { id },
    data: {
      ...(notes !== undefined ? { notes } : {}),
      ...(completedAt !== undefined ? { completedAt: completedAt ? new Date(completedAt) : null } : {}),
    },
    include: {
      employee: { select: { id: true, fullName: true, position: true, photoUrl: true, department: { select: { name: true } } } },
      items: { orderBy: [{ category: "asc" }, { createdAt: "asc" }] },
    },
  })
  return NextResponse.json(onboarding)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const isAdmin = ["SUPERADMIN", "ADMIN"].includes(session.user.role ?? "")
  if (!isAdmin) return NextResponse.json({ error: "Sin permiso" }, { status: 403 })

  const { id } = await params
  await prisma.onboarding.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
