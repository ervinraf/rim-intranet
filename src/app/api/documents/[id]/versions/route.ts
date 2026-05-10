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

  const doc = await prisma.document.findUnique({ where: { id } })
  if (!doc) return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 })

  const formData = await req.formData()
  const file = formData.get("file") as File | null
  const note = formData.get("note") as string | null

  if (!file) return NextResponse.json({ error: "Se requiere archivo" }, { status: 400 })

  const folder = doc.departmentId ?? "general"
  const ext = file.name.split(".").pop() ?? "bin"
  const filename = `${Date.now()}-v${doc.version + 1}.${ext}`
  const fileUrl = await uploadFile(file, `documents/${folder}`, filename)
  const newVersion = doc.version + 1

  await prisma.$transaction([
    prisma.document.update({
      where: { id },
      data: {
        fileName: file.name,
        fileUrl,
        fileSize: file.size,
        mimeType: file.type,
        version: newVersion,
        updatedAt: new Date(),
      },
    }),
    prisma.documentVersion.create({
      data: {
        documentId: id,
        version: newVersion,
        fileName: file.name,
        fileUrl,
        uploadedById: session.user.employeeId ?? session.user.id,
        note: note || null,
      },
    }),
  ])

  return NextResponse.json({ ok: true, version: newVersion })
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id } = await params
  const versions = await prisma.documentVersion.findMany({
    where: { documentId: id },
    orderBy: { version: "desc" },
  })

  return NextResponse.json(versions)
}
