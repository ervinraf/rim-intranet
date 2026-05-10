"use client"

import { useState } from "react"
import { OvertimeForm } from "@/components/overtime/overtime-form"
import { BankBalance } from "@/components/overtime/bank-balance"
import { ApprovalQueue } from "@/components/overtime/approval-queue"
import { TimeOffForm } from "@/components/overtime/timeoff-form"
import { OvertimeHistory } from "@/components/overtime/overtime-history"

interface HorasClientProps {
  isAdmin: boolean
  isOperativo: boolean
  salarioBase: number
  sdi: number
  employeeId: string
}

export function HorasClient({
  isAdmin,
  isOperativo,
  salarioBase,
  sdi,
  employeeId,
}: HorasClientProps) {
  const [refreshKey, setRefreshKey] = useState(0)
  const refresh = () => setRefreshKey((k) => k + 1)

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Banco de horas extras</h1>
        <p className="text-slate-500 mt-1 text-sm">
          Las horas se acreditan al banco una vez aprobadas. Usaas como tiempo libre.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna izquierda */}
        <div className="lg:col-span-2 space-y-6">
          {/* Cola de aprobacion — solo admins y gerentes */}
          {isAdmin && (
            <ApprovalQueue key={`queue-${refreshKey}`} onUpdate={refresh} />
          )}

          {/* Formulario de registro — solo operativos */}
          {isOperativo && (
            <OvertimeForm
              salarioBase={salarioBase}
              sdi={sdi}
              onSuccess={refresh}
            />
          )}

          {/* Historial */}
          <OvertimeHistory
            key={`history-${refreshKey}`}
            isAdmin={isAdmin}
          />
        </div>

        {/* Columna derecha — saldo y solicitud */}
        <div className="space-y-6">
          <BankBalance
            key={`balance-${refreshKey}`}
            employeeId={isAdmin ? undefined : employeeId}
          />
          {isOperativo && (
            <TimeOffForm onSuccess={refresh} />
          )}
        </div>
      </div>
    </div>
  )
}
