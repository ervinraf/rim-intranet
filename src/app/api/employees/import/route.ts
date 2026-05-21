import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

function parseRows(text: string) {
  const lines = text
    .split("\n")
    .map((l) => l.replace(/\r$/, "").trim())
    .filter(Boolean)
  if (lines.length < 2) return null

  const sep = lines[0].includes("\t") ? "\t" : ","
  const matrix = lines.map((l) => l.split(sep).map((c) => c.trim().replace(/^"|"$/g, "")))

  // Detect transposed format: first column of first row is a known field name
  const knownFields = ["PATERNO", "MATERNO", "NOMBRES", "NOMBRE", "EMAIL", "TIPO", "DEPARTAMENTO", "PUESTO"]
  const firstCell = matrix[0][0].toUpperCase().replace(/[^A-Z0-9\s/.]/g, "")
  const isTransposed = knownFields.some((f) => firstCell.includes(f))

  if (isTransposed) {
    // Rows are fields, columns are employees → transpose
    const numEmployees = matrix[0].length - 1
    const headers = matrix.map((r) =>
      r[0].toUpperCase().replace(/[^A-Z0-9\s/.]/g, "").trim()
    )
    const rows: string[][] = []
    for (let col = 1; col <= numEmployees; col++) {
      rows.push(matrix.map((r) => r[col] ?? ""))
    }
    return { headers, rows }
  }

  // Standard format: first row = headers
  const headers = matrix[0].map((h) => h.toUpperCase().replace(/[^A-Z0-9\s/.]/g, "").trim())
  return { headers, rows: matrix.slice(1) }
}

function normalizeEmployeeType(raw: string): "OPERATIVO" | "SUPERVISOR" | "ADMINISTRATIVO" {
  const v = raw.toUpperCase().trim()
  if (v.startsWith("ADMIN")) return "ADMINISTRATIVO"
  if (v.startsWith("SUPER") || v.startsWith("SUPERVISOR")) return "SUPERVISOR"
  return "OPERATIVO"
}

function parseDate(raw: string): Date | null {
  if (!raw) return null
  // dd/MM/yyyy
  const ddmm = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (ddmm) return new Date(`${ddmm[3]}-${ddmm[2].padStart(2, "0")}-${ddmm[1].padStart(2, "0")}`)
  const d = new Date(raw)
  return isNaN(d.getTime()) ? null : d
}

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
  const parsed = parseRows(text)

  if (!parsed) {
    return NextResponse.json({ error: "El archivo esta vacio o solo tiene encabezados" }, { status: 400 })
  }

  const { headers, rows } = parsed
  const col = (name: string) => headers.findIndex((h) => h.includes(name))
  const get = (row: string[], name: string) => {
    const i = col(name)
    return i >= 0 ? row[i]?.trim() ?? "" : ""
  }

  const results = { created: 0, skipped: 0, errors: [] as string[] }

  const departments = await prisma.department.findMany({ select: { id: true, name: true } })
  const roles = await prisma.role.findMany({ select: { id: true, name: true } })
  const defaultPasswordHash = await bcrypt.hash("RimRigging2026!", 10)

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]

    try {
      const paterno = get(row, "PATERNO") || ""
      const materno = get(row, "MATERNO") || ""
      const nombres = get(row, "NOMBRES") || ""
      const nombres2 = get(row, "NOMBRES2") || ""
      const nombreCompleto = get(row, "NOMBRE")

      if (!paterno && !nombreCompleto) {
        results.skipped++
        continue
      }

      let email = get(row, "EMAIL") || get(row, "CORREO") || ""
      if (!email) {
        const slug = (paterno + nombres).toLowerCase().replace(/[^a-z]/g, "")
        email = `${slug}@rim-rigging.com`
      }

      const existing = await prisma.user.findUnique({ where: { email } })
      if (existing) {
        results.skipped++
        continue
      }

      const curp = get(row, "RFC") || get(row, "CURP") || ""
      const nss = get(row, "SEG") || get(row, "NSS") || ""
      const hireDateRaw = get(row, "INGRESO") || get(row, "FECHA INGRESO") || ""
      const birthDateRaw = get(row, "NACIMIENTO") || get(row, "FECHA NAC") || ""

      const hireDate = parseDate(hireDateRaw)
      const birthDate = parseDate(birthDateRaw)

      const sdiRaw = get(row, "SDI") || ""
      const sbRaw = get(row, "SB") || get(row, "SALARIO BASE") || ""
      const mensualRaw = get(row, "MENSUAL") || get(row, "SALARIO MENSUAL") || ""
      const itemRaw = get(row, "ITEM") || get(row, "NUM") || ""

      const sdi = sdiRaw ? parseFloat(sdiRaw.replace(/[$,\s]/g, "")) : null
      const salarioBase = sbRaw ? parseFloat(sbRaw.replace(/[$,\s]/g, "")) : null
      const salarioMensual = mensualRaw ? parseFloat(mensualRaw.replace(/[$,\s]/g, "")) : null
      const itemNumber = itemRaw ? parseInt(itemRaw) : null

      const tipoRaw = get(row, "TIPO") || "OPERATIVO"
      const employeeType = normalizeEmployeeType(tipoRaw)

      const deptName = get(row, "DEPARTAMENTO") || get(row, "DEPT") || ""
      const dept = deptName
        ? departments.find((d) => d.name.toLowerCase().includes(deptName.toLowerCase()))
        : null
      const departmentId = dept?.id ?? defaultDeptId ?? null

      const roleName = get(row, "ROL") || get(row, "ROLE") || ""
      const role = roleName
        ? roles.find((r) => r.name.toLowerCase().includes(roleName.toLowerCase()))
        : null
      const roleId = role?.id ?? defaultRoleId ?? null

      const position = get(row, "PUESTO") || get(row, "CARGO") || null

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
            itemNumber: itemNumber && !isNaN(itemNumber) ? itemNumber : null,
            employeeType,
            curp: curp || null,
            nss: nss || null,
            sdi: sdi && !isNaN(sdi) ? sdi : null,
            salarioBase: salarioBase && !isNaN(salarioBase) ? salarioBase : null,
            salarioMensual: salarioMensual && !isNaN(salarioMensual) ? salarioMensual : null,
            position: position || null,
            departmentId,
            roleId,
            hireDate: hireDate ?? null,
            birthDate: birthDate ?? null,
            isActive: true,
          },
        })
      })

      results.created++
    } catch (err: any) {
      results.errors.push(`Empleado ${i + 1}: ${err.message}`)
    }
  }

  return NextResponse.json({
    message: `Importacion completada: ${results.created} creados, ${results.skipped} omitidos`,
    ...results,
  })
}
