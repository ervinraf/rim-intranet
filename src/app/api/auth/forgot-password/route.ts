import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { randomBytes } from "crypto"
import { Resend } from "resend"

export async function POST(req: NextRequest) {
  const { email } = await req.json()
  if (!email) return NextResponse.json({ error: "Email requerido" }, { status: 400 })

  const user = await prisma.user.findUnique({ where: { email } })

  // Respuesta identica si el usuario existe o no (evita enumeracion)
  if (!user || !user.isActive) {
    return NextResponse.json({ ok: true })
  }

  // Borrar tokens previos del mismo usuario
  await prisma.verificationToken.deleteMany({ where: { identifier: email } })

  const token = randomBytes(32).toString("hex")
  const expires = new Date(Date.now() + 60 * 60 * 1000) // 1 hora

  await prisma.verificationToken.create({
    data: { identifier: email, token, expires },
  })

  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000"
  const resetUrl = `${baseUrl}/reset-password?token=${token}`

  if (process.env.RESEND_API_KEY) {
    const resend = new Resend(process.env.RESEND_API_KEY)
    await resend.emails.send({
      from: process.env.RESEND_FROM ?? "noreply@rim-rigging.com",
      to: email,
      subject: "Restablecer contrasena — RIM Rigging",
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
          <h2 style="color:#0f172a">Restablecer contrasena</h2>
          <p>Recibimos una solicitud para restablecer la contrasena de tu cuenta en el portal interno de RIM Rigging.</p>
          <p>Haz clic en el siguiente boton. El enlace es valido por <strong>1 hora</strong>.</p>
          <a href="${resetUrl}"
             style="display:inline-block;background:#0f172a;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;margin:16px 0">
            Restablecer contrasena
          </a>
          <p style="color:#64748b;font-size:13px">Si no solicitaste este cambio, ignora este correo. Tu contrasena no cambiara.</p>
          <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0"/>
          <p style="color:#94a3b8;font-size:12px">RIM Rigging &mdash; Portal interno</p>
        </div>
      `,
    })
  } else {
    // Sin RESEND_API_KEY: loguear el enlace en consola (desarrollo)
    console.log(`[reset-password] ${resetUrl}`)
  }

  return NextResponse.json({ ok: true })
}
