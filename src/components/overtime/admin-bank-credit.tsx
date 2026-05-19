"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PlusCircle } from "lucide-react"

interface Props {
  employeeId: string
  employeeName: string
  onSuccess: () => void
}

export function AdminBankCredit({ employeeId, employeeName, onSuccess }: Props) {
  const [open, setOpen] = useState(false)
  const [hours, setHours] = useState("")
  const [expiresAt, setExpiresAt] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)
    const res = await fetch("/api/overtime/bank-credit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        employeeId,
        hours: parseFloat(hours),
        expiresAt: expiresAt || null,
      }),
    })
    setLoading(false)
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setError(d.error ?? "Error al acreditar horas")
      return
    }
    setHours("")
    setExpiresAt("")
    setOpen(false)
    onSuccess()
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-slate-600 flex items-center justify-between">
          Acreditar horas manualmente
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="text-xs text-amber-600 hover:text-amber-700 font-normal flex items-center gap-1"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            {open ? "Cancelar" : "Nueva acreditacion"}
          </button>
        </CardTitle>
      </CardHeader>

      {open && (
        <CardContent>
          <form onSubmit={submit} className="space-y-3">
            <p className="text-xs text-slate-500">Empleado: <strong>{employeeName}</strong></p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Horas a acreditar *</Label>
                <Input
                  type="number"
                  min="0.5"
                  step="0.5"
                  placeholder="8"
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Vence el (opcional)</Label>
                <Input
                  type="date"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                />
              </div>
            </div>
            {error && (
              <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded px-3 py-2">{error}</p>
            )}
            <Button type="submit" size="sm" disabled={!hours || loading}>
              {loading ? "Acreditando..." : "Acreditar horas"}
            </Button>
          </form>
        </CardContent>
      )}
    </Card>
  )
}
