"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { calculateOvertime } from "@/lib/overtime"

interface OvertimeFormProps {
  salarioBase: number
  sdi: number
  onSuccess: () => void
}

export function OvertimeForm({ salarioBase, sdi, onSuccess }: OvertimeFormProps) {
  const [weekStart, setWeekStart] = useState("")
  const [hoursWorked, setHoursWorked] = useState("")
  const [notes, setNotes] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const hours = parseFloat(hoursWorked) || 0
  const preview = hours > 0 ? calculateOvertime({ hoursWorked: hours, salarioBase, sdi, isMinimumWage: false }) : null

  // Calcula lunes y domingo de la semana seleccionada
  function getWeekRange(dateStr: string) {
    const d = new Date(dateStr)
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1)
    const monday = new Date(d.setDate(diff))
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    return {
      start: monday.toISOString().split("T")[0],
      end: sunday.toISOString().split("T")[0],
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)

    const { start, end } = getWeekRange(weekStart)

    const res = await fetch("/api/overtime", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        weekStart: start,
        weekEnd: end,
        hoursWorked: hours,
        notes,
      }),
    })

    setLoading(false)

    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? "Error al registrar")
      return
    }

    onSuccess()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Registrar horas extras</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="weekStart">Semana (cualquier dia)</Label>
              <Input
                id="weekStart"
                type="date"
                value={weekStart}
                onChange={(e) => setWeekStart(e.target.value)}
                required
              />
              {weekStart && (
                <p className="text-xs text-slate-500">
                  Semana: {getWeekRange(weekStart).start} al {getWeekRange(weekStart).end}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="hours">Horas extras trabajadas</Label>
              <Input
                id="hours"
                type="number"
                min="0.5"
                max="80"
                step="0.5"
                value={hoursWorked}
                onChange={(e) => setHoursWorked(e.target.value)}
                placeholder="9"
                required
              />
            </div>
          </div>

          {/* Preview del calculo */}
          {preview && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-sm">
              <p className="font-medium text-amber-800 mb-2">Calculo LFT</p>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-amber-700">
                <span>Horas trabajadas:</span>
                <span className="font-medium">{preview.hoursWorked} hrs</span>
                <span>Horas dobles:</span>
                <span className="font-medium">{preview.doubleHours} hrs</span>
                {preview.tripleHours > 0 && (
                  <>
                    <span>Horas triples:</span>
                    <span className="font-medium text-red-600">{preview.tripleHours} hrs</span>
                  </>
                )}
                <span className="border-t border-amber-300 pt-1">Se acreditan al banco:</span>
                <span className="font-medium border-t border-amber-300 pt-1">
                  {preview.netHours} hrs
                </span>
              </div>
              {preview.exceeds9Hours && (
                <p className="mt-2 text-xs text-red-600 font-medium">
                  Rebasa 9 hrs semanales — aplican horas triples
                </p>
              )}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="notes">Notas (opcional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Motivo de las horas extras..."
              rows={2}
            />
          </div>

          {error && (
            <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-md px-3 py-2">
              {error}
            </p>
          )}

          <Button type="submit" disabled={loading || !weekStart || !hoursWorked}>
            {loading ? "Enviando..." : "Enviar para aprobacion"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
