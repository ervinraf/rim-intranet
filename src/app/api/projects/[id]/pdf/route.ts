import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { renderToBuffer } from "@react-pdf/renderer"
import { ProjectPDF } from "@/lib/project-pdf"
import React from "react"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id } = await params

  const [project, logoConfig] = await Promise.all([
    prisma.project.findUnique({
      where: { id, isActive: true },
      include: {
        tasks: {
          orderBy: { order: "asc" },
          include: { photos: { orderBy: { takenAt: "desc" }, take: 6 } },
        },
        photos: { orderBy: { takenAt: "desc" } },
        updates: { orderBy: { createdAt: "desc" }, take: 10 },
      },
    }),
    prisma.systemConfig.findUnique({ where: { key: "company_logo" } }),
  ])

  if (!project) return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 })

  const baseUrl = process.env.NEXTAUTH_URL ?? "https://intranet.rim-rigging.com"

  const element = React.createElement(ProjectPDF as any, {
    project: JSON.parse(JSON.stringify(project)),
    logoUrl: logoConfig?.value ?? null,
    baseUrl,
  })

  const pdfBuffer = await renderToBuffer(element as any)
  const filename = `${project.name.replace(/[^a-zA-Z0-9]/g, "_")}_avance.pdf`

  return new Response(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  })
}
