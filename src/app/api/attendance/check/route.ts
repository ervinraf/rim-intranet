import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

function findEmployee(identifier: string, employees: { id: string; fullName: string; itemNumber: number | null }[]) {
  const clean = identifier.trim().toLowerCase()
  if (!clean) return null
  let emp = employees.find((e) => e.fullName.toLowerCase() === clean)
  if (emp) return emp
  const num = parseInt(identifier.trim())
  if (!isNaN(num)) {
    emp = employees.find((e) => e.itemNumber === num)
    if (emp) return emp
  }
  emp = employees.find((e) => {
    const name = e.fullName.toLowerCase()
    return name.includes(clean) || clean.includes(name.split(" ")[0])
  })
  return emp ?? null
}

// POST /api/attendance/check
// Body: { records: { employee: string, date: string }[] }
// Returns per-sheet counts: { existing, notFound, total }
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { records }: { records: { employee: string; date: string }[] } = await req.json()
  if (!Array.isArray(records) || records.length === 0) {
    return NextResponse.json({ existing: 0, notFound: 0, total: 0 })
  }

  const employees = await prisma.employee.findMany({
    select: { id: true, fullName: true, itemNumber: true },
  })

  const resolved: { employeeId: string; date: Date }[] = []
  let notFound = 0

  for (const r of records) {
    const emp = findEmployee(r.employee, employees)
    if (!emp) { notFound++; continue }
    resolved.push({ employeeId: emp.id, date: new Date(r.date) })
  }

  if (resolved.length === 0) {
    return NextResponse.json({ existing: 0, notFound, total: records.length })
  }

  const existingRecords = await prisma.attendance.findMany({
    where: { OR: resolved.map((p) => ({ employeeId: p.employeeId, date: p.date })) },
    select: { employeeId: true, date: true },
  })

  return NextResponse.json({
    existing: existingRecords.length,
    notFound,
    total: records.length,
  })
}
