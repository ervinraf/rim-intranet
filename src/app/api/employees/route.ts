import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import bcrypt from "bcryptjs"

const createSchema = z.object({
  email: z.string().email(),
  paterno: z.string().min(1),
  materno: z.string().optional().default(""),
  nombres: z.string().min(1),
  nombres2: z.string().optional().default(""),
  employeeType: z.enum(["OPERATIVO", "SUPERVISOR", "ADMINISTRATIVO"]).default("OPERATIVO"),
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
  tempPassword: z.string().min(6),
})

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const search = searchParams.get("search") ?? ""
  const departmentId = searchParams.get("departmentId")
  const employeeType = searchParams.get("employeeType")
  const isActive = searchParams.get("isActive")

  const employees = await prisma.employee.findMany({
    where: {
      ...(search
        ? {
            OR: [
              { fullName: { contains: search } },
              { paterno: { contains: search } },
              { position: { contains: search } },
            ],
          }
        : {}),
      ...(departmentId ? { departmentId } : {}),
      ...(employeeType ? { employeeType: employeeType as any } : {}),
      ...(isActive !== null ? { isActive: isActive === "true" } : {}),
    },
    include: {
      department: { select: { name: true } },
      role: { select: { name: true } },
      user: { select: { email: true } },
    },
    orderBy: { fullName: "asc" },
  })

  return NextResponse.json(employees)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const isAdmin = ["SUPERADMIN", "ADMIN"].includes(session.user.role ?? "")
  if (!isAdmin) return NextResponse.json({ error: "Sin permiso" }, { status: 403 })

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const {
    email, tempPassword, hireDate, birthDate, sdi, salarioBase, salarioMensual,
    paterno, materno, nombres, nombres2, itemNumber, ...rest
  } = parsed.data

  // Verificar email unico
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) return NextResponse.json({ error: "El correo ya esta registrado" }, { status: 409 })

  const fullName = [paterno, materno, nombres, nombres2].filter(Boolean).join(" ").replace(/\s+/g, " ").trim()
  const passwordHash = await bcrypt.hash(tempPassword, 10)

  const employee = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email,
        name: fullName,
        passwordHash,
        isActive: true,
      },
    })

    return tx.employee.create({
      data: {
        userId: user.id,
        paterno,
        materno: materno || null,
        nombres,
        nombres2: nombres2 || null,
        fullName,
        itemNumber: itemNumber ?? null,
        sdi: sdi ?? null,
        salarioBase: salarioBase ?? null,
        salarioMensual: salarioMensual ?? null,
        hireDate: hireDate ? new Date(hireDate) : null,
        birthDate: birthDate ? new Date(birthDate) : null,
        ...rest,
      },
      include: {
        department: { select: { name: true } },
        role: { select: { name: true } },
        user: { select: { email: true } },
      },
    })
  })

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: "CREAR",
      module: "employees",
      entityId: employee.id,
      entityType: "Employee",
      newData: JSON.parse(JSON.stringify({ fullName, email })),
    },
  })

  return NextResponse.json(employee, { status: 201 })
}
