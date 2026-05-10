"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function NuevoProyectoPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [form, setForm] = useState({
    name: "",
    clientName: "",
    clientEmail: "",
    location: "",
    description: "",
    status: "NUEVO",
    startDate: "",
    endDate: "",
  })

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((p) => ({ ...p, [key]: e.target.value }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)

    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        clientEmail: form.clientEmail || undefined,
        endDate: form.endDate || undefined,
      }),
    })

    setLoading(false)

    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? "Error al crear el proyecto")
      return
    }

    const project = await res.json()
    router.push(`/dashboard/proyectos/${project.id}`)
  }

  return (
    <div className="p-8 max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard/proyectos">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Proyectos
          </Button>
        </Link>
        <h1 className="text-2xl font-semibold text-slate-900">Nuevo proyecto</h1>
      </div>

      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Datos del proyecto */}
            <div className="space-y-1.5">
              <Label>Nombre del proyecto *</Label>
              <Input
                value={form.name}
                onChange={set("name")}
                placeholder="Instalacion de estructura industrial..."
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Cliente *</Label>
                <Input
                  value={form.clientName}
                  onChange={set("clientName")}
                  placeholder="Empresa ABC..."
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Correo del cliente</Label>
                <Input
                  type="email"
                  value={form.clientEmail}
                  onChange={set("clientEmail")}
                  placeholder="cliente@empresa.com"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Ubicacion</Label>
                <Input
                  value={form.location}
                  onChange={set("location")}
                  placeholder="Monterrey, NL..."
                />
              </div>
              <div className="space-y-1.5">
                <Label>Estatus</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => setForm((p) => ({ ...p, status: v ?? "NUEVO" }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NUEVO">Nuevo</SelectItem>
                    <SelectItem value="EN_DESARROLLO">En desarrollo</SelectItem>
                    <SelectItem value="CERRADO">Cerrado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Fecha de inicio *</Label>
                <Input
                  type="date"
                  value={form.startDate}
                  onChange={set("startDate")}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Fecha estimada de entrega</Label>
                <Input
                  type="date"
                  value={form.endDate}
                  onChange={set("endDate")}
                  min={form.startDate}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Descripcion</Label>
              <Textarea
                value={form.description}
                onChange={set("description")}
                rows={3}
                placeholder="Descripcion general del proyecto..."
              />
            </div>

            {error && (
              <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-4 py-3">
                {error}
              </p>
            )}

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={loading}>
                {loading ? "Creando..." : "Crear proyecto"}
              </Button>
              <Link href="/dashboard/proyectos">
                <Button type="button" variant="outline">Cancelar</Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
