import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  progress: z.number().min(0).max(100).optional(),
  color: z.string().optional().nullable(),
})

type Params = { params: Promise<{ id: string; taskId: string }> }

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id: projectId, taskId } = await params
  const body = await req.json()
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { startDate, endDate, ...rest } = parsed.data

  const task = await prisma.projectTask.update({
    where: { id: taskId, projectId },
    data: {
      ...rest,
      ...(startDate ? { startDate: new Date(startDate) } : {}),
      ...(endDate ? { endDate: new Date(endDate) } : {}),
    },
  })

  return NextResponse.json(task)
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const isAdmin = ["SUPERADMIN", "ADMIN"].includes(session.user.role ?? "")
  if (!isAdmin) return NextResponse.json({ error: "Sin permiso" }, { status: 403 })

  const { id: projectId, taskId } = await params

  await prisma.projectTask.delete({ where: { id: taskId, projectId } })

  // Recalcula progreso del proyecto
  const remaining = await prisma.projectTask.findMany({ where: { projectId } })
  const avg = remaining.length
    ? Math.round(remaining.reduce((s, t) => s + t.progress, 0) / remaining.length)
    : 0
  await prisma.project.update({ where: { id: projectId }, data: { progress: avg } })

  return NextResponse.json({ ok: true })
}
