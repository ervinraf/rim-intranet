import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { writeFile, mkdir } from "fs/promises"
import path from "path"

const schema = z.object({
  employeeId: z.string(),
  courseName: z.string().min(1),
  institution: z.string().optional(),
  instructor: z.string().optional(),
  hours: z.number().int().positive().optional(),
  completedAt: z.string(),
  expiresAt: z.string().optional(),
  notes: z.string().optional(),
})

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const employeeId = searchParams.get("employeeId")
  const departmentId = searchParams.get("departmentId")
  const expiringSoon = searchParams.get("expiringSoon") === "true"
  const isAdmin = ["SUPERADMIN", "ADMIN", "GERENTE"].includes(session.user.role ?? "")

  // Umbral de "por vencer": 60 dias
  const threshold = new Date()
  threshold.setDate(threshold.getDate() + 60)

  const records = await prisma.dC3Record.findMany({
    where: {
      isActive: true,
      ...(employeeId ? { employeeId } : {}),
      ...(departmentId ? { employee: { departmentId } } : {}),
      ...(expiringSoon
        ? { expiresAt: { lte: threshold, gte: new Date() } }
        : {}),
      ...(!isAdmin && !employeeId
        ? { employeeId: session.user.employeeId ?? "__none__" }
        : {}),
    },
    include: {
      employee: {
        select: {
          fullName: true,
          department: { select: { name: true } },
        },
      },
    },
    orderBy: [{ expiresAt: "asc" }, { completedAt: "desc" }],
  })

  // Anotar estatus de vencimiento
  const now = new Date()
  const enriched = records.map((r) => ({
    ...r,
    expiryStatus: !r.expiresAt
      ? "NO_VENCE"
      : new Date(r.expiresAt) < now
      ? "VENCIDO"
      : new Date(r.expiresAt) <= threshold
      ? "POR_VENCER"
      : "VIGENTE",
  }))

  return NextResponse.json(enriched)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const isAdmin = ["SUPERADMIN", "ADMIN", "GERENTE"].includes(session.user.role ?? "")
  if (!isAdmin) return NextResponse.json({ error: "Sin permiso" }, { status: 403 })

  // Soporta multipart (con archivo) o JSON (sin archivo)
  const contentType = req.headers.get("content-type") ?? ""
  let data: any
  let certificateUrl: string | null = null

  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData()
    data = Object.fromEntries(
      ["employeeId", "courseName", "institution", "instructor", "hours",
       "completedAt", "expiresAt", "notes"].map((k) => [k, formData.get(k)])
    )
    const file = formData.get("certificate") as File | null
    if (file) {
      const uploadDir = path.join(process.cwd(), "public", "uploads", "dc3")
      await mkdir(uploadDir, { recursive: true })
      const ext = file.name.split(".").pop() ?? "pdf"
      const filename = `${Date.now()}-${data.employeeId}.${ext}`
      await writeFile(path.join(uploadDir, filename), Buffer.from(await file.arrayBuffer()))
      certificateUrl = `/uploads/dc3/${filename}`
    }
  } else {
    data = await req.json()
  }

  const parsed = schema.safeParse({
    ...data,
    hours: data.hours ? parseInt(data.hours) : undefined,
  })
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const record = await prisma.dC3Record.create({
    data: {
      employeeId: parsed.data.employeeId,
      courseName: parsed.data.courseName,
      institution: parsed.data.institution ?? null,
      instructor: parsed.data.instructor ?? null,
      hours: parsed.data.hours ?? null,
      completedAt: new Date(parsed.data.completedAt),
      expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
      notes: parsed.data.notes ?? null,
      certificateUrl,
    },
    include: {
      employee: { select: { fullName: true, department: { select: { name: true } } } },
    },
  })

  return NextResponse.json(record, { status: 201 })
}
