import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const schema = z.object({
  projectId: z.string(),
  clientName: z.string().min(1),
  rating: z.number().min(1).max(5),
  comment: z.string().optional().nullable(),
})

// Endpoint publico — clientes llenan la encuesta sin login
export async function POST(req: NextRequest) {
  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const survey = await prisma.clientSurvey.create({ data: parsed.data })
  return NextResponse.json(survey, { status: 201 })
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get("projectId")

  const surveys = await prisma.clientSurvey.findMany({
    where: projectId ? { projectId } : {},
    include: { project: { select: { name: true, clientName: true } } },
    orderBy: { submittedAt: "desc" },
    take: 200,
  })

  return NextResponse.json(surveys)
}
