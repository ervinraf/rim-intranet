import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

interface BulkRow {
  employee: string
  date: string
  checkIn?: string | null
  checkOut?: string | null
  type?: string
  notes?: string | null
}

function norm(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim()
}

function findEmployee(identifier: string, employees: any[]) {
  const clean = norm(identifier)
  if (!clean) return null

  // Item number
  const num = parseInt(identifier.trim())
  if (!isNaN(num)) {
    const emp = employees.find((e) => e.itemNumber === num)
    if (emp) return emp
  }

  // Exact full name (accent-insensitive)
  let emp = employees.find((e) => norm(e.fullName) === clean)
  if (emp) return emp

  // Full name contains identifier or vice versa
  emp = employees.find((e) => {
    const name = norm(e.fullName)
    return name.includes(clean) || clean.includes(name)
  })
  if (emp) return emp

  // Any word in identifier matches any word in employee name
  const parts = clean.split(/\s+/).filter(Boolean)
  emp = employees.find((e) => {
    const nameParts = norm(e.fullName).split(/\s+/)
    return parts.some((p) => nameParts.some((n) => n.startsWith(p) || p.startsWith(n)))
  })
  return emp ?? null
}

function parseTime(date: string, time: string | null | undefined): Date | null {
  if (!time?.trim()) return null
  const t = time.trim()
  // HH:MM or H:MM
  if (/^\d{1,2}:\d{2}$/.test(t)) return new Date(`${date}T${t.padStart(5, "0")}:00`)
  // HH:MM:SS
  if (/^\d{1,2}:\d{2}:\d{2}$/.test(t)) return new Date(`${date}T${t}`)
  return null
}

const VALID_TYPES = ["NORMAL", "TARDANZA", "FALTA", "VACACIONES", "PERMISO", "INCAPACIDAD"]

function normalizeType(raw?: string): string {
  if (!raw) return "NORMAL"
  const v = raw.trim().toUpperCase()
  if (VALID_TYPES.includes(v)) return v
  if (v.startsWith("TARD")) return "TARDANZA"
  if (v.startsWith("VAC")) return "VACACIONES"
  if (v.startsWith("PERM")) return "PERMISO"
  if (v.startsWith("INCA") || v.startsWith("INCA")) return "INCAPACIDAD"
  if (v.startsWith("FALT") || v === "F") return "FALTA"
  return "NORMAL"
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const isAdmin = ["SUPERADMIN", "ADMIN", "GERENTE"].includes(session.user.role ?? "")
  if (!isAdmin) return NextResponse.json({ error: "Sin permiso" }, { status: 403 })

  const { records }: { records: BulkRow[] } = await req.json()
  if (!Array.isArray(records) || records.length === 0) {
    return NextResponse.json({ error: "Sin registros" }, { status: 400 })
  }

  const employees = await prisma.employee.findMany({
    select: { id: true, fullName: true, itemNumber: true },
  })

  let created = 0
  let updated = 0
  const errors: string[] = []

  for (let i = 0; i < records.length; i++) {
    const row = records[i]
    const emp = findEmployee(row.employee, employees)
    if (!emp) {
      errors.push(`Fila ${i + 2}: empleado "${row.employee}" no encontrado`)
      continue
    }

    const checkIn = parseTime(row.date, row.checkIn)
    const checkOut = parseTime(row.date, row.checkOut)
    const type = normalizeType(row.type) as any

    try {
      const existing = await prisma.attendance.findUnique({
        where: { employeeId_date: { employeeId: emp.id, date: new Date(row.date) } },
      })

      if (existing) {
        await prisma.attendance.update({
          where: { id: existing.id },
          data: { checkIn, checkOut, type, notes: row.notes ?? null, registeredById: session.user.id },
        })
        updated++
      } else {
        await prisma.attendance.create({
          data: {
            employeeId: emp.id,
            date: new Date(row.date),
            checkIn,
            checkOut,
            type,
            notes: row.notes ?? null,
            registeredById: session.user.id,
          },
        })
        created++
      }
    } catch (err: any) {
      errors.push(`Fila ${i + 2} (${row.employee}): ${err.message}`)
    }
  }

  return NextResponse.json({ created, updated, errors, total: created + updated })
}
