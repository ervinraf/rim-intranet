import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

/**
 * Importacion masiva desde CSV.
 * Formato esperado (mismo que el Excel de horas extras):
 * ITEM,PATERNO,MATERNO,NOMBRES,NOMBRES2,SDI,SB,MENSUAL,NOMBRE,...
 *
 * Tambien acepta CSV simplificado:
 * PATERNO,MATERNO,NOMBRES,NOMBRES2,EMAIL,TIPO,DEPARTAMENTO,PUESTO,SDI,SB,MENSUAL
 */
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const isAdmin = ["SUPERADMIN", "ADMIN"].includes(session.user.role ?? "")
  if (!isAdmin) return NextResponse.json({ error: "Sin permiso" }, { status: 403 })

  const formData = await req.formData()
  const file = formData.get("file") as File | null
  const defaultDeptId = formData.get("departmentId") as string | null
  const defaultRoleId = formData.get("roleId") as string | null

  if (!file) return NextResponse.json({ error: "No se recibio archivo" }, { status: 400 })

  const text = await file.text()
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)

  if (lines.length < 2) {
    return NextResponse.json({ error: "El archivo esta vacio o solo tiene encabezados" }, { status: 400 })
  }

  // Detectar separador (coma o tabulacion)
  const sep = lines[0].includes("\t") ? "\t" : ","
  const headers = lines[0].split(sep).map((h) => h.trim().toUpperCase().replace(/[^A-Z0-9\s]/g, ""))

  // Mapeo de columnas al formato del Excel original
  const col = (name: string) => headers.indexOf(name)
  const get = (row: string[], name: string) => row[col(name)]?.trim() ?? ""

  const results = { created: 0, skipped: 0, errors: [] as string[] }

  // Departamentos existentes para matching por nombre
  const departments = await prisma.department.findMany({ select: { id: true, name: true } })
  const roles = await prisma.role.findMany({ select: { id: true, name: true } })

  const defaultPasswordHash = await bcrypt.hash("RimRigging2026!", 10)

  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].split(sep).map((c) => c.trim().replace(/^"|"$/g, ""))

    try {
      // Soporte para ambos formatos
      const paterno = get(row, "PATERNO") || ""
      const materno = get(row, "MATERNO") || ""
      const nombres = get(row, "NOMBRES") || ""
      const nombres2 = get(row, "NOMBRES2") || ""
      const nombreCompleto = get(row, "NOMBRE") || ""

      if (!paterno && !nombreCompleto) {
        results.skipped++
        continue
      }

      // Email: usar columna EMAIL o generar desde nombre
      let email = get(row, "EMAIL") || get(row, "CORREO") || ""
      if (!email) {
        const slug = (paterno + nombres).toLowerCase().replace(/[^a-z]/g, "")
        email = `${slug}@rim-rigging.com`
      }

      // Verificar si ya existe
      const existing = await prisma.user.findUnique({ where: { email } })
      if (existing) {
        results.skipped++
        continue
      }

      // Fecha de nacimiento
      const birthDateRaw = get(row, "NACIMIENTO") || get(row, "FECHA NAC") || get(row, "FECHA NACIMIENTO") || ""
      const birthDate = birthDateRaw ? new Date(birthDateRaw) : null

      // SDI y salarios
      const sdiRaw = get(row, "SDI") || get(row, "SDI DIARIO") || ""
      const sbRaw = get(row, "SB") || get(row, "SALARIO BASE") || ""
      const mensualRaw = get(row, "MENSUAL") || get(row, "SALARIO MENSUAL") || ""
      const itemRaw = get(row, "ITEM") || get(row, "NUM") || ""

      const sdi = sdiRaw ? parseFloat(sdiRaw.replace(/[$,\s]/g, "")) : null
      const salarioBase = sbRaw ? parseFloat(sbRaw.replace(/[$,\s]/g, "")) : null
      const salarioMensual = mensualRaw ? parseFloat(mensualRaw.replace(/[$,\s]/g, "")) : null
      const itemNumber = itemRaw ? parseInt(itemRaw) : null

      // Tipo de empleado
      const tipoRaw = (get(row, "TIPO") || get(row, "TIPO EMPLEADO") || "OPERATIVO").toUpperCase()
      const employeeType = ["OPERATIVO", "SUPERVISOR", "ADMINISTRATIVO"].includes(tipoRaw)
        ? (tipoRaw as "OPERATIVO" | "SUPERVISOR" | "ADMINISTRATIVO")
        : "OPERATIVO"

      // Departamento por nombre o usar el default
      const deptName = get(row, "DEPARTAMENTO") || get(row, "DEPT") || ""
      const dept = deptName
        ? departments.find((d) => d.name.toLowerCase().includes(deptName.toLowerCase()))
        : null
      const departmentId = dept?.id ?? defaultDeptId ?? null

      // Rol por nombre o usar default
      const roleName = get(row, "ROL") || get(row, "ROLE") || ""
      const role = roleName
        ? roles.find((r) => r.name.toLowerCase().includes(roleName.toLowerCase()))
        : null
      const roleId = role?.id ?? defaultRoleId ?? null

      const fullName =
        nombreCompleto ||
        [paterno, materno, nombres, nombres2].filter(Boolean).join(" ").replace(/\s+/g, " ").trim()

      await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: { email, name: fullName, passwordHash: defaultPasswordHash, isActive: true },
        })
        await tx.employee.create({
          data: {
            userId: user.id,
            paterno,
            materno: materno || null,
            nombres,
            nombres2: nombres2 || null,
            fullName,
            itemNumber: isNaN(itemNumber!) ? null : itemNumber,
            employeeType,
            sdi: sdi && !isNaN(sdi) ? sdi : null,
            salarioBase: salarioBase && !isNaN(salarioBase) ? salarioBase : null,
            salarioMensual: salarioMensual && !isNaN(salarioMensual) ? salarioMensual : null,
            departmentId,
            roleId,
            birthDate: birthDate && !isNaN(birthDate.getTime()) ? birthDate : null,
            isActive: true,
          },
        })
      })

      results.created++
    } catch (err: any) {
      results.errors.push(`Fila ${i + 1}: ${err.message}`)
    }
  }

  return NextResponse.json({
    message: `Importacion completada: ${results.created} creados, ${results.skipped} omitidos`,
    ...results,
  })
}
