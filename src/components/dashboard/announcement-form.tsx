"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"

interface Department { id: string; name: string }

interface Props {
  departments: Department[]
  onSuccess: (announcement: any) => void
  onCancel: () => void
}

export function AnnouncementForm({ departments, onSuccess, onCancel }: Props) {
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [type, setType] = useState("GENERAL")
  const [targetDept, setTargetDept] = useState("")
  const [isPinned, setIsPinned] = useState(false)
  const [expiresAt, setExpiresAt] = useState("")
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const res = await fetch("/api/announcements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        content,
        type,
        targetDepartmentId: targetDept || null,
        isPinned,
        expiresAt: expiresAt || null,
      }),
    })
    if (res.ok) {
      const a = await res.json()
      onSuccess(a)
    }
    setLoading(false)
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <p className="text-sm font-semibold text-slate-800 mb-3">Nuevo aviso</p>
      <form onSubmit={submit} className="space-y-3">
        <div className="space-y-1.5">
          <Label>Tipo</Label>
          <Select value={type} onValueChange={(v) => setType(v ?? "GENERAL")}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="GENERAL">General</SelectItem>
              <SelectItem value="URGENTE">Urgente</SelectItem>
              <SelectItem value="CUMPLEANOS">Cumpleanos / Aniversario</SelectItem>
              <SelectItem value="FELICITACION">Felicitacion</SelectItem>
              <SelectItem value="CAPACITACION">Capacitacion</SelectItem>
              <SelectItem value="OPERACIONES">Operaciones</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Titulo *</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="Asunto del aviso..." />
        </div>

        <div className="space-y-1.5">
          <Label>Mensaje *</Label>
          <Textarea value={content} onChange={(e) => setContent(e.target.value)} required rows={3} placeholder="Contenido del aviso..." />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Para departamento</Label>
            <Select value={targetDept} onValueChange={(v) => setTargetDept(v ?? "")}>
              <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos los departamentos</SelectItem>
                {departments.map((d) => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Vence el</Label>
            <Input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
          <input
            type="checkbox"
            checked={isPinned}
            onChange={(e) => setIsPinned(e.target.checked)}
            className="rounded"
          />
          Fijar al inicio del tablero
        </label>

        <div className="flex gap-2">
          <Button type="submit" size="sm" disabled={!title || !content || loading} className="flex-1">
            {loading ? "Publicando..." : "Publicar"}
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={onCancel}>Cancelar</Button>
        </div>
      </form>
    </div>
  )
}
