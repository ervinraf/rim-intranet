import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const taskSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  startDate: z.string(),
  endDate: z.string(),
  progress: z.number().min(0).max(100).default(0),
  order: z.number().default(0),
  color: z.string().optional(),
})

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id: projectId } = await params
  const body = await req.json()
  const parsed = taskSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const task = await prisma.projectTask.create({
    data: {
      ...parsed.data,
      projectId,
      startDate: new Date(parsed.data.startDate),
      endDate: new Date(parsed.data.endDate),
    },
  })

  return NextResponse.json(task, { status: 201 })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id: projectId } = await params
  const body = await req.json()
  // Batch update de progreso para multiples tareas a la vez
  const { tasks } = body as { tasks: { id: string; progress: number }[] }

  await prisma.$transaction(
    tasks.map((t) =>
      prisma.projectTask.update({
        where: { id: t.id, projectId },
        data: { progress: t.progress },
      })
    )
  )

  // Recalcula progreso general del proyecto
  const allTasks = await prisma.projectTask.findMany({ where: { projectId } })
  const avg = allTasks.length
    ? Math.round(allTasks.reduce((s, t) => s + t.progress, 0) / allTasks.length)
    : 0

  await prisma.project.update({ where: { id: projectId }, data: { progress: avg } })

  return NextResponse.json({ ok: true, projectProgress: avg })
}
