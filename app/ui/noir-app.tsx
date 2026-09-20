"use client";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import Dialog from "./dialog";
import TablePlan from "./table-plan";
import AuthForm from "./auth-form";
import { LocalUser, readSession, saveSession } from "../../lib/local-users";
import {
  Booking,
  Draft,
  EMPTY_DATA,
  EMPTY_DRAFT,
  LocalData,
  STORAGE_KEY,
  TABLES,
  canCancel,
  formatDate,
  formatTime,
  localDate,
  parseData,
  startOf,
  tableState,
  timeOptions,
  validateDraft,
} from "../../lib/reservations";

const SCREENS = [
  "home",
  "reservation",
  "tables",
  "bookings",
  "menu",
  "promotions",
] as const;
type Screen = (typeof SCREENS)[number];
type Panel =
  | "user"
  | "profile"
  | "rules"
  | "privacy"
  | "help"
  | "login"
  | "register"
  | null;
const MENU = [
  {
    title: "Menú principal",
    image: "/design/menu-main.png",
    description:
      "Nuestra carta está en preparación. Pronto podrás descubrir los platos de Noir Eclipse.",
  },
  {
    title: "Bebidas",
    image: "/design/menu-drinks.png",
    description:
      "Estamos preparando nuestra selección de bebidas. Los productos y precios se publicarán aquí.",
  },
  {
    title: "Postres",
    image: "/design/menu-desserts.png",
    description:
      "El final de una buena experiencia. Nuestra selección de postres estará disponible próximamente.",
  },
];
const PANEL_TITLES = {
  login: "Iniciar sesión",
  register: "Registrarse",
  user: "Tu espacio",
  profile: "Mi perfil local",
  rules: "Reglas de reserva",
  privacy: "Tus datos",
  help: "Ayuda y soporte",
};

