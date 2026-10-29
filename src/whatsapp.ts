import { money, prettyDate } from "./format";
import type { ResolvedLine } from "./cart";

export type Payment = string;

export interface OrderForm {
  name: string;
  phone: string;
  mode: "retirada" | "entrega";
  address: string;
  reference: string;
  payment: Payment;
  change: string;
  date: string;
  notes: string;
}

export interface Totals {
  subtotal: number;
  fee: number;
  total: number;
}

export function buildMessage(lines: ResolvedLine[], t: Totals, f: OrderForm, orderNumber?: string): string {
  const out: string[] = [];
  out.push(orderNumber ? `*Pedido ${orderNumber} - Qi Buxo*` : "*Pedido - Qi Buxo*", "");
  out.push(`Cliente: ${f.name.trim()}`);
  if (f.phone.trim()) out.push(`Telefone: ${f.phone.trim()}`);
  out.push(`Receber por: ${f.mode === "entrega" ? "Entrega" : "Retirada"}`);
  if (f.mode === "entrega") {
    out.push(`Endereço: ${f.address.trim()}`);
    if (f.reference.trim()) out.push(`Referência: ${f.reference.trim()}`);
  }
  if (f.date) out.push(`Para o dia: ${prettyDate(f.date)}`);
  if (f.payment) {
    const change = f.payment === "Dinheiro" && f.change.trim() ? ` (troco para ${f.change.trim()})` : "";
    out.push(`Pagamento: ${f.payment}${change}`);
  }

  out.push("", "*Itens*");
  for (const { line, product, option, extras, subtotal } of lines) {
    const variant = [option.label, option.detail].filter(Boolean).join(", ");
    const showVariant = product.options.length > 1 || option.label !== "Unidade";
    out.push(`${line.qty}x ${product.name}${showVariant ? ` (${variant})` : ""} - ${money(subtotal)}`);
    const byGroup = new Map<string, string[]>();
    for (const e of extras) {
      const label = e.choice.price ? `${e.choice.label} (+${money(e.choice.price)})` : e.choice.label;
      byGroup.set(e.group.title, [...(byGroup.get(e.group.title) ?? []), label]);
    }
    for (const [title, labels] of byGroup) out.push(`   ${title}: ${labels.join(", ")}`);
    if (line.note.trim()) out.push(`   Obs: ${line.note.trim()}`);
  }

  out.push("", `Subtotal: ${money(t.subtotal)}`);
  if (f.mode === "entrega") out.push(`Taxa de entrega: ${money(t.fee)}`);
  out.push(`*Total: ${money(t.total)}*`);
  if (f.notes.trim()) out.push("", `Observações: ${f.notes.trim()}`);
  return out.join("\n");
}

export function whatsappUrl(text: string, number: string): string {
  const base = number ? `https://wa.me/${number}` : "https://wa.me/";
  return `${base}?text=${encodeURIComponent(text)}`;
}
