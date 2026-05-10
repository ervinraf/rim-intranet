import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { resolveDocumentAccess } from "@/lib/document-access"
import { uploadFile } from "@/lib/storage"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const departmentId = searchParams.get("departmentId")
  const categoryId = searchParams.get("categoryId")
  const search = searchParams.get("search") ?? ""

  const isAdmin = ["SUPERADMIN", "ADMIN"].includes(session.user.role ?? "")
  const employeeId = session.user.employeeId

  // Obtener el departamento del usuario
  let userDeptId: string | null = null
  if (employeeId && !isAdmin) {
    const emp = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: { departmentId: true },
    })
    userDeptId = emp?.departmentId ?? null
  }

  // Documentos que el usuario puede ver
  const documents = await prisma.document.findMany({
    where: {
      isActive: true,
      ...(departmentId ? { departmentId } : {}),
      ...(categoryId ? { categoryId } : {}),
      ...(search ? { name: { contains: search } } : {}),
      // Si no es admin, filtrar por departamento propio o permisos individuales
      ...(!isAdmin
        ? {
            OR: [
              { departmentId: userDeptId ?? "__none__" },
              {
                permissions: {
                  some: { employeeId: employeeId ?? "__none__" },
                },
              },
            ],
          }
        : {}),
    },
    include: {
      department: { select: { name: true } },
      category: { select: { name: true } },
      permissions: employeeId
        ? { where: { employeeId }, select: { level: true } }
        : false,
      versions: { orderBy: { version: "desc" }, take: 1 },
      _count: { select: { versions: true } },
    },
    orderBy: [{ departmentId: "asc" }, { name: "asc" }],
  })

  // Enriquecer con nivel de acceso efectivo
  const enriched = documents.map((doc) => {
    const individual = (doc as any).permissions?.[0]?.level ?? null
    const effectiveLevel = resolveDocumentAccess({
      userRole: session.user.role ?? "",
      userDepartmentId: userDeptId,
      documentDepartmentId: doc.departmentId,
      individualPermission: individual,
    })
    return { ...doc, effectiveLevel, permissions: undefined }
  })

  return NextResponse.json(enriched)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const canUpload = ["SUPERADMIN", "ADMIN", "GERENTE"].includes(session.user.role ?? "")
  if (!canUpload) return NextResponse.json({ error: "Sin permiso para subir documentos" }, { status: 403 })

  const formData = await req.formData()
  const file = formData.get("file") as File | null
  const name = formData.get("name") as string
  const description = formData.get("description") as string | null
  const departmentId = formData.get("departmentId") as string | null
  const categoryId = formData.get("categoryId") as string | null

  if (!file || !name) {
    return NextResponse.json({ error: "Se requiere archivo y nombre" }, { status: 400 })
  }

  const maxSize = 50 * 1024 * 1024 // 50MB
  if (file.size > maxSize) {
    return NextResponse.json({ error: "El archivo no puede superar 50MB" }, { status: 400 })
  }

  const folder = departmentId ?? "general"
  const ext = file.name.split(".").pop() ?? "bin"
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const fileUrl = await uploadFile(file, `documents/${folder}`, filename)

  const document = await prisma.document.create({
    data: {
      name,
      description: description || null,
      fileName: file.name,
      fileUrl,
      fileSize: file.size,
      mimeType: file.type,
      departmentId: departmentId || null,
      categoryId: categoryId || null,
      uploadedById: session.user.employeeId ?? session.user.id,
      version: 1,
    },
    include: {
      department: { select: { name: true } },
      category: { select: { name: true } },
    },
  })

  // Primera entrada en historial de versiones
  await prisma.documentVersion.create({
    data: {
      documentId: document.id,
      version: 1,
      fileName: file.name,
      fileUrl,
      uploadedById: session.user.employeeId ?? session.user.id,
      note: "Version inicial",
    },
  })

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: "CREAR",
      module: "documents",
      entityId: document.id,
      entityType: "Document",
      newData: JSON.parse(JSON.stringify({ name, departmentId })),
    },
  })

  return NextResponse.json(document, { status: 201 })
}
