"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { downloadCsv } from "@/lib/csv"

interface OvertimeRecord {
  id: string
  weekStart: string
  weekEnd: string
  hoursWorked: number
  doubleHours: number
  tripleHours: number
  netHours: number
  exceeds9Hours: boolean
  status: string
  createdAt: string
  notes: string | null
  employee: { fullName: string; department: { name: string } | null }
}

const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
  PENDIENTE: { label: "Pendiente", variant: "secondary" },
  APROBADO: { label: "Aprobado", variant: "default" },
  RECHAZADO: { label: "Rechazado", variant: "destructive" },
}

export function OvertimeHistory({ isAdmin, filterEmployeeId }: { isAdmin: boolean; filterEmployeeId?: string }) {
  const [records, setRecords] = useState<OvertimeRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const url = filterEmployeeId
      ? `/api/overtime?employeeId=${filterEmployeeId}`
      : "/api/overtime"
    fetch(url)
      .then((r) => r.json())
      .then(setRecords)
      .finally(() => setLoading(false))
  }, [filterEmployeeId])

  function exportCsv() {
    const header = ["Empleado", "Departamento", "Semana inicio", "Semana fin", "Hrs trabajadas", "Hrs dobles", "Hrs triples", "Hrs banco", "Estado"]
    const rows = records.map((r) => [
      r.employee.fullName,
      r.employee.department?.name ?? "",
      format(new Date(r.weekStart), "yyyy-MM-dd"),
      format(new Date(r.weekEnd), "yyyy-MM-dd"),
      String(r.hoursWorked),
      String(r.doubleHours),
      String(r.tripleHours),
      String(r.netHours),
      r.status,
    ])
    downloadCsv([header, ...rows], `horas_extras_${new Date().toISOString().slice(0, 10)}.csv`)
  }

  if (loading) return <div className="h-40 animate-pulse bg-slate-100 rounded-xl" />

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-slate-600">
          {isAdmin ? "Todos los registros" : "Mis registros"}
        </CardTitle>
        {records.length > 0 && (
          <Button variant="ghost" size="sm" onClick={exportCsv} className="text-slate-500">
            <Download className="w-3.5 h-3.5 mr-1" />
            CSV
          </Button>
        )}
      </CardHeader>
      <CardContent className="p-0">
        {records.length === 0 ? (
          <p className="text-sm text-slate-400 px-6 pb-6">Sin registros</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {records.map((r) => {
              const st = statusLabels[r.status] ?? { label: r.status, variant: "default" as const }
              return (
                <div key={r.id} className="px-6 py-3 flex items-center justify-between">
                  <div>
                    {isAdmin && (
                      <p className="text-sm font-medium text-slate-800">{r.employee.fullName}</p>
                    )}
                    <p className="text-sm text-slate-600">
                      Semana del{" "}
                      {format(new Date(r.weekStart), "d MMM", { locale: es })} al{" "}
                      {format(new Date(r.weekEnd), "d MMM yyyy", { locale: es })}
                    </p>
                    <div className="flex gap-2 mt-1">
                      <span className="text-xs text-slate-400">{r.hoursWorked} hrs trabajadas</span>
                      {r.exceeds9Hours && (
                        <span className="text-xs text-red-500">· rebasa 9 hrs</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant={st.variant} className="text-xs mb-1">
                      {st.label}
                    </Badge>
                    {r.status === "APROBADO" && (
                      <p className="text-xs text-green-600">+{r.netHours} hrs banco</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
