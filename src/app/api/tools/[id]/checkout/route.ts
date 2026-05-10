import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const checkoutSchema = z.object({
  employeeId: z.string(),
  projectId: z.string().optional(),
  expectedReturn: z.string().optional(),
  conditionOut: z.enum(["BUENA", "REGULAR", "MALA", "BAJA"]).default("BUENA"),
  notes: z.string().optional(),
})

const returnSchema = z.object({
  conditionIn: z.enum(["BUENA", "REGULAR", "MALA", "BAJA"]),
  notes: z.string().optional(),
})

// POST — vale de salida
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id: toolId } = await params
  const body = await req.json()
  const parsed = checkoutSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const tool = await prisma.tool.findUnique({ where: { id: toolId } })
  if (!tool) return NextResponse.json({ error: "Herramienta no encontrada" }, { status: 404 })
  if (tool.status !== "DISPONIBLE") {
    return NextResponse.json({ error: "La herramienta no esta disponible" }, { status: 409 })
  }

  const [checkout] = await prisma.$transaction([
    prisma.toolCheckout.create({
      data: {
        toolId,
        employeeId: parsed.data.employeeId,
        projectId: parsed.data.projectId ?? null,
        expectedReturn: parsed.data.expectedReturn ? new Date(parsed.data.expectedReturn) : null,
        conditionOut: parsed.data.conditionOut,
        notes: parsed.data.notes ?? null,
        approvedById: session.user.employeeId ?? null,
      },
    }),
    prisma.tool.update({
      where: { id: toolId },
      data: { status: "ASIGNADO" },
    }),
  ])

  return NextResponse.json(checkout, { status: 201 })
}

// PATCH — devolucion
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id: toolId } = await params
  const body = await req.json()
  const parsed = returnSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const activeCheckout = await prisma.toolCheckout.findFirst({
    where: { toolId, returnedAt: null },
  })
  if (!activeCheckout) return NextResponse.json({ error: "No hay vale activo" }, { status: 404 })

  const newStatus = parsed.data.conditionIn === "BAJA" ? "BAJA" : "DISPONIBLE"

  await prisma.$transaction([
    prisma.toolCheckout.update({
      where: { id: activeCheckout.id },
      data: {
        returnedAt: new Date(),
        conditionIn: parsed.data.conditionIn,
        notes: parsed.data.notes ?? activeCheckout.notes,
      },
    }),
    prisma.tool.update({
      where: { id: toolId },
      data: { status: newStatus, condition: parsed.data.conditionIn },
    }),
  ])

  return NextResponse.json({ ok: true })
}
