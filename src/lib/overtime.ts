/**
 * Motor de calculo de horas extras - LFT Mexico
 *
 * Reglas:
 * - Primeras 9 hrs/semana → tiempo DOBLE
 * - Mas de 9 hrs/semana   → el excedente a tiempo TRIPLE
 * - Exencion ISR: si no es salario minimo y no rebasa 9 hrs → todo exento
 * - Las horas se acumulan en banco (Opcion A), no se pagan en efectivo
 */

export interface OvertimeConfig {
  weeklyLimit: number        // default 9
  doubleMultiplier: number   // default 2
  tripleMultiplier: number   // default 3
  workingHoursPerDay: number // default 8
}

export interface OvertimeInput {
  hoursWorked: number
  salarioBase: number       // diario
  sdi: number
  isMinimumWage: boolean
  config?: Partial<OvertimeConfig>
}

export interface OvertimeResult {
  hoursWorked: number
  doubleHours: number
  tripleHours: number
  grossHours: number
  exceeds9Hours: boolean
  isMinimumWage: boolean
  exemptHours: number
  taxableHours: number
  isrRate: number
  taxAmount: number
  netHours: number          // horas que van al banco
}

const DEFAULT_CONFIG: OvertimeConfig = {
  weeklyLimit: 9,
  doubleMultiplier: 2,
  tripleMultiplier: 3,
  workingHoursPerDay: 8,
}

export function calculateOvertime(input: OvertimeInput): OvertimeResult {
  const cfg = { ...DEFAULT_CONFIG, ...input.config }
  const { hoursWorked, salarioBase, isMinimumWage } = input

  const exceeds9Hours = hoursWorked > cfg.weeklyLimit

  // Calculo de horas dobles y triples
  let doubleHours: number
  let tripleHours: number

  if (!exceeds9Hours) {
    doubleHours = hoursWorked * cfg.doubleMultiplier
    tripleHours = 0
  } else {
    doubleHours = cfg.weeklyLimit * cfg.doubleMultiplier
    tripleHours = (hoursWorked - cfg.weeklyLimit) * cfg.tripleMultiplier
  }

  const grossHours = doubleHours + tripleHours

  // Calculo ISR (Art. 93 LISR)
  // Si no es salario minimo y no rebasa 9 hrs → exento total
  let exemptHours: number
  let taxableHours: number
  let isrRate: number
  let taxAmount: number

  if (!isMinimumWage && !exceeds9Hours) {
    exemptHours = grossHours
    taxableHours = 0
    isrRate = 0.0168  // tasa referencial, impuesto = 0
    taxAmount = 0
  } else {
    // Cuando hay excedente o es salario minimo, aplica ISR parcial
    // Exento = equivalente a doble las primeras 9 hrs
    const exemptBase = cfg.weeklyLimit * cfg.doubleMultiplier
    exemptHours = Math.min(grossHours, exemptBase)
    taxableHours = Math.max(0, grossHours - exemptBase)
    isrRate = 0.0168
    const hourlyRate = salarioBase / cfg.workingHoursPerDay
    taxAmount = taxableHours * hourlyRate * isrRate
  }

  // En Opcion A (banco de horas), se acreditan las horas brutas sin conversion a dinero
  // netHours = horas que se agregan al banco del empleado
  const netHours = hoursWorked

  return {
    hoursWorked,
    doubleHours,
    tripleHours,
    grossHours,
    exceeds9Hours,
    isMinimumWage,
    exemptHours,
    taxableHours,
    isrRate,
    taxAmount,
    netHours,
  }
}

export function calculateBankExpiry(
  creditedAt: Date,
  expirationMonths: number
): Date | null {
  if (expirationMonths === 0) return null
  const expiry = new Date(creditedAt)
  expiry.setMonth(expiry.getMonth() + expirationMonths)
  return expiry
}

export function getEmployeeTotalBalance(
  bankEntries: Array<{
    hoursAvailable: number
    expiresAt: Date | null
    isExpired: boolean
  }>
): number {
  const now = new Date()
  return bankEntries.reduce((total, entry) => {
    if (entry.isExpired) return total
    if (entry.expiresAt && entry.expiresAt < now) return total
    return total + entry.hoursAvailable
  }, 0)
}
