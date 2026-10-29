import { useEffect, useState } from "react";
import { STORE_TZ } from "./config";
import { useData } from "./data/context";
import type { Settings } from "./types";

export const DAY_NAMES = [
  "domingo",
  "segunda-feira",
  "terça-feira",
  "quarta-feira",
  "quinta-feira",
  "sexta-feira",
  "sábado",
];

/** Ordem de exibição: segunda a domingo. */
export const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

const WEEKDAY: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

/** 480 -> "08h", 510 -> "08h30". */
export const hh = (min: number) => {
  const h = String(Math.floor(min / 60)).padStart(2, "0");
  const m = min % 60;
  return m ? `${h}h${String(m).padStart(2, "0")}` : `${h}h`;
};

function storeNow(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: STORE_TZ,
    weekday: "short",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  }).formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "0";
  const hour = Number(get("hour")) % 24;
  return { day: WEEKDAY[get("weekday")] ?? 0, minutes: hour * 60 + Number(get("minute")) };
}

/** aaaa-mm-dd no fuso da loja, `add` dias à frente. */
export function storeDay(date: Date, add = 0): string {
  const d = new Date(date.getTime() + add * 86_400_000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: STORE_TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

export interface Status {
  open: boolean;
  label: string;
  today: number;
}

export function storeStatus(settings: Settings, date = new Date()): Status {
  const { day, minutes } = storeNow(date);
  const base = { today: day };
  if (settings.forceClosed.on) {
    return { ...base, open: false, label: settings.forceClosed.message.trim() || "Fechada no momento" };
  }
  const closedToday = settings.closedDates.includes(storeDay(date));
  const today = closedToday ? null : settings.hours[String(day)];
  if (today && minutes >= today[0] && minutes < today[1]) {
    return { ...base, open: true, label: `Aberta agora · até ${hh(today[1])}` };
  }
  if (today && minutes < today[0]) {
    return { ...base, open: false, label: `Fechada · abre às ${hh(today[0])}` };
  }
  for (let i = 1; i <= 14; i++) {
    const d = (day + i) % 7;
    const h = settings.hours[String(d)];
    if (h && !settings.closedDates.includes(storeDay(date, i))) {
      const when = i === 1 ? "amanhã" : DAY_NAMES[d]!;
      const prefix = closedToday && i === 1 ? "Fechada hoje" : "Fechada";
      return { ...base, open: false, label: `${prefix} · abre ${when} às ${hh(h[0])}` };
    }
  }
  return { ...base, open: false, label: "Fechada" };
}

/** Reavalia o status a cada minuto. */
export function useStoreStatus(): Status {
  const { settings } = useData();
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);
  return storeStatus(settings, now);
}

/** 5585994084103 -> (85) 99408-4103 */
export function phoneDisplay(n: string): string {
  const d = n.replace(/\D/g, "").replace(/^55/, "");
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return d;
}

export const mapsUrl = (address: string) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

/** Data mínima (aaaa-mm-dd) para encomenda, somando a antecedência em dias. */
export function minDate(leadDays: number): string {
  return storeDay(new Date(), leadDays);
}
