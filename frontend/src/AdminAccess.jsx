import { useState } from "react";
import { apiUrl } from "./api.js";

const ADMIN_AUTH_URL = apiUrl("/api/admin");

export default function AdminAccess({ onAuthenticated, onBack }) {
  const [key, setKey] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setMessage("");
    setBusy(true);
    try {
      const response = await fetch(`${ADMIN_AUTH_URL}/login`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Developer sign-in failed.");
      onAuthenticated(data.admin);
    } catch (error) {
      setMessage(error.message || "Could not reach the developer sign-in service.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="student-access-shell">
      <section className="student-access-card" aria-labelledby="admin-access-title">
        <div className="student-access-brand" aria-label="Cyber Practice Lab">
          <span className="student-access-mark" aria-hidden="true" />
          <span>Cyber Practice Lab</span>
        </div>
        <p className="student-access-eyebrow">Developer workspace</p>
        <h1 id="admin-access-title">Admin sign in</h1>
        <p className="student-access-intro">Enter your private access code to continue.</p>
        <form className="student-access-form" onSubmit={submit}>
          <label htmlFor="admin-access-key">Access code</label>
          <input
            id="admin-access-key"
            type="password"
            inputMode="numeric"
            autoComplete="current-password"
            maxLength={64}
            value={key}
            onChange={(event) => setKey(event.target.value)}
            required
          />
          {message && <p className="student-access-message" role="alert">{message}</p>}
          <button className="student-access-submit" type="submit" disabled={busy || !key}>
            {busy ? "Checking…" : "Continue as admin"}
          </button>
        </form>
        <button className="student-access-switch" type="button" onClick={onBack}>
          Back to sign in choices
        </button>
      </section>
    </main>
  );
}
