import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

interface BulkRow {
  codigo?: string
  nombre: string
  marca?: string
  modelo?: string
  noSerie?: string
  departamento?: string
  ubicacion?: string
  fechaCompra?: string
  precioCompra?: string
  proxServicio?: string
  notas?: string
}

function parseDate(val?: string): Date | null {
  if (!val?.trim()) return null
  const str = val.trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return new Date(str)
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(str)) {
    const [d, m, y] = str.split("/")
    return new Date(`${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`)
  }
  const d = new Date(str)
  return isNaN(d.getTime()) ? null : d
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const isAdmin = ["SUPERADMIN", "ADMIN"].includes(session.user.role ?? "")
  if (!isAdmin) return NextResponse.json({ error: "Sin permiso" }, { status: 403 })

  const { records }: { records: BulkRow[] } = await req.json()
  if (!Array.isArray(records) || records.length === 0) {
    return NextResponse.json({ error: "Sin registros" }, { status: 400 })
  }

  const departments = await prisma.department.findMany({ select: { id: true, name: true } })

  function findDept(name?: string): string | undefined {
    if (!name?.trim()) return undefined
    const n = name.trim().toLowerCase()
    const d = departments.find((d) =>
      d.name.toLowerCase() === n || d.name.toLowerCase().includes(n) || n.includes(d.name.toLowerCase())
    )
    return d?.id
  }

  let created = 0
  let skipped = 0
  const errors: string[] = []

  for (let i = 0; i < records.length; i++) {
    const row = records[i]
    if (!row.nombre?.trim()) {
      errors.push(`Fila ${i + 2}: nombre requerido`)
      continue
    }

    const price = row.precioCompra ? parseFloat(row.precioCompra) : null

    try {
      await prisma.equipment.create({
        data: {
          name: row.nombre.trim(),
          code: row.codigo?.trim() || null,
          brand: row.marca?.trim() || null,
          model: row.modelo?.trim() || null,
          serialNumber: row.noSerie?.trim() || null,
          departmentId: findDept(row.departamento) ?? null,
          location: row.ubicacion?.trim() || null,
          notes: row.notas?.trim() || null,
          purchaseDate: parseDate(row.fechaCompra),
          purchasePrice: price && !isNaN(price) ? price : null,
          nextServiceDate: parseDate(row.proxServicio),
        } as any,
      })
      created++
    } catch (err: any) {
      if (err.code === "P2002") {
        skipped++
      } else {
        errors.push(`Fila ${i + 2} (${row.nombre}): ${err.message}`)
      }
    }
  }

  return NextResponse.json({ created, skipped, errors, total: created + skipped })
}
