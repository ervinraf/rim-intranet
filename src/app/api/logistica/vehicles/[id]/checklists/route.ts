import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const DEFAULT_ITEMS = [
  { category: "Motor", description: "Nivel de aceite" },
  { category: "Motor", description: "Nivel de refrigerante" },
  { category: "Motor", description: "Nivel de agua limpiabrisas" },
  { category: "Frenos", description: "Freno de servicio" },
  { category: "Frenos", description: "Freno de emergencia" },
  { category: "Iluminacion", description: "Faros delanteros" },
  { category: "Iluminacion", description: "Faros traseros / calaveras" },
  { category: "Iluminacion", description: "Intermitentes / direccionales" },
  { category: "Neumaticos", description: "Presion y estado llanta delantera izquierda" },
  { category: "Neumaticos", description: "Presion y estado llanta delantera derecha" },
  { category: "Neumaticos", description: "Presion y estado llanta trasera izquierda" },
  { category: "Neumaticos", description: "Presion y estado llanta trasera derecha" },
  { category: "Neumaticos", description: "Llanta de refaccion" },
  { category: "Documentos", description: "Tarjeta de circulacion" },
  { category: "Documentos", description: "Poliza de seguro vigente" },
  { category: "Documentos", description: "Verificacion vigente" },
  { category: "Seguridad", description: "Extintor" },
  { category: "Seguridad", description: "Botiquin de primeros auxilios" },
  { category: "Seguridad", description: "Triangulos de emergencia" },
  { category: "General", description: "Limpieza interior" },
  { category: "General", description: "Limpieza exterior" },
]

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id: vehicleId } = await params
  const { driverId, date, observations, items } = await req.json()

  const checklistItems = items ?? DEFAULT_ITEMS.map((item, i) => ({ ...item, status: "OK", order: i }))

  const checklist = await prisma.vehicleChecklist.create({
    data: {
      vehicleId,
      driverId: driverId || null,
      filledById: session.user.id,
      date: new Date(date ?? new Date()),
      observations: observations?.trim() || null,
      items: {
        create: checklistItems.map((item: any, i: number) => ({
          category: item.category,
          description: item.description,
          status: item.status ?? "OK",
          notes: item.notes || null,
          order: item.order ?? i,
        })),
      },
    },
    include: { items: { orderBy: { order: "asc" } } },
  })

  return NextResponse.json(checklist, { status: 201 })
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id: vehicleId } = await params

  const checklists = await prisma.vehicleChecklist.findMany({
    where: { vehicleId },
    include: {
      items: { orderBy: { order: "asc" } },
    },
    orderBy: { date: "desc" },
    take: 20,
  })

  return NextResponse.json(checklists)
}

export { DEFAULT_ITEMS }
