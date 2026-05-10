import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Resend } from "resend"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id } = await params
  const { email, clientName } = await req.json()

  if (!email) return NextResponse.json({ error: "Correo requerido" }, { status: 400 })

  const project = await prisma.project.findUnique({
    where: { id, isActive: true },
    select: { name: true, accessToken: true, progress: true, clientName: true },
  })

  if (!project) return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 })

  const baseUrl = process.env.NEXTAUTH_URL ?? "https://intranet.rim-rigging.com"
  const portalUrl = `${baseUrl}/cliente?token=${project.accessToken}`

  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) {
    return NextResponse.json({ error: "RESEND_API_KEY no configurada" }, { status: 500 })
  }

  const resend = new Resend(resendKey)

  const { error } = await resend.emails.send({
    from: "RIM Rigging <noreply@rim-rigging.com>",
    to: email,
    subject: `Avance de tu proyecto: ${project.name} — ${project.progress}% completado`,
    html: `
      <div style="font-family: Calibri, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
        <div style="border-bottom: 3px solid #f59e0b; padding-bottom: 16px; margin-bottom: 24px;">
          <h1 style="font-size: 24px; color: #0f172a; margin: 0;">RIM Rigging</h1>
          <p style="color: #64748b; margin: 4px 0 0;">Portal de seguimiento de proyectos</p>
        </div>

        <p style="font-size: 16px; color: #1e293b;">Hola <strong>${clientName ?? project.clientName}</strong>,</p>

        <p style="color: #475569; line-height: 1.6;">
          Te compartimos el avance actualizado de tu proyecto <strong>${project.name}</strong>.
        </p>

        <div style="background: #fef3c7; border-radius: 12px; padding: 20px; margin: 24px 0; text-align: center;">
          <p style="margin: 0 0 8px; color: #92400e; font-size: 14px;">Avance actual del proyecto</p>
          <p style="margin: 0; font-size: 48px; font-weight: bold; color: #92400e;">${project.progress}%</p>
        </div>

        <p style="color: #475569; line-height: 1.6;">
          Puedes ver el detalle completo, el diagrama de Gantt y el registro fotografico en tu portal personalizado:
        </p>

        <div style="text-align: center; margin: 32px 0;">
          <a href="${portalUrl}"
             style="background: #f59e0b; color: #0f172a; padding: 14px 32px; border-radius: 8px;
                    text-decoration: none; font-weight: bold; font-size: 16px; display: inline-block;">
            Ver avance del proyecto
          </a>
        </div>

        <p style="font-size: 12px; color: #94a3b8; text-align: center; margin-top: 32px; border-top: 1px solid #e2e8f0; padding-top: 16px;">
          Este enlace es exclusivo para ti. RIM Rigging — ${baseUrl}
        </p>
      </div>
    `,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