function formatDuration(minutes: number) {
  return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, "0")}`;
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <a
      href="#home"
      aria-label="Noir Eclipse, volver al inicio"
      className={`brand ${compact ? "brand-small" : ""}`}
    >
      <span className="brand-orbit" aria-hidden="true" />
      <span>
        NOIR ECLIPSE<small>RESTAURANT</small>
      </span>
    </a>
  );
}
export default function NoirApp() {
  const [screen, setScreen] = useState<Screen>("home");
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [data, setData] = useState<LocalData>(EMPTY_DATA);
  const [loaded, setLoaded] = useState(false);
  const [storageError, setStorageError] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [panel, setPanel] = useState<Panel>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [confirmation, setConfirmation] = useState<Booking | null>(null);
  const [cancelling, setCancelling] = useState<Booking | null>(null);
  const [filter, setFilter] = useState<"upcoming" | "past" | "cancelled">(
    "upcoming",
  );
  const [menuIndex, setMenuIndex] = useState(0);
  const [now, setNow] = useState(() => new Date());
  const [busy, setBusy] = useState(false);
  const [user, setUser] = useState<LocalUser | null>(null);
  const [occasion, setOccasion] = useState("Sin ocasión especial");
  const pendingReservation = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const locked = useRef(false);
  const closePanel = useCallback(() => {
    pendingReservation.current = false;
    setPanel(null);
  }, []);
  const closeConfirmation = useCallback(() => setConfirmation(null), []);
  const closeCancellation = useCallback(() => setCancelling(null), []);

  useEffect(() => {
    function syncNavigation() {
      if (location.hash === "#main-content") return;
      const match = SCREENS.find((item) => item === location.hash.slice(1));
      setScreen(match ?? "home");
      if (match !== "reservation") setSelected(null);
      pendingReservation.current = false;
      setError("");
      setPanel(null);
    }
    function readStorage() {
      try {
        const saved = parseData(localStorage.getItem(STORAGE_KEY));
        setData(saved);
        setStorageError("");
      } catch {
        setStorageError(
          "No pudimos leer los datos locales. Revisa los permisos de almacenamiento del navegador; no sobrescribiremos los datos existentes.",
        );
      }
      setLoaded(true);
    }
    function syncStorage(event: StorageEvent) {
      if (event.key === STORAGE_KEY || event.key === null) readStorage();
    }
    syncNavigation();
    readStorage();
    const sessionFrame = window.requestAnimationFrame(() => {
      try {
        setUser(readSession(localStorage, sessionStorage));
      } catch {
        setUser(null);
      }
    });
    window.addEventListener("hashchange", syncNavigation);
    window.addEventListener("storage", syncStorage);
    const timer = window.setInterval(() => setNow(new Date()), 15000);
    return () => {
      window.removeEventListener("hashchange", syncNavigation);
      window.removeEventListener("storage", syncStorage);
      window.clearInterval(timer);
      window.cancelAnimationFrame(sessionFrame);
    };
  }, []);
  useEffect(() => {
    heading.current?.focus();
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [screen]);

  function navigate(next: Screen) {
    location.hash = next;
  }
  function updateDraft(key: keyof Draft, value: string) {
    setDraft((current) => {
      const next = { ...current, [key]: value };
      if (
        key === "date" &&
        !timeOptions(next.date, next.duration).includes(next.time)
      )
        next.time = "";
      return next;
    });
    setError("");
    setNotice("");
  }
  function writeData(next: LocalData) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setData(next);
    setStorageError("");
  }
  function chooseTable(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const problem = validateDraft(draft);
    if (problem) {
      setError(problem);
      return;
    }
    setError("");
    void confirmReservation();
  }
  async function confirmReservation(authenticatedUser = user) {
    const problem = validateDraft(draft);
    if (problem) {
      setError(problem);
      return;
    }
    if (!authenticatedUser) {
      pendingReservation.current = true;
      setPanel("login");
      return;
    }
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    setError("");
    const create = () => {
      const problem = validateDraft(draft);
      if (problem) {
        setError(problem);
        return;
      }
      const table = TABLES.find((item) => item.id === selected);
      if (!table) {
        setError("Selecciona una mesa para continuar.");
        return;
      }
      const latest = parseData(localStorage.getItem(STORAGE_KEY));
      if (tableState(table, draft, latest.bookings) !== "available") {
        setData(latest);
        setSelected(null);
        setError(
          "Esta mesa ya no está disponible para la selección. Elige otra mesa.",
        );
        return;
      }
      const booking: Booking = {
        userId: authenticatedUser.id,
        occasion,
        id: crypto.randomUUID(),
        table: table.id,
        people: Number(draft.people),
        start: startOf(draft).toISOString(),
        minutes: Number(draft.duration),
        status: "confirmed",
        createdAt: new Date().toISOString(),
      };
      writeData({ ...latest, bookings: [...latest.bookings, booking] });
      setConfirmation(booking);
      setSelected(null);
      setDraft(EMPTY_DRAFT);
      setOccasion("Sin ocasión especial");
      setFilter("upcoming");
      navigate("bookings");
    };
    try {
      if (navigator.locks) await navigator.locks.request(STORAGE_KEY, create);
      else create();
    } catch {
      setError(
        "No se pudo guardar la reserva en este dispositivo. Comprueba que el navegador permite almacenamiento e inténtalo de nuevo.",
      );
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }
  async function cancelReservation() {
    if (!cancelling || locked.current) return;
    locked.current = true;
    setBusy(true);
    setError("");
    const cancel = () => {
      const latest = parseData(localStorage.getItem(STORAGE_KEY));
      const booking = latest.bookings.find((item) => item.id === cancelling.id);
      if (
        !booking ||
        booking.userId !== user?.id ||
        !user ||
        !canCancel(booking)
      ) {
        setData(latest);
        setError(
          "Esta reserva ya no se puede cancelar. Se necesitan al menos 2 horas de anticipación.",
        );
        setCancelling(null);
        return;
      }
      writeData({
        ...latest,
        bookings: latest.bookings.map((item) =>
          item.id === booking.id ? { ...item, status: "cancelled" } : item,
        ),
      });
      setCancelling(null);
      setNotice(
        `Reserva de la mesa ${booking.table} cancelada. El horario vuelve a estar disponible.`,
      );
    };
    try {
      if (navigator.locks) await navigator.locks.request(STORAGE_KEY, cancel);
      else cancel();
    } catch {
      setCancelling(null);
      setError(
        "No pudimos guardar la cancelación. Tu reserva sigue sin cambios.",
      );
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }
  const times = timeOptions(draft.date, draft.duration, now);
  const validDraft = !validateDraft(draft, now);
  const selectedTable = TABLES.find((table) => table.id === selected);
  const selectedAvailable =
    selectedTable &&
    tableState(selectedTable, draft, data.bookings) === "available";
  const bookings = data.bookings
    .filter((booking) => Boolean(user) && booking.userId === user?.id)
    .filter((booking) =>
      filter === "cancelled"
        ? booking.status === "cancelled"
        : booking.status === "confirmed" &&
          (filter === "upcoming"
            ? Date.parse(booking.start) + booking.minutes * 60000 >
              now.getTime()
            : Date.parse(booking.start) + booking.minutes * 60000 <=
              now.getTime()),
    )
    .sort((a, b) =>
      filter === "upcoming"
        ? Date.parse(a.start) - Date.parse(b.start)
        : Date.parse(b.start) - Date.parse(a.start),
    );
  const modalOpen = Boolean(panel || confirmation || cancelling);
  const title = {
    home: "Una experiencia bajo una nueva luz",
    reservation: "Reserva tu momento",
    tables: "Elige tu mesa",
    bookings: "Mis reservas",
    menu: "Nuestra carta",
    promotions: "Promociones",
  }[screen];

  return (
    <>
      <div
        inert={modalOpen}
        className="app-shell"
        onFocusCapture={(event) => {
          returnFocus.current = event.target;
        }}
      >
        <a href="#main-content" className="skip-link">
          Saltar al contenido
        </a>
        <header className="site-header">
          <Brand compact />
          <button
            className="user-button"
            onClick={() => {
              setPanel("user");
              setError("");
            }}
            aria-label="Abrir menú de usuario"
          >
            <span aria-hidden="true">♙</span>
            <span>{user?.name || "Usuario"}</span>
          </button>
        </header>
        <nav className="main-nav" aria-label="Navegación principal">
          {[
            { id: "home", label: "Inicio" },
            { id: "tables", label: "Reservar" },
            { id: "bookings", label: "Mis reservas" },
            { id: "menu", label: "Carta" },
            { id: "promotions", label: "Promociones" },
          ].map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              aria-current={
                screen === item.id ||
                (screen === "reservation" && item.id === "tables")
                  ? "page"
                  : undefined
              }
            >
              {item.label}
            </a>
          ))}
        </nav>
        <main
          id="main-content"
          className={screen === "home" ? "home-content" : "page-content"}
        >
          {screen !== "home" && (
            <a
              className="back-link"
              href={screen === "reservation" ? "#tables" : "#home"}
            >
              ← {screen === "reservation" ? "Cambiar mesa" : "Volver al inicio"}
            </a>
          )}
          {screen !== "home" && (
            <div className="page-heading">
              <p className="eyebrow">NOIR ECLIPSE · SAN JOSÉ</p>
              <h1 ref={heading} tabIndex={-1}>
                {title}
              </h1>
              <p>Una experiencia que merece su propio espacio.</p>
            </div>
          )}
          {storageError && (
            <p className="message error" role="alert">
              {storageError}
            </p>
          )}
          {error && (
            <p className="message error" role="alert">
              {error}
            </p>
          )}
          {notice && (
            <p className="message success" role="status">
              {notice}
              <button aria-label="Ocultar aviso" onClick={() => setNotice("")}>
                ×
              </button>
            </p>
          )}
          {screen === "home" && (
            <section className="hero">
              <Image
                src="/design/brand.png"
                alt="Eclipse dorado, Noir Eclipse Restaurant"
                width={1254}
                height={1254}
                priority
                className="hero-brand"
                sizes="(max-width: 700px) 100vw, 560px"
              />
              <div className="hero-copy">
                <p className="eyebrow">ALTA COCINA · MOMENTOS INOLVIDABLES</p>
                <h1 ref={heading} tabIndex={-1}>
                  Una experiencia
                  <br />
                  <em>bajo una nueva luz.</em>
                </h1>
                <p>
                  Elige tu mesa y prepara un encuentro especial.
                  <br />
                  Nosotros ponemos el escenario.
                </p>
                <div className="hero-actions">
                  <a className="button gold" href="#tables">
                    Reservar una mesa <span aria-hidden="true">↗</span>
                  </a>
                  <a className="button cyan" href="#menu">
                    Explorar la carta <span aria-hidden="true">→</span>
                  </a>
                </div>
                <a className="text-link" href="#promotions">
                  Descubrir promociones →
                </a>
              </div>
              <div className="hero-footer">
                <span>SABORES QUE TRASCIENDEN</span>
                <span>07:00 – 21:00 · Costa Rica</span>
              </div>
            </section>
          )}

          {screen === "reservation" && selected !== null && (
            <div className="booking-layout">
              <section className="surface">
                <p className="eyebrow">PASO 2 DE 2</p>
                <div className="chosen-table">
                  Mesa {selected} · En configuración{" "}
                  <a href="#tables">Cambiar mesa</a>
                </div>
                <h2>Los detalles de tu visita</h2>
                <p className="reservation-summary">
                  {draft.date && draft.time
                    ? `${formatDate(startOf(draft).toISOString())} · ${draft.time}`
                    : "Selecciona fecha y hora en el plano"}{" "}
                  <a href="#tables">Editar fecha y hora</a>
                </p>
                {validDraft && !selectedAvailable && (
                  <p className="message error" role="alert">
                    Esta mesa está reservada en ese horario. Elige otra hora o
                    cambia de mesa.
                  </p>
                )}
                <p className="muted">
                  Sucursal principal · Horario de Costa Rica (UTC−6)
                </p>
                <form onSubmit={chooseTable} className="reservation-form">
                  <label>
                    Número de personas
                    <select
                      value={draft.people}
                      onChange={(event) =>
                        updateDraft("people", event.target.value)
                      }
                    >
                      {Array.from({ length: 8 }, (_, index) => index + 1).map(
                        (count) => (
                          <option key={count} value={count}>
                            {count} {count === 1 ? "persona" : "personas"}
                          </option>
                        ),
                      )}
                    </select>
                  </label>
                  <label>
                    Duración
                    <select
                      value={draft.duration}
                      onChange={(event) =>
                        updateDraft("duration", event.target.value)
                      }
                    >
                      {[60, 90, 120, 150, 180].map((minutes) => (
                        <option key={minutes} value={minutes}>
                          {formatDuration(minutes)} h
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Ocasión (opcional)
                    <select
                      value={occasion}
                      onChange={(event) => setOccasion(event.target.value)}
                    >
                      {[
                        "Sin ocasión especial",
                        "Cumpleaños",
                        "Aniversario",
                        "Reunión",
                      ].map((value) => (
                        <option key={value}>{value}</option>
                      ))}
                    </select>
                  </label>
                  {!validDraft && (
                    <p className="message" role="status">
                      {validateDraft(draft, now)}{" "}
                      <a href="#tables">Editar fecha y hora</a>
                    </p>
                  )}
                  <p className="form-note">
                    Puedes reservar con al menos 30 minutos de anticipación. La
                    visita debe terminar antes de las 21:00.
                  </p>
                  <button
                    className={`button gold full ${validDraft && selectedAvailable && loaded && !storageError ? "ready-to-confirm" : ""}`}
                    disabled={
                      !loaded ||
                      !validDraft ||
                      !selectedAvailable ||
                      busy ||
                      Boolean(storageError)
                    }
                  >
                    {busy ? "Guardando…" : "Confirmar reserva local"}
                  </button>
                </form>
              </section>
              <aside className="visit-aside">
                <TablePlan
                  draft={draft}
                  bookings={data.bookings}
                  selected={selected}
                  onSelect={(id) => {
                    setSelected(id);
                    setError("");
                  }}
                />
                <p className="eyebrow">TU PRÓXIMO ENCUENTRO</p>
                <h2>
                  El tiempo se disfruta
                  <br />
                  <em>en buena compañía.</em>
                </h2>
                <p>
                  Conservaremos los detalles mientras exploras la carta o eliges
                  tu mesa.
                </p>
                <div className="local-note">
                  Prototipo local: las reservas se guardan en este navegador y
                  no se envían al restaurante.
                </div>
              </aside>
            </div>
          )}

          {(screen === "tables" ||
            (screen === "reservation" && selected === null)) && (
            <section className="table-first">
              <div className="table-step-heading">
                <div>
                  <p className="eyebrow">PASO 1 DE 2</p>
                  <h2>Primero, elige tu mesa</h2>
                </div>
                <a
                  className="icon-button"
                  href="#home"
                  aria-label="Cerrar selección de mesas y volver al inicio"
                >
                  ×
                </a>
              </div>
              <p className="muted">
                Elige fecha y hora para ver las mesas disponibles. La duración
                inicial es de una hora; puedes ajustarla en el siguiente paso.
              </p>
              <div className="schedule-picker reservation-form">
                {" "}
                <label>
                  Fecha
                  <input
                    type="date"
                    required
                    min={localDate(now)}
                    max={`${localDate(now).slice(0, 4)}-12-31`}
                    value={draft.date}
                    onChange={(event) =>
                      updateDraft("date", event.target.value)
                    }
                  />
                </label>
                <label>
                  Hora
                  <select
                    required
                    value={times.includes(draft.time) ? draft.time : ""}
                    onChange={(event) =>
                      updateDraft("time", event.target.value)
                    }
                    disabled={!draft.date || times.length === 0}
                  >
                    <option value="">Selecciona una hora</option>
                    {times.map((time) => (
                      <option key={time}>{time}</option>
                    ))}
                  </select>
                </label>
                {draft.date && times.length === 0 && (
                  <p className="message">
                    No quedan horarios para esta fecha y duración. Elige otra
                    fecha o una visita más corta.
                  </p>
                )}
                {draft.time && !times.includes(draft.time) && (
                  <p className="message" role="status">
                    El horario elegido ya no es válido. Selecciona uno nuevo.
                  </p>
                )}
              </div>
              <p className="form-note">
                {!draft.date || !draft.time
                  ? "Selecciona una fecha y una hora antes de elegir mesa."
                  : `Disponibilidad para una visita de ${formatDuration(Number(draft.duration))} h.`}
              </p>{" "}
              <TablePlan
                draft={draft}
                bookings={data.bookings}
                selected={null}
                enabled={validDraft}
                onSelect={(id) => {
                  if (!validDraft) {
                    setError(
                      validateDraft(draft, now) ?? "Selecciona fecha y hora.",
                    );
                    return;
                  }
                  setSelected(id);
                  setError("");
                  setNotice("");
                  navigate("reservation");
                }}
              />
            </section>
          )}
          {screen === "bookings" && (
            <>
              <div className="section-toolbar">
                <div
                  className="tabs"
                  role="group"
                  aria-label="Filtrar reservas"
                >
                  {(
                    [
                      { id: "upcoming", label: "Próximas" },
                      { id: "past", label: "Pasadas" },
                      { id: "cancelled", label: "Canceladas" },
                    ] as const
                  ).map((item) => (
                    <button
                      key={item.id}
                      aria-pressed={filter === item.id}
                      onClick={() => setFilter(item.id)}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
                <a className="text-link" href="#tables">
                  + Nueva reserva
                </a>
              </div>
              <p className="local-note">
                Reservas guardadas en este dispositivo. No representan una
                confirmación del restaurante.
              </p>
              {!loaded ? (
                <p role="status">Cargando tus reservas…</p>
              ) : bookings.length === 0 ? (
                <section className="empty-state">
                  <span className="empty-symbol" aria-hidden="true">
                    ☾
                  </span>
                  <h2>
                    {filter === "upcoming"
                      ? "Tu próxima experiencia te espera"
                      : filter === "past"
                        ? "Aún no hay visitas pasadas"
                        : "No tienes reservas canceladas"}
                  </h2>
                  <p>
                    Cuando haya reservas en esta categoría, aparecerán aquí.
                  </p>
                  <a className="button cyan" href="#tables">
                    Elegir una mesa
                  </a>
                </section>
              ) : (
                <div className="bookings-list">
                  {bookings.map((booking) => (
                    <article key={booking.id} className="surface booking-card">
                      <div>
                        <span className={`badge ${booking.status}`}>
                          {booking.status === "cancelled"
                            ? "Cancelada"
                            : filter === "past"
                              ? "Finalizada"
                              : "Guardada localmente"}
                        </span>
                        <h2>Mesa {booking.table}</h2>
                        <p>{formatDate(booking.start)}</p>
                        <p className="muted">
                          {formatTime(booking.start)}–
                          {formatTime(
                            new Date(
                              Date.parse(booking.start) +
                                booking.minutes * 60000,
                            ).toISOString(),
                          )}{" "}
                          · {booking.people}{" "}
                          {booking.people === 1 ? "persona" : "personas"}
                        </p>
                        <small className="muted">
                          Referencia {booking.id.slice(0, 8).toUpperCase()}
                        </small>
                      </div>
                      {filter === "upcoming" && (
                        <div>
                          {canCancel(booking, now) ? (
                            <button
                              className="button subtle"
                              onClick={() => {
                                setCancelling(booking);
                                setError("");
                              }}
                            >
                              Cancelar reserva
                            </button>
                          ) : (
                            <p className="form-note">
                              La cancelación se cierra 2 horas antes de la
                              visita.
                            </p>
                          )}
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </>
          )}

          {screen === "menu" && (
            <section className="menu-section">
              <div
                className="tabs menu-tabs"
                role="group"
                aria-label="Secciones de la carta"
              >
                {MENU.map((item, index) => (
                  <button
                    key={item.title}
                    aria-pressed={index === menuIndex}
                    onClick={() => setMenuIndex(index)}
                  >
                    {item.title}
                  </button>
                ))}
              </div>
              <div className="menu-cover" key={menuIndex}>
                <div
                  className="menu-art"
                  aria-hidden="true"
                  style={{ backgroundImage: `url(${MENU[menuIndex].image})` }}
                />
                <div className="menu-overlay">
                  <Brand />
                  <p className="eyebrow">UNA EXPERIENCIA POR DESCUBRIR</p>
                  <h2>{MENU[menuIndex].title}</h2>
                  <p>{MENU[menuIndex].description}</p>
                  <span className="badge">Próximamente</span>
                </div>
              </div>
              <div className="menu-controls">
                <button
                  className="button subtle"
                  disabled={menuIndex === 0}
                  onClick={() => setMenuIndex((index) => index - 1)}
                >
                  ← Anterior
                </button>
                <span aria-live="polite">
                  {menuIndex + 1} de {MENU.length}
                </span>
                <button
                  className="button subtle"
                  disabled={menuIndex === MENU.length - 1}
                  onClick={() => setMenuIndex((index) => index + 1)}
                >
                  Siguiente →
                </button>
              </div>
            </section>
          )}
          {screen === "promotions" && (
            <section className="promotion-card">
              <div className="promotion-orbit" aria-hidden="true" />
              <p className="eyebrow">HAY MOMENTOS QUE MERECEN MÁS</p>
              <h2>
                Lo especial
                <br />
                <em>está por llegar.</em>
              </h2>
              <p>
                De momento no hay promociones.
                <br />
                Vuelve más tarde para descubrir las novedades.
              </p>
              <a className="button cyan" href="#tables">
                Reservar una mesa
              </a>
            </section>
          )}
        </main>
        <footer className="site-footer">
          <span>
            NOIR ECLIPSE <small>Sabores que trascienden</small>
          </span>
          <span>Demostración local · Sin conexión al restaurante</span>
          <button onClick={() => setPanel("privacy")}>Tus datos</button>
        </footer>
      </div>
      {panel && (
        <Dialog
          title={PANEL_TITLES[panel]}
          onClose={closePanel}
          returnFocus={returnFocus}
          drawer={panel === "user"}
        >
          {panel === "user" && (
            <>
              <div className="user-avatar" aria-hidden="true">
                {user ? user.name.charAt(0).toUpperCase() : "♙"}
              </div>
              <p className="user-greeting">
                {user ? `Hola, ${user.name}` : "Bienvenido a Noir Eclipse"}
              </p>
              <p className="local-note">Tu espacio en este dispositivo</p>
              <div className="drawer-links">
                {!user ? (
                  <>
                    <button onClick={() => setPanel("register")}>
                      Registrarse <span>→</span>
                    </button>
                    <button onClick={() => setPanel("login")}>
                      Iniciar sesión <span>→</span>
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => {
                      saveSession(sessionStorage, null);
                      setUser(null);
                      pendingReservation.current = false;
                      setPanel(null);
                      setNotice("Sesión cerrada.");
                    }}
                  >
                    Cerrar sesión <span>→</span>
                  </button>
                )}
                <button
                  onClick={() => {
                    setPanel(null);
                    navigate("bookings");
                  }}
                >
                  Mis reservas <span>→</span>
                </button>
                <button
                  onClick={() => {
                    setPanel("profile");
                  }}
                >
                  Mi perfil local <span>→</span>
                </button>
                <button onClick={() => setPanel("rules")}>
                  Reglas del restaurante <span>→</span>
                </button>
                <button onClick={() => setPanel("privacy")}>
                  Privacidad y datos <span>→</span>
                </button>
                <button onClick={() => setPanel("help")}>
                  Ayuda y soporte <span>→</span>
                </button>
              </div>
              <p className="form-note">
                Los pagos y las notificaciones se incorporarán en una próxima
                etapa.
              </p>
            </>
          )}
          {(panel === "login" || panel === "register") && (
            <AuthForm
              key={panel}
              mode={panel}
              onMode={setPanel}
              onSuccess={(signedIn) => {
                setUser(signedIn);
                setPanel(null);
                const resume = pendingReservation.current;
                pendingReservation.current = false;
                if (resume) void confirmReservation(signedIn);
                else setNotice(`Bienvenido, ${signedIn.name}.`);
              }}
            />
          )}
          {panel === "profile" && (
            <div className="prose">
              {user ? (
                <>
                  <h3>{user.name}</h3>
                  <p>{user.email}</p>
                  <p className="local-note">
                    Cuenta de demostración en este navegador.
                  </p>
                </>
              ) : (
                <>
                  <p>Inicia sesión para ver tu perfil y tus reservas.</p>
                  <button
                    className="button gold"
                    onClick={() => setPanel("login")}
                  >
                    Iniciar sesión
                  </button>
                </>
              )}
            </div>
          )}
          {panel === "rules" && (
            <div className="prose">
              <p>Reglas de esta demostración:</p>
              <ul>
                <li>
                  De 1 a 8 personas. Por ahora, todas las mesas admiten esa
                  cantidad.
                </li>
                <li>Visitas de 1 a 3 horas, en intervalos de 30 minutos.</li>
                <li>Horario de 07:00 a 21:00 en Costa Rica.</li>
                <li>Reserva con al menos 30 minutos de anticipación.</li>
                <li>Puedes cancelar hasta 2 horas antes del inicio.</li>
                <li>Una cancelación libera el horario en este navegador.</li>
              </ul>
              <p>
                La disponibilidad es local. No se consultan reservas de otros
                dispositivos.
              </p>
            </div>
          )}
          {panel === "privacy" && (
            <div className="prose">
              <p>
                El nombre y las reservas se guardan en el almacenamiento local
                de este navegador. No se envían a una base de datos ni al
                restaurante.
              </p>
              <p>
                Otras personas que usen este mismo perfil del navegador pueden
                verlos. Borrar los datos del sitio elimina estas reservas; no se
                sincronizan ni se recuperan en otro dispositivo.
              </p>
              <p>
                Las cuentas son una demostración local. Las contraseñas se
                guardan como hashes con sal. No solicitamos datos de pago ni
                verificamos el correo. La autenticación de servidor se añadirá
                después.
              </p>
            </div>
          )}
          {panel === "help" && (
            <div className="prose">
              <h3>¿Cómo pruebo una reserva?</h3>
              <p>
                En Reservar, selecciona primero una mesa. Después elige
                personas, fecha, duración y hora, y confirma. La encontrarás en
                Mis reservas.
              </p>
              <h3>¿Por qué no puedo seleccionar una mesa?</h3>
              <p>
                Puede tener una reserva local que coincide con el horario
                elegido.
              </p>
              <h3>¿Puedo contactar al restaurante?</h3>
              <p>
                Este prototipo aún no tiene un canal de atención conectado. No
                se envían solicitudes reales.
              </p>
            </div>
          )}
        </Dialog>
      )}
      {confirmation && (
        <Dialog
          title="Tu reserva está guardada"
          onClose={closeConfirmation}
          returnFocus={returnFocus}
        >
          <div className="confirmation-mark" aria-hidden="true">
            ✓
          </div>
          <h3>
            Mesa {confirmation.table} · {confirmation.people} personas
          </h3>
          <p>
            {formatDate(confirmation.start)} · {formatTime(confirmation.start)}
          </p>
          <p className="muted">Duración: {formatDuration(confirmation.minutes)} h</p>
          <p className="local-note">
            Guardada solo en este dispositivo. No se ha enviado al restaurante.
          </p>
          <button className="button gold full" onClick={closeConfirmation}>
            Ver mis reservas
          </button>
        </Dialog>
      )}
      {cancelling && (
        <Dialog
          title="¿Cancelar esta reserva?"
          onClose={closeCancellation}
          returnFocus={returnFocus}
        >
          <p>
            Mesa {cancelling.table} · {formatDate(cancelling.start)} ·{" "}
            {formatTime(cancelling.start)}
          </p>
          <p className="muted">
            El horario quedará disponible de nuevo. La reserva se conservará en
            Canceladas.
          </p>
          <div className="dialog-actions">
            <button
              className="button subtle"
              onClick={closeCancellation}
              disabled={busy}
            >
              Conservar reserva
            </button>
            <button
              className="button danger"
              onClick={cancelReservation}
              disabled={busy}
            >
              {busy ? "Cancelando…" : "Sí, cancelar"}
            </button>
          </div>
        </Dialog>
      )}
    </>
  );
}
