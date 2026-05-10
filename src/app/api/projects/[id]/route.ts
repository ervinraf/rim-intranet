import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  clientName: z.string().optional(),
  clientEmail: z.string().email().optional().or(z.literal("")).optional(),
  location: z.string().optional(),
  description: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  status: z.enum(["NUEVO", "EN_DESARROLLO", "CERRADO"]).optional(),
  progress: z.number().min(0).max(100).optional(),
})

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  // Permite acceso por accessToken (portal cliente) o por sesion interna
  const { searchParams } = new URL(req.url)
  const token = searchParams.get("token")

  let project
  if (token) {
    project = await prisma.project.findFirst({
      where: { accessToken: token, isActive: true },
      include: {
        tasks: { orderBy: { order: "asc" }, include: { photos: { orderBy: { takenAt: "desc" } } } },
        photos: { orderBy: { takenAt: "desc" } },
        updates: { orderBy: { createdAt: "desc" }, take: 20 },
      },
    })
  } else {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    project = await prisma.project.findUnique({
      where: { id, isActive: true },
      include: {
        tasks: { orderBy: { order: "asc" }, include: { photos: { orderBy: { takenAt: "desc" } } } },
        photos: { orderBy: { takenAt: "desc" } },
        updates: { orderBy: { createdAt: "desc" }, take: 20 },
      },
    })
  }

  if (!project) return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 })
  return NextResponse.json(project)
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { startDate, endDate, clientEmail, ...rest } = parsed.data

  const project = await prisma.project.update({
    where: { id },
    data: {
      ...rest,
      ...(clientEmail !== undefined ? { clientEmail: clientEmail || null } : {}),
      ...(startDate ? { startDate: new Date(startDate) } : {}),
      ...(endDate ? { endDate: new Date(endDate) } : {}),
    },
  })

  return NextResponse.json(project)
}
