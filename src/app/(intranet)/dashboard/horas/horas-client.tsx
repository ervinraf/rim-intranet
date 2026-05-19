"use client"

import { useState, useEffect } from "react"
import { OvertimeForm } from "@/components/overtime/overtime-form"
import { BankBalance } from "@/components/overtime/bank-balance"
import { ApprovalQueue } from "@/components/overtime/approval-queue"
import { TimeOffForm } from "@/components/overtime/timeoff-form"
import { OvertimeHistory } from "@/components/overtime/overtime-history"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Users } from "lucide-react"

interface Employee {
  id: string
  fullName: string
  workdayHours: number
  department: { name: string } | null
}

interface HorasClientProps {
  isAdmin: boolean
  isOperativo: boolean
  salarioBase: number
  sdi: number
  employeeId: string
  employeeWorkdayHours?: number
  employees: Employee[]
}

export function HorasClient({
  isAdmin,
  isOperativo,
  salarioBase,
  sdi,
  employeeId,
  employeeWorkdayHours = 8,
  employees,
}: HorasClientProps) {
  const [refreshKey, setRefreshKey] = useState(0)
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("")
  const [localEmployees, setLocalEmployees] = useState<Employee[]>(employees)
  const [saving, setSaving] = useState(false)
  const refresh = () => setRefreshKey((k) => k + 1)

  const viewEmployeeId = isAdmin ? (selectedEmployeeId || undefined) : employeeId
  const selectedEmployee = localEmployees.find((e) => e.id === selectedEmployeeId)
  const activeWorkdayHours = isAdmin
    ? (selectedEmployee?.workdayHours ?? 8)
    : employeeWorkdayHours

  async function setWorkdayHours(empId: string, hrs: 8 | 9) {
    setSaving(true)
    const res = await fetch(`/api/employees/${empId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workdayHours: hrs }),
    })
    if (res.ok) {
      setLocalEmployees((prev) =>
        prev.map((e) => e.id === empId ? { ...e, workdayHours: hrs } : e)
      )
    }
    setSaving(false)
  }

  return (
    <div className="p-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Banco de horas extras</h1>
          <p className="text-slate-500 mt-1 text-sm">
            Las horas se acreditan al banco una vez aprobadas. Usaas como tiempo libre.
          </p>
        </div>

        {isAdmin && localEmployees.length > 0 && (
          <div className="flex items-center gap-2 flex-shrink-0">
            <Users className="w-4 h-4 text-slate-400" />
            <Select value={selectedEmployeeId} onValueChange={(v) => setSelectedEmployeeId(v === "all" ? "" : v)}>
              <SelectTrigger className="w-52">
                <SelectValue placeholder="Todos los empleados" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los empleados</SelectItem>
                {localEmployees.map((e) => (
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

        <div className="space-y-6">
          {/* Tarjeta de empleado con toggle de jornada */}
          {isAdmin && selectedEmployee && (
            <div className="bg-white border border-slate-200 rounded-xl px-4 py-4 space-y-3">
              <div>
                <p className="text-xs text-slate-400">Empleado seleccionado</p>
                <p className="text-sm font-medium text-slate-800">{selectedEmployee.fullName}</p>
                {selectedEmployee.department && (
                  <p className="text-xs text-slate-500">{selectedEmployee.department.name}</p>
                )}
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1.5">Jornada diaria</p>
                <div className="flex rounded-lg border border-slate-200 overflow-hidden w-fit">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => setWorkdayHours(selectedEmployee.id, 8)}
                    className={`px-4 py-1.5 text-sm font-medium transition-colors ${
                      selectedEmployee.workdayHours === 8
                        ? "bg-slate-800 text-white"
                        : "bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    8 hrs
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => setWorkdayHours(selectedEmployee.id, 9)}
                    className={`px-4 py-1.5 text-sm font-medium transition-colors border-l border-slate-200 ${
                      selectedEmployee.workdayHours === 9
                        ? "bg-slate-800 text-white"
                        : "bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    9 hrs
                  </button>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  {selectedEmployee.workdayHours} hrs = 1 dia en el banco
                </p>
              </div>
            </div>
          )}

          <BankBalance
            key={`balance-${refreshKey}-${selectedEmployeeId}`}
            employeeId={viewEmployeeId}
            hoursPerDay={activeWorkdayHours as 8 | 9}
          />

          {isOperativo && (
            <TimeOffForm onSuccess={refresh} />
          )}
        </div>
      </div>
    </div>
  )
}
