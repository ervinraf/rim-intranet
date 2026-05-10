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

  const { id } = await params
  const vale = await prisma.vale.findUnique({ where: { id } })
  if (!vale) return NextResponse.json({ error: "Vale no encontrado" }, { status: 404 })

  const isAdmin = ["SUPERADMIN", "ADMIN", "GERENTE"].includes(session.user.role ?? "")
  const isOwner = vale.employeeId === session.user.employeeId
  if (!isAdmin && !isOwner) return NextResponse.json({ error: "Sin permiso" }, { status: 403 })

  const formData = await req.formData()
  const file = formData.get("file") as File | null
  if (!file) return NextResponse.json({ error: "No se recibio archivo" }, { status: 400 })

  const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf"]
  if (!allowed.includes(file.type)) return NextResponse.json({ error: "Solo JPG, PNG, WebP o PDF" }, { status: 400 })
  if (file.size > 5 * 1024 * 1024) return NextResponse.json({ error: "Max 5MB" }, { status: 400 })

  const ext = file.name.split(".").pop() ?? "jpg"
  const filename = `${id}.${ext}`
  const url = await uploadFile(file, "vales", filename)

  await prisma.vale.update({ where: { id }, data: { receiptUrl: url } })
  return NextResponse.json({ url })
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
  await prisma.vale.update({ where: { id }, data: { receiptUrl: null } })
  return NextResponse.json({ ok: true })
}
