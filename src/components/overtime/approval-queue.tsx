"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Check, X } from "lucide-react"

interface OvertimeRecord {
  id: string
  weekStart: string
  weekEnd: string
  hoursWorked: number
  doubleHours: number
  tripleHours: number
  grossHours: number
  exceeds9Hours: boolean
  netHours: number
  notes: string | null
  status: string
  createdAt: string
  employee: {
    fullName: string
    department: { name: string } | null
  }
}

interface ApprovalQueueProps {
  onUpdate?: () => void
}

export function ApprovalQueue({ onUpdate }: ApprovalQueueProps) {
  const [records, setRecords] = useState<OvertimeRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<string | null>(null)

  function load() {
    fetch("/api/overtime?status=PENDIENTE")
      .then((r) => r.json())
      .then(setRecords)
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  async function handleAction(id: string, action: "approve" | "reject") {
    setProcessing(id)
    await fetch(`/api/overtime/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    })
    setProcessing(null)
    load()
    onUpdate?.()
  }

  if (loading) return <div className="h-32 animate-pulse bg-slate-100 rounded-xl" />

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-slate-600 flex items-center justify-between">
          Pendientes de aprobacion
          {records.length > 0 && (
            <Badge variant="destructive" className="text-xs">{records.length}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {records.length === 0 ? (
          <p className="text-sm text-slate-400 px-6 pb-6">Sin solicitudes pendientes</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {records.map((r) => (
              <div key={r.id} className="px-6 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium text-slate-900 text-sm">{r.employee.fullName}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {r.employee.department?.name} ·{" "}
                      Semana del{" "}
                      {format(new Date(r.weekStart), "d MMM", { locale: es })} al{" "}
                      {format(new Date(r.weekEnd), "d MMM yyyy", { locale: es })}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-3 text-xs">
                      <span className="bg-slate-100 rounded px-2 py-0.5 text-slate-600">
                        {r.hoursWorked} hrs trabajadas
                      </span>
                      <span className="bg-amber-100 rounded px-2 py-0.5 text-amber-700">
                        {r.doubleHours} hrs dobles
                      </span>
                      {r.tripleHours > 0 && (
                        <span className="bg-red-100 rounded px-2 py-0.5 text-red-700">
                          {r.tripleHours} hrs triples
                        </span>
                      )}
                      <span className="bg-green-100 rounded px-2 py-0.5 text-green-700 font-medium">
                        +{r.netHours} hrs al banco
                      </span>
                    </div>
                    {r.notes && (
                      <p className="text-xs text-slate-500 mt-1 italic">{r.notes}</p>
                    )}
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-red-200 text-red-600 hover:bg-red-50 h-8 w-8 p-0"
                      disabled={processing === r.id}
                      onClick={() => handleAction(r.id, "reject")}
                      title="Rechazar"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700 h-8 w-8 p-0"
                      disabled={processing === r.id}
                      onClick={() => handleAction(r.id, "approve")}
                      title="Aprobar"
                    >
                      <Check className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
