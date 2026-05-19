"use client"

import { useState } from "react"
import { OvertimeForm } from "@/components/overtime/overtime-form"
import { BankBalance } from "@/components/overtime/bank-balance"
import { ApprovalQueue } from "@/components/overtime/approval-queue"
import { TimeOffForm } from "@/components/overtime/timeoff-form"
import { OvertimeHistory } from "@/components/overtime/overtime-history"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Users } from "lucide-react"

interface Employee { id: string; fullName: string; department: { name: string } | null }

interface HorasClientProps {
  isAdmin: boolean
  isOperativo: boolean
  salarioBase: number
  sdi: number
  employeeId: string
  employees: Employee[]
}

export function HorasClient({
  isAdmin,
  isOperativo,
  salarioBase,
  sdi,
  employeeId,
  employees,
}: HorasClientProps) {
  const [refreshKey, setRefreshKey] = useState(0)
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("")
  const refresh = () => setRefreshKey((k) => k + 1)

  const viewEmployeeId = isAdmin
    ? (selectedEmployeeId || undefined)
    : employeeId

  const selectedEmployee = employees.find((e) => e.id === selectedEmployeeId)

  return (
    <div className="p-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Banco de horas extras</h1>
          <p className="text-slate-500 mt-1 text-sm">
            Las horas se acreditan al banco una vez aprobadas. Usaas como tiempo libre.
          </p>
        </div>

        {/* Selector de empleado (solo admin) */}
        {isAdmin && employees.length > 0 && (
          <div className="flex items-center gap-2 flex-shrink-0">
            <Users className="w-4 h-4 text-slate-400" />
            <Select value={selectedEmployeeId} onValueChange={(v) => setSelectedEmployeeId(v === "all" ? "" : v)}>
              <SelectTrigger className="w-52">
                <SelectValue placeholder="Todos los empleados" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los empleados</SelectItem>
                {employees.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.fullName}
                    {e.department && <span className="text-slate-400 ml-1">· {e.department.name}</span>}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna izquierda */}
        <div className="lg:col-span-2 space-y-6">
          {isAdmin && (
            <ApprovalQueue key={`queue-${refreshKey}`} onUpdate={refresh} />
          )}

          {isOperativo && (
            <OvertimeForm
              salarioBase={salarioBase}
              sdi={sdi}
              onSuccess={refresh}
            />
          )}

          <OvertimeHistory
            key={`history-${refreshKey}-${selectedEmployeeId}`}
            isAdmin={isAdmin}
            filterEmployeeId={viewEmployeeId}
          />
        </div>

        {/* Columna derecha — saldo y solicitud */}
        <div className="space-y-6">
          {isAdmin && selectedEmployee && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
              <p className="text-xs text-slate-400">Viendo empleado</p>
              <p className="text-sm font-medium text-slate-800">{selectedEmployee.fullName}</p>
              {selectedEmployee.department && (
                <p className="text-xs text-slate-500">{selectedEmployee.department.name}</p>
              )}
            </div>
          )}
          <BankBalance
            key={`balance-${refreshKey}-${selectedEmployeeId}`}
            employeeId={viewEmployeeId}
          />
          {isOperativo && (
            <TimeOffForm onSuccess={refresh} />
          )}
        </div>
      </div>
    </div>
  )
}
