import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const taskSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  startDate: z.string(),
  endDate: z.string(),
  actualStartDate: z.string().optional().nullable(),
  actualEndDate: z.string().optional().nullable(),
  progress: z.number().min(0).max(100).default(0),
  order: z.number().default(0),
  color: z.string().optional(),
})

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id: projectId } = await params
  const tasks = await prisma.projectTask.findMany({
    where: { projectId },
    orderBy: { startDate: "asc" },
  })
  return NextResponse.json(tasks)
}

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

  const { actualStartDate, actualEndDate, ...rest } = parsed.data
  const task = await prisma.projectTask.create({
    data: {
      ...rest,
      projectId,
      startDate: new Date(rest.startDate),
      endDate: new Date(rest.endDate),
      actualStartDate: actualStartDate ? new Date(actualStartDate) : null,
      actualEndDate: actualEndDate ? new Date(actualEndDate) : null,
    },
  })

  return NextResponse.json(task, { status: 201 })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id: projectId } = await params
  await prisma.projectTask.deleteMany({ where: { projectId } })
  await prisma.project.update({ where: { id: projectId }, data: { progress: 0 } })

  return NextResponse.json({ ok: true })
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
