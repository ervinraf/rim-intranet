import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { uploadFile } from "@/lib/storage"

export async function GET() {
  const config = await prisma.systemConfig.findUnique({ where: { key: "company_logo" } })
  return NextResponse.json({ url: config?.value ?? null })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const isAdmin = ["SUPERADMIN", "ADMIN"].includes(session.user.role ?? "")
  if (!isAdmin) return NextResponse.json({ error: "Sin permiso" }, { status: 403 })

  const formData = await req.formData()
  const file = formData.get("file") as File | null

  if (!file) return NextResponse.json({ error: "No se recibio archivo" }, { status: 400 })
  if (!file.type.startsWith("image/")) return NextResponse.json({ error: "Solo imagenes" }, { status: 400 })
  if (file.size > 2 * 1024 * 1024) return NextResponse.json({ error: "Max 2MB" }, { status: 400 })

  const ext = file.name.split(".").pop() ?? "png"
  const url = await uploadFile(file, "system", `logo.${ext}`)

  await prisma.systemConfig.upsert({
    where: { key: "company_logo" },
    update: { value: url },
    create: { key: "company_logo", value: url, description: "Logo de la empresa" },
  })

  return NextResponse.json({ url })
}
