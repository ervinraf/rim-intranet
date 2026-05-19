import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { Resend } from "resend"

const itemSchema = z.object({
  name: z.string(),
  quantity: z.number().positive(),
  unit: z.string().optional(),
  notes: z.string().optional(),
})

const schema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  items: z.array(itemSchema).min(1),
  priority: z.enum(["NORMAL", "URGENTE"]).default("NORMAL"),
  departmentId: z.string().optional(),
  projectId: z.string().optional(),
})

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get("status")
  const isAdmin = ["SUPERADMIN", "ADMIN", "GERENTE"].includes(session.user.role ?? "")

  const reqs = await prisma.purchaseRequisition.findMany({
    where: {
      ...(status ? { status: status as any } : {}),
      ...(!isAdmin ? { requestedById: session.user.employeeId ?? "__none__" } : {}),
    },
    include: {
      department: { select: { name: true } },
      project: { select: { name: true } },
    },
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
  })

  return NextResponse.json(reqs)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const req2 = await prisma.purchaseRequisition.create({
    data: {
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      items: parsed.data.items,
      priority: parsed.data.priority,
      departmentId: parsed.data.departmentId ?? null,
      projectId: parsed.data.projectId ?? null,
      requestedById: session.user.employeeId ?? session.user.id,
    },
    include: {
      department: { select: { name: true } },
      project: { select: { name: true } },
    },
  })

  // Notificar por email a admins y gerentes
  try {
    const resendKey = process.env.RESEND_API_KEY
    if (resendKey) {
      const admins = await prisma.user.findMany({
        where: {
          isActive: true,
          employee: { role: { name: { in: ["SUPERADMIN", "ADMIN", "GERENTE"] } } },
          email: { not: session.user.email ?? "" },
        },
        select: { email: true },
      })
      const emails = admins.map((a) => a.email).filter(Boolean)
      if (emails.length > 0) {
        const resend = new Resend(resendKey)
        const items = parsed.data.items as { name: string; quantity: number; unit?: string }[]
        const itemsHtml = items.map((i) =>
          `<tr><td style="padding:4px 8px;border-bottom:1px solid #f1f5f9">${i.name}</td><td style="padding:4px 8px;border-bottom:1px solid #f1f5f9;text-align:right">${i.quantity} ${i.unit ?? ""}</td></tr>`
        ).join("")
        await resend.emails.send({
          from: process.env.RESEND_FROM ?? "noreply@send.rim-rigging.com",
          to: emails,
          subject: `${parsed.data.priority === "URGENTE" ? "[URGENTE] " : ""}Nueva requisicion: ${parsed.data.title}`,
          html: `
            <div style="font-family:Calibri,sans-serif;max-width:560px;margin:0 auto;padding:24px">
              <h2 style="color:#0f172a;margin-bottom:4px">Nueva requisicion de compra</h2>
              <p style="color:#64748b;margin:0 0 16px">Solicitada por <strong>${session.user.name ?? session.user.email}</strong></p>
              ${parsed.data.priority === "URGENTE" ? `<div style="background:#fef2f2;border:1px solid #fca5a5;border-radius:8px;padding:10px 14px;margin-bottom:16px;color:#b91c1c;font-weight:bold">PRIORIDAD URGENTE</div>` : ""}
              <p style="color:#1e293b;font-size:16px;font-weight:600;margin-bottom:4px">${parsed.data.title}</p>
              ${req2.department ? `<p style="color:#64748b;margin:0 0 16px">Departamento: ${req2.department.name}</p>` : ""}
              <table style="width:100%;border-collapse:collapse;background:#f8fafc;border-radius:8px;overflow:hidden">
                <thead><tr style="background:#e2e8f0"><th style="padding:6px 8px;text-align:left;font-size:12px;color:#64748b">Articulo</th><th style="padding:6px 8px;text-align:right;font-size:12px;color:#64748b">Cantidad</th></tr></thead>
                <tbody>${itemsHtml}</tbody>
              </table>
              <div style="margin-top:24px;text-align:center">
                <a href="${process.env.NEXTAUTH_URL ?? "https://intranet.rim-rigging.com"}/dashboard/herramientas" style="background:#f59e0b;color:#0f172a;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold">Ver en el intranet</a>
              </div>
            </div>
          `,
        })
      }
    }
  } catch (e) {
    console.error("[requisiciones] email error:", e)
  }

  return NextResponse.json(req2, { status: 201 })
}
