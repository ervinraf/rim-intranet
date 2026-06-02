import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { uploadFile } from "@/lib/storage"

const DOC_FIELDS = {
  tarjeta: { urlField: "tarjetaCirculacionUrl", nameField: "tarjetaCirculacionName" },
  permiso:  { urlField: "permisoDocUrl",         nameField: "permisoDocName" },
  poliza:   { urlField: "polizaDocUrl",           nameField: "polizaDocName" },
} as const

type DocType = keyof typeof DOC_FIELDS

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const isAdmin = ["SUPERADMIN", "ADMIN", "GERENTE"].includes(session.user.role ?? "")
  if (!isAdmin) return NextResponse.json({ error: "Sin permiso" }, { status: 403 })

  const { id } = await params
  const type = req.nextUrl.searchParams.get("type") as DocType | null
  if (!type || !(type in DOC_FIELDS)) {
    return NextResponse.json({ error: "Tipo de documento invalido" }, { status: 400 })
  }

  const formData = await req.formData()
  const file = formData.get("file") as File | null
  if (!file) return NextResponse.json({ error: "Archivo requerido" }, { status: 400 })
  if (file.size > 20 * 1024 * 1024) return NextResponse.json({ error: "El archivo no puede superar 20MB" }, { status: 400 })

  const ext = file.name.split(".").pop() ?? "pdf"
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const url = await uploadFile(file, "vehicle-docs", filename)

  const { urlField, nameField } = DOC_FIELDS[type]
  await prisma.vehicle.update({
    where: { id },
    data: { [urlField]: url, [nameField]: file.name },
  })

  return NextResponse.json({ url, fileName: file.name })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const isAdmin = ["SUPERADMIN", "ADMIN", "GERENTE"].includes(session.user.role ?? "")
  if (!isAdmin) return NextResponse.json({ error: "Sin permiso" }, { status: 403 })

  const { id } = await params
  const type = req.nextUrl.searchParams.get("type") as DocType | null
  if (!type || !(type in DOC_FIELDS)) {
    return NextResponse.json({ error: "Tipo invalido" }, { status: 400 })
  }

  const { urlField, nameField } = DOC_FIELDS[type]
  await prisma.vehicle.update({
    where: { id },
    data: { [urlField]: null, [nameField]: null },
  })

  return NextResponse.json({ ok: true })
}
