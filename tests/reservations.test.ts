import assert from "node:assert/strict";
import test from "node:test";
import {
  Booking,
  Draft,
  TABLES,
  canCancel,
  localDate,
  overlaps,
  parseData,
  tableState,
  timeOptions,
  validateDraft,
} from "../lib/reservations";

const now = new Date("2026-09-20T14:00:00Z"); // 08:00 en Costa Rica.
const draft: Draft = {
  date: "2026-09-20",
  time: "09:00",
  duration: "120",
  people: "2",
};
const booking: Booking = {
  id: "test",
  table: 1,
  people: 2,
  start: "2026-09-20T15:00:00.000Z",
  minutes: 120,
  status: "confirmed",
  createdAt: now.toISOString(),
};

test("Costa Rica conserva el día correcto al cruzar medianoche UTC", () => {
  assert.equal(localDate(new Date("2026-09-21T03:00:00Z")), "2026-09-20");
});
test("acepta el límite exacto de 30 minutos y rechaza un segundo menos", () => {
  assert.equal(validateDraft({ ...draft, time: "08:30" }, now), null);
  assert.notEqual(
    validateDraft({ ...draft, time: "08:30" }, new Date(now.getTime() + 1000)),
    null,
  );
});
test("valida fecha real, cantidad, duración y alineación de bloques", () => {
  for (const change of [
    { date: "2026-02-30" },
    { date: "2026-11-31" },
    { date: "2027-01-01" },
    { people: "0" },
    { people: "9" },
    { people: "1.5" },
    { duration: "-60" },
    { duration: "240" },
    { time: "09:15" },
    { time: "" },
  ]) {
    assert.notEqual(validateDraft({ ...draft, ...change }, now), null);
  }
});
test("toda la visita termina antes del cierre", () => {
  assert.equal(
    validateDraft({ ...draft, time: "20:00", duration: "60" }, now),
    null,
  );
  assert.notEqual(
    validateDraft({ ...draft, time: "20:30", duration: "60" }, now),
    null,
  );
  assert.equal(timeOptions(draft.date, "180", now).at(-1), "18:00");
  assert.deepEqual(timeOptions("2026-09-19", "60", now), []);
});
test("no admite solapes parciales ni una reserva que envuelva otra", () => {
  assert.equal(overlaps(booking, { ...draft, time: "10:00" }), true);
  assert.equal(
    overlaps(booking, { ...draft, time: "08:30", duration: "180" }),
    true,
  );
  assert.equal(overlaps(booking, { ...draft, time: "11:00" }), false);
  assert.equal(
    overlaps(booking, { ...draft, time: "08:00", duration: "60" }),
    false,
  );
});
test("la cancelación libera el bloque y respeta el límite de dos horas", () => {
  assert.equal(overlaps({ ...booking, status: "cancelled" }, draft), false);
  const limit = new Date(Date.parse(booking.start) - 7200000);
  assert.equal(canCancel(booking, limit), true);
  assert.equal(canCancel(booking, new Date(limit.getTime() + 1)), false);
  assert.equal(canCancel({ ...booking, status: "cancelled" }, limit), false);
});
test("todas las mesas admiten ocho personas mientras la capacidad está desactivada", () => {
  assert.equal(tableState(TABLES[0], draft, [booking]), "reserved");
  assert.equal(tableState(TABLES[1], draft, [booking]), "available");
  for (const table of TABLES) {
    assert.equal(tableState(table, { ...draft, people: "8" }, []), "available");
    const data = {
      version: 1,
      name: "",
      bookings: [{ ...booking, table: table.id, people: 8 }],
    };
    assert.deepEqual(parseData(JSON.stringify(data)), data);
  }
});
test("el almacenamiento valida formato y no acepta reservas corruptas", () => {
  assert.deepEqual(parseData(null), { version: 1, name: "", bookings: [] });
  const data = { version: 1, name: "Prueba", bookings: [booking] };
  assert.deepEqual(parseData(JSON.stringify(data)), data);
  const owned = {
    ...data,
    bookings: [{ ...booking, userId: "local-user", occasion: "Cumpleaños" }],
  };
  assert.deepEqual(parseData(JSON.stringify(owned)), owned);
  assert.throws(() => parseData("basura"));
  assert.throws(() =>
    parseData(
      JSON.stringify({ ...data, bookings: [{ ...booking, minutes: -1 }] }),
    ),
  );
  assert.throws(() =>
    parseData(JSON.stringify({ ...data, bookings: [booking, booking] })),
  );
  for (const invalid of [{ ...booking, id: " " }]) {
    assert.throws(() =>
      parseData(JSON.stringify({ ...data, bookings: [invalid] })),
    );
  }
});
