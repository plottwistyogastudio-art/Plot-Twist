import { createHash, createHmac, randomUUID, timingSafeEqual } from "crypto";

// DOKU Checkout (hosted payment page, QRIS only). Server side only.
// Env: DOKU_CLIENT_ID, DOKU_SECRET_KEY, DOKU_ENV ("sandbox" or "production")

export const dokuEnabled = () => !!process.env.DOKU_CLIENT_ID && !!process.env.DOKU_SECRET_KEY;

const base = () =>
  process.env.DOKU_ENV === "production" ? "https://api.doku.com" : "https://api-sandbox.doku.com";

export const CHECKOUT_PATH = "/checkout/v1/payment";
export const NOTIFY_PATH = "/api/payments/webhook";

function sign(clientId: string, requestId: string, timestamp: string, target: string, body: string | null) {
  const lines = [`Client-Id:${clientId}`, `Request-Id:${requestId}`, `Request-Timestamp:${timestamp}`, `Request-Target:${target}`];
  if (body !== null) lines.push(`Digest:${createHash("sha256").update(body).digest("base64")}`);
  const sig = createHmac("sha256", process.env.DOKU_SECRET_KEY!).update(lines.join("\n")).digest("base64");
  return `HMACSHA256=${sig}`;
}

// Invoice number = order id without dashes (DOKU does not allow symbols)
export const invoiceFor = (orderId: string) => orderId.replace(/-/g, "");

export async function createCheckout(opts: {
  orderId: string; amount: number; name?: string; email?: string; callbackUrl?: string;
}): Promise<{ ok: true; url: string; invoice: string } | { ok: false; message: string }> {
  const clientId = process.env.DOKU_CLIENT_ID!;
  const requestId = randomUUID();
  const timestamp = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  const invoice = invoiceFor(opts.orderId);
  const body = JSON.stringify({
    order: { amount: opts.amount, invoice_number: invoice, ...(opts.callbackUrl ? { callback_url: opts.callbackUrl } : {}) },
    payment: { payment_due_date: 30, payment_method_types: ["QRIS"] },
    customer: { id: opts.orderId.slice(0, 20), name: opts.name || "Plot Twist member", ...(opts.email ? { email: opts.email } : {}) },
  });
  try {
    const res = await fetch(base() + CHECKOUT_PATH, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Client-Id": clientId,
        "Request-Id": requestId,
        "Request-Timestamp": timestamp,
        Signature: sign(clientId, requestId, timestamp, CHECKOUT_PATH, body),
      },
      body,
      cache: "no-store",
    });
    const j = await res.json().catch(() => ({}));
    const url = j?.response?.payment?.url;
    if (!res.ok || !url) {
      console.error("DOKU checkout failed", res.status, JSON.stringify(j));
      return { ok: false, message: "The payment page could not be created. Please try again." };
    }
    return { ok: true, url, invoice };
  } catch (e) {
    console.error("DOKU checkout error", e);
    return { ok: false, message: "The payment service is not reachable. Please try again." };
  }
}

// Check that a notification really comes from DOKU
export function verifyNotification(headers: Headers, rawBody: string): boolean {
  const clientId = headers.get("client-id");
  const requestId = headers.get("request-id");
  const timestamp = headers.get("request-timestamp");
  const got = headers.get("signature");
  if (!clientId || !requestId || !timestamp || !got || clientId !== process.env.DOKU_CLIENT_ID) return false;
  const want = sign(clientId, requestId, timestamp, NOTIFY_PATH, rawBody);
  const a = Buffer.from(got), b = Buffer.from(want);
  return a.length === b.length && timingSafeEqual(a, b);
}
