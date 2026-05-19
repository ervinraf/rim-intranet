import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const schema = z.object({
  type: z.enum(["LEVANTAMIENTO", "CIERRE"]),
  data: z.record(z.string(), z.string()),
})

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id } = await params
  const forms = await prisma.projectForm.findMany({
    where: { projectId: id },
    include: { createdBy: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(forms)
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const form = await prisma.projectForm.create({
    data: {
      projectId: id,
      type: parsed.data.type,
      data: parsed.data.data as any,
      createdById: session.user.id,
    },
    include: { createdBy: { select: { name: true } } },
  })

  return NextResponse.json(form, { status: 201 })
}
