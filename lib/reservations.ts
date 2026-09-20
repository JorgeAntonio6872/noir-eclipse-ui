export type Draft = {
  people: string;
  date: string;
  time: string;
  duration: string;
};
export type Booking = {
  userId?: string;
  occasion?: string;
  id: string;
  table: number;
  people: number;
  start: string;
  minutes: number;
  status: "confirmed" | "cancelled";
  createdAt: string;
};
export type LocalData = { version: 1; name: string; bookings: Booking[] };
export const STORAGE_KEY = "noir-eclipse.v1";
export const TABLES = [
  { id: 1, capacity: 8 },
  { id: 2, capacity: 4 },
  { id: 3, capacity: 4 },
  { id: 4, capacity: 4 },
  { id: 5, capacity: 8 },
  { id: 6, capacity: 6 },
] as const;
export const EMPTY_DATA: LocalData = { version: 1, name: "", bookings: [] };
export const EMPTY_DRAFT: Draft = {
  people: "2",
  date: "",
  time: "",
  duration: "60",
};

export function localDate(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Costa_Rica",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  return ["year", "month", "day"]
    .map((type) => parts.find((part) => part.type === type)?.value)
    .join("-");
}
export function startOf(draft: Pick<Draft, "date" | "time">): Date {
  return new Date(`${draft.date}T${draft.time}:00-06:00`);
}
export function validateDraft(draft: Draft, now = new Date()): string | null {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(draft.date) ||
    !/^\d{2}:\d{2}$/.test(draft.time)
  )
    return "Selecciona una fecha y una hora.";
  const start = startOf(draft);
  if (!Number.isFinite(start.getTime()) || localDate(start) !== draft.date)
    return "La fecha no es válida.";
  if (draft.date.slice(0, 4) !== localDate(now).slice(0, 4))
    return "Selecciona una fecha de este año.";
  const people = Number(draft.people),
    duration = Number(draft.duration);
  if (!Number.isInteger(people) || people < 1 || people > 8)
    return "Selecciona entre 1 y 8 personas.";
  if (![60, 90, 120, 150, 180].includes(duration))
    return "La duración debe ser de 1 a 3 horas, en bloques de 30 minutos.";
  const [hour, minute] = draft.time.split(":").map(Number);
  if (
    hour > 23 ||
    ![0, 30].includes(minute) ||
    hour * 60 + minute < 420 ||
    hour * 60 + minute + duration > 1260
  )
    return "La reserva completa debe estar entre las 07:00 y las 21:00.";
  if (start.getTime() < now.getTime() + 30 * 60000)
    return "Elige un horario con al menos 30 minutos de anticipación.";
  return null;
}
export function timeOptions(
  date: string,
  duration: string,
  now = new Date(),
): string[] {
  if (!date) return [];
  const result: string[] = [];
  for (let minute = 420; minute <= 1200; minute += 30) {
    const time = `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
    if (!validateDraft({ date, time, duration, people: "1" }, now))
      result.push(time);
  }
  return result;
}
export function overlaps(booking: Booking, draft: Draft): boolean {
  const start = startOf(draft).getTime(),
    end = start + Number(draft.duration) * 60000,
    bookedStart = new Date(booking.start).getTime();
  return (
    booking.status === "confirmed" &&
    start < bookedStart + booking.minutes * 60000 &&
    end > bookedStart
  );
}
export function tableState(
  table: (typeof TABLES)[number],
  draft: Draft,
  bookings: Booking[],
): "available" | "reserved" | "capacity" {
  // Capacity limits are temporarily disabled for the local prototype.
  return bookings.some(
    (booking) => booking.table === table.id && overlaps(booking, draft),
  )
    ? "reserved"
    : "available";
}
export function canCancel(booking: Booking, now = new Date()): boolean {
  return (
    booking.status === "confirmed" &&
    new Date(booking.start).getTime() - now.getTime() >= 2 * 60 * 60000
  );
}
export function formatDate(value: string): string {
  return new Intl.DateTimeFormat("es-CR", {
    timeZone: "America/Costa_Rica",
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}
export function formatTime(value: string): string {
  return new Intl.DateTimeFormat("es-CR", {
    timeZone: "America/Costa_Rica",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(value));
}
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
export function parseData(raw: string | null): LocalData {
  if (raw === null) return { ...EMPTY_DATA, bookings: [] };
  const value: unknown = JSON.parse(raw);
  if (
    !isRecord(value) ||
    value.version !== 1 ||
    typeof value.name !== "string" ||
    value.name.length > 60 ||
    !Array.isArray(value.bookings)
  )
    throw new Error("Formato local no compatible");
  const bookings: Booking[] = value.bookings.map((item: unknown) => {
    if (
      !isRecord(item) ||
      typeof item.id !== "string" ||
      !item.id.trim() ||
      (item.userId !== undefined && typeof item.userId !== "string") ||
      (item.occasion !== undefined &&
        (typeof item.occasion !== "string" || item.occasion.length > 80)) ||
      typeof item.table !== "number" ||
      !TABLES.some((table) => table.id === item.table) ||
      typeof item.people !== "number" ||
      !Number.isInteger(item.people) ||
      item.people < 1 ||
      item.people > 8 ||
      typeof item.start !== "string" ||
      !Number.isFinite(Date.parse(item.start)) ||
      typeof item.minutes !== "number" ||
      ![60, 90, 120, 150, 180].includes(item.minutes) ||
      (item.status !== "confirmed" && item.status !== "cancelled") ||
      typeof item.createdAt !== "string" ||
      !Number.isFinite(Date.parse(item.createdAt))
    )
      throw new Error("Reserva local no válida");
    return {
      ...(typeof item.userId === "string" ? { userId: item.userId } : {}),
      ...(typeof item.occasion === "string" ? { occasion: item.occasion } : {}),
      id: item.id,
      table: item.table,
      people: item.people,
      start: item.start,
      minutes: item.minutes,
      status: item.status,
      createdAt: item.createdAt,
    };
  });
  if (new Set(bookings.map((booking) => booking.id)).size !== bookings.length)
    throw new Error("Reservas duplicadas");
  return { version: 1, name: value.name, bookings };
}
