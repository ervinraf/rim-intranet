import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// Default checklist items for every new hire
const DEFAULT_ITEMS = [
  { category: "Documentos", label: "Contrato firmado" },
  { category: "Documentos", label: "Alta IMSS" },
  { category: "Documentos", label: "CURP entregado" },
  { category: "Documentos", label: "INE / Pasaporte" },
  { category: "Documentos", label: "Comprobante de domicilio" },
  { category: "Documentos", label: "RFC" },
  { category: "Documentos", label: "Foto reciente" },
  { category: "Documentos", label: "Numero de cuenta bancaria" },
  { category: "Equipo y Uniforme", label: "Uniforme entregado" },
  { category: "Equipo y Uniforme", label: "EPP entregado" },
  { category: "Equipo y Uniforme", label: "Gafete / Credencial" },
  { category: "Accesos", label: "Cuenta de correo creada" },
  { category: "Accesos", label: "Acceso al sistema (intranet)" },
  { category: "Capacitacion", label: "Induccion general" },
  { category: "Capacitacion", label: "Reglamento interno" },
  { category: "Capacitacion", label: "Seguridad e higiene" },
  { category: "Capacitacion", label: "Tour de instalaciones" },
]

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const isAdmin = ["SUPERADMIN", "ADMIN", "GERENTE"].includes(session.user.role ?? "")
  if (!isAdmin) return NextResponse.json({ error: "Sin permiso" }, { status: 403 })

  const onboardings = await prisma.onboarding.findMany({
    include: {
      employee: {
        select: {
          id: true,
          fullName: true,
          position: true,
          hireDate: true,
          photoUrl: true,
          department: { select: { name: true } },
        },
      },
      items: { orderBy: [{ category: "asc" }, { createdAt: "asc" }] },
    },
    orderBy: { startDate: "desc" },
  })

  return NextResponse.json(onboardings)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const isAdmin = ["SUPERADMIN", "ADMIN"].includes(session.user.role ?? "")
  if (!isAdmin) return NextResponse.json({ error: "Sin permiso" }, { status: 403 })

  const { employeeId, startDate, notes } = await req.json()
  if (!employeeId || !startDate) {
    return NextResponse.json({ error: "employeeId y startDate requeridos" }, { status: 400 })
  }

  const existing = await prisma.onboarding.findUnique({ where: { employeeId } })
  if (existing) {
    return NextResponse.json({ error: "Este empleado ya tiene un proceso de nuevo ingreso" }, { status: 409 })
  }

  const onboarding = await prisma.onboarding.create({
    data: {
      employeeId,
      startDate: new Date(startDate),
      notes: notes || null,
      items: {
        create: DEFAULT_ITEMS,
      },
    },
    include: {
      employee: {
        select: {
          id: true,
          fullName: true,
          position: true,
          hireDate: true,
          photoUrl: true,
          department: { select: { name: true } },
        },
      },
      items: { orderBy: [{ category: "asc" }, { createdAt: "asc" }] },
    },
  })

  return NextResponse.json(onboarding, { status: 201 })
}
