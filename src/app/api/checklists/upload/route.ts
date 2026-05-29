import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { uploadFile } from "@/lib/storage"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const isAdmin = ["SUPERADMIN", "ADMIN", "GERENTE"].includes(session.user.role ?? "")
  if (!isAdmin) return NextResponse.json({ error: "Sin permiso" }, { status: 403 })

  const formData = await req.formData()
  const file = formData.get("file") as File | null
  const checklistId = formData.get("checklistId") as string | null

  if (!file || !checklistId) {
    return NextResponse.json({ error: "Archivo y checklistId requeridos" }, { status: 400 })
  }

  if (file.size > 20 * 1024 * 1024) {
    return NextResponse.json({ error: "El archivo no puede superar 20MB" }, { status: 400 })
  }

  const ext = file.name.split(".").pop() ?? "pdf"
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const url = await uploadFile(file, "checklists", filename)

  const updated = await prisma.checkList.update({
    where: { id: checklistId },
    data: { fileUrl: url, fileName: file.name },
  })

  return NextResponse.json({ url, fileName: file.name, id: updated.id })
}
