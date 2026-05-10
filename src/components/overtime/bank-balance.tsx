"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock } from "lucide-react"
import { format, isPast } from "date-fns"
import { es } from "date-fns/locale"

interface BankEntry {
  id: string
  hoursCredited: number
  hoursUsed: number
  hoursAvailable: number
  creditedAt: string
  expiresAt: string | null
  isExpired: boolean
  overtimeRecord: {
    weekStart: string
    weekEnd: string
    hoursWorked: number
  } | null
}

interface BankData {
  totalBalance: number
  entries: BankEntry[]
}

interface BankBalanceProps {
  employeeId?: string
}

export function BankBalance({ employeeId }: BankBalanceProps) {
  const [data, setData] = useState<BankData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const url = employeeId
      ? `/api/overtime/balance?employeeId=${employeeId}`
      : "/api/overtime/balance"
    fetch(url)
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false))
  }, [employeeId])

  if (loading) return <div className="h-32 animate-pulse bg-slate-100 rounded-xl" />

  return (
    <div className="space-y-4">
      {/* Saldo total */}
      <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-amber-700">Saldo disponible en banco</p>
              <p className="text-4xl font-bold text-amber-900 mt-1">
                {data?.totalBalance.toFixed(1)}{" "}
                <span className="text-lg font-normal">hrs</span>
              </p>
            </div>
            <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center">
              <Clock className="w-7 h-7 text-amber-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Historial de entradas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-slate-600">
            Historial del banco
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {!data?.entries.length ? (
            <p className="text-sm text-slate-400 px-6 pb-6">Sin registros aun</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {data.entries.map((entry) => {
                const expired = entry.isExpired || (entry.expiresAt && isPast(new Date(entry.expiresAt)))
                return (
                  <div key={entry.id} className="flex items-center justify-between px-6 py-3">
                    <div>
                      <p className="text-sm font-medium text-slate-800">
                        Semana del{" "}
                        {entry.overtimeRecord
                          ? format(new Date(entry.overtimeRecord.weekStart), "d MMM", { locale: es })
                          : "—"}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Acreditado:{" "}
                        {format(new Date(entry.creditedAt), "d MMM yyyy", { locale: es })}
                        {entry.expiresAt && !expired && (
                          <> · Vence: {format(new Date(entry.expiresAt), "d MMM yyyy", { locale: es })}</>
                        )}
                      </p>
                    </div>
                    <div className="text-right">
                      {expired ? (
                        <Badge variant="secondary" className="text-xs">Vencido</Badge>
                      ) : (
                        <span className="text-sm font-semibold text-slate-900">
                          {Number(entry.hoursAvailable).toFixed(1)} hrs
                        </span>
                      )}
                      <p className="text-xs text-slate-400 mt-0.5">
                        Acreditadas: {Number(entry.hoursCredited).toFixed(1)} |{" "}
                        Usadas: {Number(entry.hoursUsed).toFixed(1)}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
