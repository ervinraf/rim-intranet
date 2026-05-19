import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { uploadFile } from "@/lib/storage"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const isAdmin = ["SUPERADMIN", "ADMIN", "GERENTE"].includes(session.user.role ?? "")
  if (!isAdmin) return NextResponse.json({ error: "Sin permiso" }, { status: 403 })

  const formData = await req.formData()
  const file = formData.get("file") as File | null
  const folder = (formData.get("folder") as string | null) ?? "uploads"

  if (!file) return NextResponse.json({ error: "Archivo requerido" }, { status: 400 })

  const maxSize = 10 * 1024 * 1024 // 10MB
  if (file.size > maxSize) return NextResponse.json({ error: "Maximo 10MB" }, { status: 400 })

  const ext = file.name.split(".").pop() ?? "bin"
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const url = await uploadFile(file, folder, filename)

  return NextResponse.json({ url })
}
