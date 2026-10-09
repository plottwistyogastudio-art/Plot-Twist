"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { authFetch, supabaseBrowser } from "@/lib/supabase";
import { firstPlot, firstPlotOpen, formatIDR, packages, perClass, type Pkg } from "@/data/packages";
import { formatFullDay, parseISO } from "@/lib/dates";
import { CANCEL_HOURS } from "@/lib/booking-shared";
import { buildIcs, downloadFile } from "@/lib/ics";
import { REFERRAL_DISCOUNT_PCT, REFERRAL_ON_FIRST_PLOT, REFERRAL_STORAGE_KEY, normaliseCode, referralPrice } from "@/data/referral";

type ClassInfo = { iso: string; time: string; name: string; duration: string; teacher: string; spotsLeft: number; full: boolean };
type Referral = { code: string | null; referredBy: boolean; discountEligible: boolean; canApplyCode: boolean };
type Me = { email: string; credits: number; usedFirstPlot: boolean; profile: { full_name?: string } | null; referral?: Referral | null };
type Done = { kind: "booked" | "waitlist" | "package"; credits?: number; bookingId?: string };

const SIMULATE = process.env.NEXT_PUBLIC_PAYMENT_MODE === "simulate";

export default function BookingFlow({ classKey, packageId }: { classKey?: string; packageId?: string }) {
  const [ready, setReady] = useState(false);
  const [me, setMe] = useState<Me | null>(null);
  const [cls, setCls] = useState<ClassInfo | null>(null);
  const [chosen, setChosen] = useState<string | null>(packageId ?? null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [payUrl, setPayUrl] = useState<string | null>(null);
  const [done, setDone] = useState<Done | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [mat, setMat] = useState<"studio" | "own" | null>(null);
  const [matAsked, setMatAsked] = useState(false);
  const [orderAmount, setOrderAmount] = useState<number | null>(null);
  const [refInput, setRefInput] = useState("");
  const [refMsg, setRefMsg] = useState("");

  const loadMe = useCallback(async () => {
    const { data } = await supabaseBrowser().auth.getSession();
    if (!data.session) { setMe(null); return; }
    const r = await authFetch("/api/me");
    setMe(r.ok ? await r.json() : null);
  }, []);

  async function applyCode(raw: string, quiet = false) {
    const code = normaliseCode(raw);
    if (!code) return;
    const r = await authFetch("/api/referral", { method: "POST", body: JSON.stringify({ code }) });
    const j = await r.json().catch(() => ({}));
    try { localStorage.removeItem(REFERRAL_STORAGE_KEY); } catch { /* ignore */ }
    if (r.ok) { setRefMsg(`Code applied: ${REFERRAL_DISCOUNT_PCT}% off your first regular package${REFERRAL_ON_FIRST_PLOT ? "" : " (not combinable with First Plot)"}.`); await loadMe(); }
    else if (!quiet) setRefMsg(j.error ?? "Could not apply the code.");
  }

  // A friend's link (?ref=) was remembered earlier: apply it once the member is signed in
  useEffect(() => {
    if (!me?.referral?.canApplyCode) return;
    let stored = "";
    try { stored = localStorage.getItem(REFERRAL_STORAGE_KEY) ?? ""; } catch { /* ignore */ }
    if (stored) applyCode(stored, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me?.referral?.canApplyCode]);

  const priceOf = (p: Pkg) => (me?.referral?.discountEligible && (REFERRAL_ON_FIRST_PLOT || !p.oncePerPerson) ? referralPrice(p.price) : p.price);

  useEffect(() => {
    (async () => {
      await loadMe();
      if (classKey) {
        const r = await fetch(`/api/classes/${encodeURIComponent(classKey)}`);
        if (r.ok) setCls(await r.json());
        else setError("We could not find this class.");
      }
      setReady(true);
    })();
  }, [classKey, loadMe]);

  // Step: payment confirmed -> show result
  async function finishOrder(id: string) {
    const r = await authFetch(`/api/orders/${id}`);
    const o = await r.json();
    await loadMe();
    if (o.booking) setDone({ kind: o.booking.status, bookingId: o.booking.id });
    else setDone({ kind: "package" });
  }

  // Poll the order while the QR is on screen
  useEffect(() => {
    if (!orderId || done) return;
    const t = setInterval(async () => {
      const r = await authFetch(`/api/orders/${orderId}`);
      if (r.ok && (await r.json()).status === "paid") finishOrder(orderId);
    }, 4000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId, done]);

  async function confirmWithCredit() {
    if (!classKey) return;
    setBusy(true); setError("");
    const r = await authFetch("/api/bookings", { method: "POST", body: JSON.stringify({ classKey }) });
    const j = await r.json();
    setBusy(false);
    if (j.status === "booked" || j.status === "waitlist") { await loadMe(); setDone({ kind: j.status, credits: j.packRemaining, bookingId: j.bookingId }); }
    else if (j.status === "needs_payment") await loadMe();
    else setError(j.message ?? "Something went wrong.");
  }

  async function startPayment() {
    if (!chosen) return;
    setBusy(true); setError("");
    const r = await authFetch("/api/orders", { method: "POST", body: JSON.stringify({ packageId: chosen, classKey }) });
    const j = await r.json();
    setBusy(false);
    if (!r.ok) { setError(j.error ?? "Could not start the payment."); return; }
    setPayUrl(j.payUrl ?? null);
    setOrderAmount(j.order.amount);
    setOrderId(j.order.id);
  }

  async function chooseMat(choice: "studio" | "own" | null) {
    setMatAsked(true);
    if (!choice || !done?.bookingId) return;
    setMat(choice);
    await authFetch(`/api/bookings/${done.bookingId}`, { method: "PATCH", body: JSON.stringify({ mat: choice }) });
  }

  async function simulatePay() {
    if (!orderId) return;
    setBusy(true);
    await authFetch(`/api/orders/${orderId}/simulate-pay`, { method: "POST" });
    await finishOrder(orderId);
    setBusy(false);
  }

  if (!ready) return <p className="muted">Loading…</p>;

  const classCard = cls && (
    <div className="flow-card">
      <div className="eyebrow">{chosen && !orderId ? "Booking" : "You're booking"}</div>
      <div className="card-title">{cls.name}</div>
      <div className="muted small">{formatFullDay(parseISO(cls.iso))} · {cls.time} · {cls.duration}</div>
      <div className="muted small">{cls.teacher}</div>
      {cls.full && <div className="small strong deep">This class is full. You can join the waitlist.</div>}
    </div>
  );

  // ---------- Result ----------
  if (done) {
    return (
      <div className="flow center-col">
        {done.bookingId && done.kind !== "package" && !matAsked && (
          <div className="modal-back" role="dialog" aria-modal="true" aria-labelledby="mat-title">
            <div className="modal">
              <h2 id="mat-title">Your mat</h2>
              <p className="muted">Do you need a mat from the studio, or will you bring your own?</p>
              <div className="modal-choices">
                <button className="modal-choice" autoFocus onClick={() => chooseMat("studio")}><b>I need a studio mat</b><span className="muted small">We will have one ready for you.</span></button>
                <button className="modal-choice" onClick={() => chooseMat("own")}><b>I will bring my own</b><span className="muted small">See you with your mat.</span></button>
              </div>
              <button className="modal-skip" onClick={() => chooseMat(null)}>Decide later</button>
            </div>
          </div>
        )}
        <div className="flow-tick" aria-hidden>{done.kind === "waitlist" ? "…" : "✓"}</div>
        <h1 className="h1 h1-page">
          {done.kind === "booked" && "You're booked"}
          {done.kind === "waitlist" && "You're on the waitlist"}
          {done.kind === "package" && "Your package is active"}
        </h1>
        {cls && done.kind !== "package" && classCard}
        {done.kind === "waitlist" && <p className="flow-note">If a spot opens, we book you automatically. No credit is used until then. The waitlist closes 12 hours before class.</p>}
        {done.kind === "booked" && <p className="flow-note">Arrive 10 minutes early. Cancel up to 12 hours before class to keep your credit.</p>}
        {mat && (
          <p className="flow-note">
            Mat: <b>{mat === "studio" ? "studio mat" : "your own mat"}</b>{" "}
            <button type="button" className="text-link forgot" onClick={() => setMatAsked(false)}>Change</button>
          </p>
        )}
        {me && <p className="flow-note"><b>{me.credits}</b> {me.credits === 1 ? "class" : "classes"} left.</p>}
        <div className="flow-actions">
          {done.kind === "package"
            ? <Link href="/schedule" className="btn btn-primary btn-block">Book your first class</Link>
            : <Link href="/account" className="btn btn-primary btn-block">View my bookings</Link>}
          {done.kind === "booked" && cls && classKey && (
            <button className="btn btn-outline btn-block" onClick={() => downloadFile("plot-twist-class.ics", buildIcs(classKey, cls), "text/calendar")}>Add to calendar</button>
          )}
          <Link href="/schedule" className="btn btn-outline btn-block">Browse classes</Link>
        </div>
      </div>
    );
  }

  // ---------- Step 1: sign in ----------
  if (!me) {
    return (
      <div className="flow">
        <div className="eyebrow">Step 1 of 3</div>
        <h1 className="h1 h1-page">Your details</h1>
        {classCard}
        <AuthForm onDone={async () => { await loadMe(); }} />
      </div>
    );
  }

  // ---------- Step 3: QRIS ----------
  if (orderId) {
    const pkg = [...packages, ...firstPlot].find((p) => p.id === chosen)!;
    return (
      <div className="flow">
        <div className="eyebrow">Step 3 of 3</div>
        <h1 className="h1 h1-page">Checkout</h1>
        <div className="flow-card">
          <div className="flow-row"><div><div className="card-title">{pkg.name}</div><div className="muted small">{pkg.classes} {pkg.classes === 1 ? "class" : "classes"} · valid {pkg.validity}</div></div><div className="price-sm">{formatIDR(orderAmount ?? pkg.price)}</div></div>
          {orderAmount !== null && orderAmount < pkg.price && <div className="muted small flow-sep">Referral discount applied: <s>{formatIDR(pkg.price)}</s></div>}
          {cls && <div className="muted small flow-sep"><b>Booked after payment:</b><br />{cls.name} · {formatFullDay(parseISO(cls.iso))} · {cls.time}</div>}
        </div>
        <div className="flow-card center-col">
          <div className="strong">Pay with QRIS</div>
          {payUrl ? (
            <>
              <a href={payUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-block">Open QRIS payment</a>
              <div className="muted small center">A secure payment page opens in a new tab. Scan the QR with any banking or e-wallet app, then come back here. We confirm automatically once it is paid.</div>
            </>
          ) : (
            <>
              <div className="qr-box" role="img" aria-label="QR code placeholder" />
              <div className="muted small center">Scan with any banking or e-wallet app. We confirm automatically once it is paid.</div>
            </>
          )}
        </div>
        <div className="flow-total"><span className="strong">Total</span><span className="price-sm">{formatIDR(orderAmount ?? pkg.price)}</span></div>
        {SIMULATE && (
          <button className="btn btn-dark btn-block" onClick={simulatePay} disabled={busy}>Simulate payment (testing only)</button>
        )}
        <p className="flow-note">Cancel up to 12 hours before class to keep your credit.</p>
        {error && <p className="flow-error" role="alert">{error}</p>}
      </div>
    );
  }

  // ---------- Step 2: use a credit, or pick a package ----------
  if (classKey && cls && me.credits > 0) {
    return (
      <div className="flow">
        <div className="eyebrow">Step 2 of 2</div>
        <h1 className="h1 h1-page">{cls.full ? "Join the waitlist" : "Confirm booking"}</h1>
        {classCard}
        <p className="flow-note">{cls.full ? "No credit is used until a spot opens." : "This uses 1 class credit."} You have <b>{me.credits}</b> {me.credits === 1 ? "class" : "classes"} left.</p>
        {error && <p className="flow-error" role="alert">{error}</p>}
        <button className="btn btn-primary btn-block" onClick={confirmWithCredit} disabled={busy}>
          {busy ? "Please wait…" : cls.full ? "Join waitlist" : "Confirm booking"}
        </button>
      </div>
    );
  }

  const options: Pkg[] = [...(me.usedFirstPlot || !firstPlotOpen() ? [] : [...firstPlot].reverse()), ...packages];
  const selected = options.find((p) => p.id === chosen) ?? null;
  return (
    <div className="flow">
      <div className="eyebrow">Step 2 of 3</div>
      <h1 className="h1 h1-page">{classKey ? "You have no credits yet" : "Choose your package"}</h1>
      {classKey && classCard}
      {me.usedFirstPlot && <p className="flow-note">First Plot is for new members and can only be used once. Here are our regular packs.</p>}
      <div className="flow-options" role="radiogroup" aria-label="Package">
        {options.map((p) => (
          <label key={p.id} className={`flow-option ${chosen === p.id ? "is-selected" : ""}`}>
            <input type="radio" name="pkg" checked={chosen === p.id} onChange={() => setChosen(p.id)} />
            <span className="grow">
              {p.oncePerPerson && <span className="eyebrow">Opening deal · new members only</span>}
              <span className="card-title">{p.name}</span>
              <span className="muted small">{p.classes} {p.classes === 1 ? "class" : "classes"} · valid {p.validity}{p.classes > 1 ? ` · ${formatIDR(perClass(p))} per class` : ""}</span>
              {p.regularPrice && <span className="muted small">Regular <s>{formatIDR(p.regularPrice)}</s></span>}
              {priceOf(p) < p.price && <span className="muted small">Referral discount <s>{formatIDR(p.price)}</s></span>}
            </span>
            <span className="price-sm">{formatIDR(priceOf(p))}</span>
          </label>
        ))}
      </div>
      {me.referral?.discountEligible && <p className="flow-note">{refMsg || `Referral discount active: ${REFERRAL_DISCOUNT_PCT}% off your first purchase of a regular package.${REFERRAL_ON_FIRST_PLOT ? "" : " It cannot be combined with First Plot, and it is used up once you buy First Plot."}`}</p>}
      {me.referral?.canApplyCode && !me.referral.referredBy && (
        <details className="ref-box">
          <summary>Have a referral code?</summary>
          <div className="ref-row">
            <input aria-label="Referral code" placeholder="PLOT-XXXXX" value={refInput} onChange={(e) => setRefInput(e.target.value)} />
            <button type="button" className="btn btn-outline btn-sm" onClick={() => applyCode(refInput)}>Apply</button>
          </div>
          {refMsg && <p className="flow-note" role="status">{refMsg}</p>}
        </details>
      )}
      {error && <p className="flow-error" role="alert">{error}</p>}
      <button className="btn btn-primary btn-block" onClick={startPayment} disabled={!selected || busy}>
        {selected ? `Continue · ${formatIDR(priceOf(selected))}` : "Choose a package"}
      </button>
    </div>
  );
}

export function AuthForm({ onDone, startMode = "signup" }: { onDone: () => void; startMode?: "signup" | "signin" }) {
  const [mode, setMode] = useState<"signup" | "signin">(startMode);
  const [f, setF] = useState({ name: "", whatsapp: "", email: "", password: "" });
  const [agreeData, setAgreeData] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState("");
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setBusy(true);
    const sb = supabaseBrowser();
    if (mode === "signup") {
      const { data, error } = await sb.auth.signUp({ email: f.email, password: f.password });
      if (error) { setError(error.message); setBusy(false); return; }
      if (!data.session) { setError("Please confirm your email first, then sign in."); setMode("signin"); setBusy(false); return; }
      await authFetch("/api/me", { method: "POST", body: JSON.stringify({ fullName: f.name, whatsapp: f.whatsapp, consent: agreeData, terms: agreeTerms, marketing }) });
    } else {
      const { error } = await sb.auth.signInWithPassword({ email: f.email, password: f.password });
      if (error) { setError("Wrong email or password."); setBusy(false); return; }
    }
    setBusy(false);
    onDone();
  }

  async function forgot() {
    setError(""); setInfo("");
    if (!f.email) { setError("Type your email above first."); return; }
    const { error } = await supabaseBrowser().auth.resetPasswordForEmail(f.email, { redirectTo: `${window.location.origin}/reset-password` });
    if (error) setError(error.message);
    else setInfo("If this email has an account, we sent a link to reset the password. Check your inbox and spam folder.");
  }

  const signup = mode === "signup";
  return (
    <form className="auth-form" onSubmit={submit}>
      <div className="seg" role="tablist">
        <button type="button" className={signup ? "is-on" : ""} onClick={() => setMode("signup")}>Create account</button>
        <button type="button" className={!signup ? "is-on" : ""} onClick={() => setMode("signin")}>Sign in</button>
      </div>
      {signup && (
        <>
          <label className="field">Full name<input required value={f.name} onChange={set("name")} autoComplete="name" /></label>
          <label className="field">WhatsApp number<input required type="tel" placeholder="+62 ..." value={f.whatsapp} onChange={set("whatsapp")} autoComplete="tel" /></label>
        </>
      )}
      <label className="field">Email<input required type="email" value={f.email} onChange={set("email")} autoComplete="email" /></label>
      <label className="field">Password<input required type="password" minLength={8} value={f.password} onChange={set("password")} autoComplete={signup ? "new-password" : "current-password"} /></label>
      {signup && (
        <div className="consent-box">
          <label className="check"><input type="checkbox" checked={agreeData} onChange={(e) => setAgreeData(e.target.checked)} required />
            <span>I agree that Plot Twist Studio may collect and use my name, WhatsApp number and email to manage my account and bookings and to contact me about my classes, as described in the <a href="/privacy" target="_blank" rel="noopener">Privacy Policy</a>.</span></label>
          <label className="check"><input type="checkbox" checked={agreeTerms} onChange={(e) => setAgreeTerms(e.target.checked)} required />
            <span>I have read and agree to the <a href="/terms" target="_blank" rel="noopener">Terms of Use</a>, including the {CANCEL_HOURS}-hour cancellation rule.</span></label>
          <label className="check"><input type="checkbox" checked={marketing} onChange={(e) => setMarketing(e.target.checked)} />
            <span>Optional: send me studio news and offers. You can still book if you leave this unticked.</span></label>
        </div>
      )}
      {!signup && <button type="button" className="text-link forgot" onClick={forgot}>Forgot password?</button>}
      {error && <p className="flow-error" role="alert">{error}</p>}
      {info && <p className="flow-note" role="status">{info}</p>}
      <button className="btn btn-primary btn-block" disabled={busy}>{busy ? "Please wait…" : "Continue"}</button>
    </form>
  );
}
