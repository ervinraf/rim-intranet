import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import bcrypt from "bcryptjs"

const updateSchema = z.object({
  paterno: z.string().optional(),
  materno: z.string().optional(),
  nombres: z.string().optional(),
  nombres2: z.string().optional(),
  employeeType: z.enum(["OPERATIVO", "SUPERVISOR", "ADMINISTRATIVO"]).optional(),
  itemNumber: z.number().optional().nullable(),
  sdi: z.number().optional().nullable(),
  salarioBase: z.number().optional().nullable(),
  salarioMensual: z.number().optional().nullable(),
  extension: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  position: z.string().optional().nullable(),
  hireDate: z.string().optional().nullable(),
  birthDate: z.string().optional().nullable(),
  departmentId: z.string().optional().nullable(),
  roleId: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
  newPassword: z.string().min(6).optional(),
  workdayHours: z.union([z.literal(8), z.literal(9)]).optional(),
  photoUrl: z.string().optional().nullable(),
  licenciaNumero: z.string().optional().nullable(),
  licenciaVencimiento: z.string().optional().nullable(),
  licenciaFotoUrl: z.string().optional().nullable(),
})

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id } = await params

  // Empleado puede ver su propio perfil
  const isAdmin = ["SUPERADMIN", "ADMIN", "GERENTE"].includes(session.user.role ?? "")
  if (!isAdmin && session.user.employeeId !== id) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 })
  }

  const employee = await prisma.employee.findUnique({
    where: { id },
    include: {
      department: true,
      role: { include: { permissions: { include: { permission: true } } } },
      user: { select: { email: true, isActive: true, createdAt: true } },
      overtimeRecords: {
        orderBy: { weekStart: "desc" },
        take: 5,
        select: { weekStart: true, hoursWorked: true, status: true, netHours: true },
      },
      hoursBank: {
        where: { isExpired: false },
        select: { hoursAvailable: true, expiresAt: true },
      },
    },
  })

  if (!employee) return NextResponse.json({ error: "Empleado no encontrado" }, { status: 404 })
  return NextResponse.json(employee)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const isAdmin = ["SUPERADMIN", "ADMIN"].includes(session.user.role ?? "")
  if (!isAdmin) return NextResponse.json({ error: "Sin permiso" }, { status: 403 })

  const { id } = await params

  const employee = await prisma.employee.findUnique({
    where: { id },
    select: { id: true, fullName: true, userId: true },
  })
  if (!employee) return NextResponse.json({ error: "Empleado no encontrado" }, { status: 404 })

  // Cascade: deleting the User also deletes the Employee (onDelete: Cascade)
  await prisma.user.delete({ where: { id: employee.userId } })

  return NextResponse.json({ ok: true })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const isAdmin = ["SUPERADMIN", "ADMIN"].includes(session.user.role ?? "")
  if (!isAdmin) return NextResponse.json({ error: "Sin permiso" }, { status: 403 })

  const { id } = await params
  const body = await req.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { newPassword, hireDate, birthDate, licenciaVencimiento, paterno, materno, nombres, nombres2, ...rest } = parsed.data

  const existing = await prisma.employee.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: "Empleado no encontrado" }, { status: 404 })

  // Reconstruir nombre completo si cambian apellidos/nombres
  const newPaterno = paterno ?? existing.paterno
  const newMaterno = materno ?? existing.materno ?? ""
  const newNombres = nombres ?? existing.nombres
  const newNombres2 = nombres2 ?? existing.nombres2 ?? ""
  const fullName = [newPaterno, newMaterno, newNombres, newNombres2]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim()

  const employee = await prisma.$transaction(async (tx) => {
    if (newPassword) {
      const passwordHash = await bcrypt.hash(newPassword, 10)
      await tx.user.update({
        where: { id: existing.userId },
        data: { passwordHash, ...(rest.isActive !== undefined ? { isActive: rest.isActive } : {}) },
      })
    } else if (rest.isActive !== undefined) {
      await tx.user.update({
        where: { id: existing.userId },
        data: { isActive: rest.isActive },
      })
    }

    return tx.employee.update({
      where: { id },
      data: {
        paterno: newPaterno,
        materno: newMaterno || null,
        nombres: newNombres,
        nombres2: newNombres2 || null,
        fullName,
        ...rest,
        hireDate: hireDate ? new Date(hireDate) : hireDate === null ? null : undefined,
        birthDate: birthDate ? new Date(birthDate) : birthDate === null ? null : undefined,
        licenciaVencimiento: licenciaVencimiento ? new Date(licenciaVencimiento) : licenciaVencimiento === null ? null : undefined,
      },
      include: {
        department: { select: { name: true } },
        role: { select: { name: true } },
        user: { select: { email: true, isActive: true } },
      },
    })
  })

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: "EDITAR",
      module: "employees",
      entityId: id,
      entityType: "Employee",
      newData: JSON.parse(JSON.stringify({ fullName, isActive: rest.isActive })),
    },
  })

  return NextResponse.json(employee)
}
