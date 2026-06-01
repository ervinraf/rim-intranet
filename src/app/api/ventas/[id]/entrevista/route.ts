import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { uploadFile } from "@/lib/storage"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const isAdmin = ["SUPERADMIN", "ADMIN"].includes(session.user.role ?? "")
  if (!isAdmin) return NextResponse.json({ error: "Sin permiso" }, { status: 403 })

  const { id } = await params
  const formData = await req.formData()
  const file = formData.get("file") as File | null

  if (!file) return NextResponse.json({ error: "Archivo requerido" }, { status: 400 })
  if (file.size > 20 * 1024 * 1024) return NextResponse.json({ error: "El archivo no puede superar 20MB" }, { status: 400 })

  const ext = file.name.split(".").pop() ?? "pdf"
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const url = await uploadFile(file, "entrevistas", filename)

  await prisma.salesProject.update({
    where: { id },
    data: { entrevistaFileUrl: url, entrevistaFileName: file.name },
  })

  return NextResponse.json({ url, fileName: file.name })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const isAdmin = ["SUPERADMIN", "ADMIN"].includes(session.user.role ?? "")
  if (!isAdmin) return NextResponse.json({ error: "Sin permiso" }, { status: 403 })

  const { id } = await params
  await prisma.salesProject.update({
    where: { id },
    data: { entrevistaFileUrl: null, entrevistaFileName: null },
  })

  return NextResponse.json({ ok: true })
}
