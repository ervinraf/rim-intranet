import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { del } from "@vercel/blob"

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const isAdmin = ["SUPERADMIN", "ADMIN"].includes(session.user.role ?? "")
  if (!isAdmin) return NextResponse.json({ error: "Sin permiso" }, { status: 403 })

  const { id } = await params

  const doc = await prisma.document.findUnique({ where: { id } })
  if (!doc) return NextResponse.json({ error: "No encontrado" }, { status: 404 })

  // Delete blob if stored in Vercel Blob
  if (doc.fileUrl && doc.fileUrl.includes("vercel-storage.com")) {
    try { await del(doc.fileUrl) } catch { /* ignore if already deleted */ }
  }

  await prisma.document.delete({ where: { id } })

  return NextResponse.json({ ok: true })
}
