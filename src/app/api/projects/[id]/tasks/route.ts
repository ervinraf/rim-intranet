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

  // Guarda el progress de cada tarea individualmente
  if (Array.isArray(body.tasks) && body.tasks.length > 0) {
    await Promise.all(
      body.tasks.map(({ id, progress }: { id: string; progress: number }) =>
        prisma.projectTask.updateMany({
          where: { id, projectId },
          data: { progress: Math.min(100, Math.max(0, progress)) },
        })
      )
    )
  }

  // Recalcula progreso del proyecto como promedio de todos los tasks
  const allTasks = await prisma.projectTask.findMany({ where: { projectId } })
  const projectProgress = allTasks.length
    ? Math.round(allTasks.reduce((s, t) => s + t.progress, 0) / allTasks.length)
    : 0

  await prisma.project.update({ where: { id: projectId }, data: { progress: projectProgress } })

  return NextResponse.json({ ok: true, projectProgress })
}
