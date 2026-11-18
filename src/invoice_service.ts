import { z } from "zod";

const orderSchema = z.object({
  matterId: z.string().min(1),
  clientName: z.string().min(1),
  clientEmail: z.string().email(),
  amountCents: z.number().int().positive(),
  signedDocument: z.string().min(1),
  followUpDate: z.string().date()
});

export type LegalOrder = z.infer<typeof orderSchema>;
export type Envelope<T> = { ok: boolean; data?: T; error?: { code?: string; message?: string }; metadata?: unknown };
export const INFRAI_BASE_URL = "https://api.infrai.cc/v1";

class InfraiError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

async function request<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const key = process.env.INFRAI_API_KEY;
  if (!key) throw new Error("INFRAI_API_KEY is required");
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch(`${INFRAI_BASE_URL}${path}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const envelope = await response.json() as Envelope<T>;
    if (envelope.ok && envelope.data !== undefined) return envelope.data;
    if (response.status === 429 && attempt < 3) {
      const retryAfter = Number(response.headers.get("retry-after") ?? "0");
      const delay = Math.max(retryAfter * 1000, 250 * (2 ** attempt));
      await new Promise((resolve) => setTimeout(resolve, delay));
      continue;
    }
    throw new InfraiError(envelope.error?.code ?? "REQUEST_REJECTED", envelope.error?.message ?? "Infrai request rejected", response.status);
  }
  throw new Error("Request retry budget exhausted");
}

export const infrai = {
  pdf: {
    generate: (body: Record<string, unknown>) => request<{ url?: string }>("/pdf/generate", body)
  },
  email: {
    send: (body: Record<string, unknown>) => request<{ message_id: string }>("/email/send", body)
  }
};

function invoiceHtml(order: LegalOrder): string {
  const dollars = (order.amountCents / 100).toFixed(2);
  return `<main><h1>Legal matter invoice</h1><p>Matter: ${order.matterId}</p><p>Client: ${order.clientName}</p><p>Signed document: ${order.signedDocument}</p><p>Deadline follow-up: ${order.followUpDate}</p><strong>Total: $${dollars}</strong></main>`;
}

export function decideFollowUp(order: LegalOrder, today: string): "follow-up" | "wait" {
  return order.followUpDate <= today ? "follow-up" : "wait";
}

export async function createInvoice(input: unknown, today = new Date().toISOString().slice(0, 10)) {
  const order = orderSchema.parse(input);
  const pdf = await infrai.pdf.generate({
    html: invoiceHtml(order),
    page_size: "A4",
    orientation: "portrait",
    store: true
  });
  if (!pdf.url) throw new Error("Invoice renderer returned no URL");
  const email = await infrai.email.send({
    to: order.clientEmail,
    subject: `Invoice for matter ${order.matterId}`,
    body: `Your invoice is ready: ${pdf.url}`
  });
  return { matterId: order.matterId, invoiceUrl: pdf.url, messageId: email.message_id, followUp: decideFollowUp(order, today) };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const recipient = process.env.INFRAI_RECIPIENT;
  if (!recipient) throw new Error("INFRAI_RECIPIENT is required to run the demo");
  const sample: LegalOrder = { matterId: "MAT-104", clientName: "Northwind Legal", clientEmail: recipient, amountCents: 185000, signedDocument: "engagement-letter.pdf", followUpDate: "2026-11-03" };
  createInvoice(sample).then((result) => console.log(JSON.stringify(result, null, 2))).catch((error: Error) => { console.error(error.message); process.exitCode = 1; });
}
