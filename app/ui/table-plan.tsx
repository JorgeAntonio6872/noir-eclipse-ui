"use client";

import Image from "next/image";
import { Booking, Draft, TABLES, tableState } from "../../lib/reservations";

// Percentage coordinates follow the tabletops in the square salon image.
const POSITIONS = [
  { left: 26.5, top: 17, width: 15.5, height: 12 },
  { left: 57.3, top: 17, width: 13.2, height: 12 },
  { left: 26.7, top: 41, width: 15.2, height: 11.8 },
  { left: 57.3, top: 41, width: 13.2, height: 11.8 },
  { left: 26.7, top: 62.4, width: 15.2, height: 12.3 },
  { left: 56.8, top: 62.4, width: 14.8, height: 12.3 },
];

export default function TablePlan({
  draft,
  bookings,
  selected,
  onSelect,
  enabled = true,
}: {
  draft: Draft;
  bookings: Booking[];
  selected: number | null;
  onSelect: (id: number) => void;
  enabled?: boolean;
}) {
  return (
    <figure className="salon">
      <div
        className="interactive-plan"
        role="group"
        aria-label="Plano interactivo del salón"
      >
        <Image
          src="/design/salon-default.png"
          alt="Salón visto desde arriba: mesas 1 y 2 al fondo, 3 y 4 en el centro, 5 y 6 junto a la entrada"
          width={1254}
          height={1254}
          sizes="(max-width: 850px) 100vw, 760px"
          priority
        />
        {TABLES.map((table, index) => {
          const state = enabled
            ? tableState(table, draft, bookings)
            : "available";
          const active = state === "available" && selected === table.id;
          const label =
            state === "reserved"
              ? "Reservada"
              : state === "capacity"
                ? "No disponible para esta cantidad de personas"
                : active
                  ? "En configuración"
                  : "Disponible";
          const position = POSITIONS[index];
          return (
            <button
              key={table.id}
              type="button"
              className={`plan-table ${state} ${active ? "selected" : ""}`}
              style={{
                left: `${position.left}%`,
                top: `${position.top}%`,
                width: `${position.width}%`,
                height: `${position.height}%`,
              }}
              aria-label={`Mesa ${table.id}. ${label}`}
              aria-pressed={active}
              aria-disabled={!enabled || state !== "available"}
              disabled={state !== "available"}
              title={`Mesa ${table.id} · ${label}`}
              onClick={() => onSelect(table.id)}
            />
          );
        })}
      </div>
      <figcaption>
        Selecciona directamente una mesa del plano. En móvil, toca la mesa para
        configurarla.
      </figcaption>
      <ul className="plan-legend" aria-label="Colores de las mesas">
        <li>
          <i className="legend-free" />
          Disponible
        </li>
        <li>
          <i className="legend-hover" />
          Al pasar el mouse
        </li>
        <li>
          <i className="legend-selected" />
          En configuración
        </li>
        <li>
          <i className="legend-reserved" />
          Reservada
        </li>
        <li>
          <i className="legend-unavailable" />
          No disponible
        </li>
      </ul>
    </figure>
  );
}
