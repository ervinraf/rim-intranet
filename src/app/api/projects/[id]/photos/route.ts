import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { uploadFile } from "@/lib/storage"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id: projectId } = await params

  const formData = await req.formData()
  const file = formData.get("file") as File | null
  const taskId = formData.get("taskId") as string | null
  const caption = formData.get("caption") as string | null

  if (!file) return NextResponse.json({ error: "No se recibio archivo" }, { status: 400 })

  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Solo se permiten imagenes" }, { status: 400 })
  }

  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "La imagen no puede superar 10MB" }, { status: 400 })
  }

  const ext = file.name.split(".").pop() ?? "jpg"
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const url = await uploadFile(file, `projects/${projectId}`, filename)

  const photo = await prisma.projectPhoto.create({
    data: {
      projectId,
      taskId: taskId || null,
      url,
      caption: caption || null,
      uploadedById: session.user.employeeId ?? session.user.id,
    },
  })

  return NextResponse.json(photo, { status: 201 })
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params
  const { searchParams } = new URL(req.url)
  const taskId = searchParams.get("taskId")

  const photos = await prisma.projectPhoto.findMany({
    where: { projectId, ...(taskId ? { taskId } : {}) },
    orderBy: { takenAt: "desc" },
  })

  return NextResponse.json(photos)
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const isAdmin = ["SUPERADMIN", "ADMIN"].includes(session.user.role ?? "")
  if (!isAdmin) return NextResponse.json({ error: "Sin permiso" }, { status: 403 })

  const { id: projectId } = await params
  const { searchParams } = new URL(req.url)
  const photoId = searchParams.get("photoId")
  if (!photoId) return NextResponse.json({ error: "photoId requerido" }, { status: 400 })

  const photo = await prisma.projectPhoto.findUnique({ where: { id: photoId } })
  if (!photo || photo.projectId !== projectId) {
    return NextResponse.json({ error: "Foto no encontrada" }, { status: 404 })
  }

  await prisma.projectPhoto.delete({ where: { id: photoId } })
  return NextResponse.json({ ok: true })
}
