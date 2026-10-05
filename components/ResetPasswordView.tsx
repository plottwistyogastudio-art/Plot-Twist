"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase";

// Opened from the link in the reset email. Supabase reads the link and signs the person in
// for a moment, so they can choose a new password.
export default function ResetPasswordView() {
  const [ready, setReady] = useState(false);
  const [checked, setChecked] = useState(false);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const sb = supabaseBrowser();
    const { data: sub } = sb.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    sb.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
      setChecked(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (pw !== pw2) return setError("The two passwords are not the same.");
    setBusy(true);
    const { error } = await supabaseBrowser().auth.updateUser({ password: pw });
    setBusy(false);
    if (error) setError(error.message);
    else setDone(true);
  }

  if (done)
    return (
      <div className="flow">
        <h1 className="h1 h1-page">Password changed</h1>
        <p className="lead">You can now use your new password.</p>
        <Link href="/schedule" className="btn btn-primary">Book a class</Link>
      </div>
    );

  if (checked && !ready)
    return (
      <div className="flow">
        <h1 className="h1 h1-page">This link has expired</h1>
        <p className="lead">Reset links only work once and for a short time. Please ask for a new one.</p>
        <Link href="/login" className="btn btn-primary">Back to sign in</Link>
      </div>
    );

  return (
    <form className="flow auth-form" onSubmit={submit}>
      <h1 className="h1 h1-page">Choose a new password</h1>
      <label className="field">New password<input type="password" required minLength={8} value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" /></label>
      <label className="field">Repeat the password<input type="password" required minLength={8} value={pw2} onChange={(e) => setPw2(e.target.value)} autoComplete="new-password" /></label>
      {error && <p className="flow-error" role="alert">{error}</p>}
      <button className="btn btn-primary btn-block" disabled={busy || !ready}>{busy ? "Please wait…" : "Save new password"}</button>
    </form>
  );
}
