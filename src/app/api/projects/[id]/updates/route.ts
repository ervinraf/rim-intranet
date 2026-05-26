import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id: projectId } = await params
  const { note } = await req.json()

  if (!note?.trim()) return NextResponse.json({ error: "La nota no puede estar vacia" }, { status: 400 })

  const update = await prisma.projectUpdate.create({
    data: {
      projectId,
      note: note.trim(),
      createdById: session.user.employeeId ?? session.user.id,
    },
  })

  return NextResponse.json(update, { status: 201 })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id: projectId } = await params
  const { updateId, note } = await req.json()

  if (!note?.trim()) return NextResponse.json({ error: "La nota no puede estar vacia" }, { status: 400 })

  const updated = await prisma.projectUpdate.update({
    where: { id: updateId, projectId },
    data: { note: note.trim() },
  })

  return NextResponse.json(updated)
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id: projectId } = await params
  const { searchParams } = new URL(req.url)
  const updateId = searchParams.get("updateId")

  if (!updateId) return NextResponse.json({ error: "updateId requerido" }, { status: 400 })

  await prisma.projectUpdate.delete({ where: { id: updateId, projectId } })

  return NextResponse.json({ ok: true })
}
