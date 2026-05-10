"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface TimeOffFormProps {
  onSuccess: () => void
}

export function TimeOffForm({ onSuccess }: TimeOffFormProps) {
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [hours, setHours] = useState("")
  const [reason, setReason] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)
    setSuccess(false)

    const res = await fetch("/api/timeoff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        hoursRequested: parseFloat(hours),
        dateFrom,
        dateTo,
        reason,
      }),
    })

    setLoading(false)

    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? "Error al enviar solicitud")
      return
    }

    setSuccess(true)
    setDateFrom("")
    setDateTo("")
    setHours("")
    setReason("")
    onSuccess()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Solicitar tiempo libre</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="dateFrom">Fecha inicio</Label>
              <Input
                id="dateFrom"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dateTo">Fecha fin</Label>
              <Input
                id="dateTo"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                min={dateFrom}
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="hoursReq">Horas a usar del banco</Label>
            <Input
              id="hoursReq"
              type="number"
              min="1"
              step="0.5"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              placeholder="8"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="reason">Motivo (opcional)</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              placeholder="Motivo de la ausencia..."
            />
          </div>

          {error && (
            <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-md px-3 py-2">
              {error}
            </p>
          )}

          {success && (
            <p className="text-sm text-green-600 bg-green-50 border border-green-100 rounded-md px-3 py-2">
              Solicitud enviada. Tu gerente la revisara.
            </p>
          )}

          <Button type="submit" variant="outline" className="w-full" disabled={loading}>
            {loading ? "Enviando..." : "Solicitar tiempo libre"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
