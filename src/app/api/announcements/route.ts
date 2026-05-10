import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const schema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
  type: z.enum(["GENERAL", "URGENTE", "CUMPLEANOS", "CAPACITACION", "FELICITACION", "OPERACIONES"]).default("GENERAL"),
  targetDepartmentId: z.string().optional().nullable(),
  expiresAt: z.string().optional().nullable(),
  isPinned: z.boolean().default(false),
})

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  let userDeptId: string | null = null
  if (session.user.employeeId) {
    const emp = await prisma.employee.findUnique({
      where: { id: session.user.employeeId },
      select: { departmentId: true },
    })
    userDeptId = emp?.departmentId ?? null
  }

  const now = new Date()
  const announcements = await prisma.announcement.findMany({
    where: {
      isActive: true,
      OR: [{ expiresAt: null }, { expiresAt: { gte: now } }],
      AND: [
        {
          OR: [
            { targetDepartmentId: null },
            { targetDepartmentId: userDeptId ?? "__none__" },
          ],
        },
      ],
    },
    include: {
      targetDepartment: { select: { name: true } },
    },
    orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
    take: 20,
  })

  return NextResponse.json(announcements)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const isAdmin = ["SUPERADMIN", "ADMIN", "GERENTE"].includes(session.user.role ?? "")
  if (!isAdmin) return NextResponse.json({ error: "Sin permiso" }, { status: 403 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { expiresAt, ...rest } = parsed.data

  const announcement = await prisma.announcement.create({
    data: {
      ...rest,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      postedById: session.user.employeeId ?? session.user.id,
    },
    include: { targetDepartment: { select: { name: true } } },
  })

  return NextResponse.json(announcement, { status: 201 })
}
