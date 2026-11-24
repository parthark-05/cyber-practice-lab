import { useState } from "react";
import "./StudentAccess.css";
import { apiUrl } from "./api.js";

const FACULTY_AUTH_URL = apiUrl("/api/faculty");

export default function FacultyAccess({ onAuthenticated, onBack }) {
  const [mode, setMode] = useState("login");
  const [facultyId, setFacultyId] = useState("");
  const [setupCode, setSetupCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setMessage("");
    if (mode === "setup" && password !== confirmPassword) {
      setMessage("The passwords do not match.");
      return;
    }
    if (mode === "setup" && password.length < 8) {
      setMessage("Choose a password with at least 8 characters.");
      return;
    }

    setBusy(true);
    try {
      const response = await fetch(`${FACULTY_AUTH_URL}/${mode === "setup" ? "activate" : "login"}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mode === "setup"
          ? { facultyId, setupCode, password, confirmPassword }
          : { facultyId, password }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Could not sign in.");
      onAuthenticated(data.faculty);
    } catch (error) {
      setMessage(error instanceof TypeError
        ? "Could not reach the faculty service. Make sure the backend is running."
        : error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="student-access-shell">
      <section className="student-access-card" aria-labelledby="faculty-access-title">
        <div className="student-access-brand" aria-label="Cyber Practice Lab">
          <span className="student-access-mark" aria-hidden="true" />
          <span>Cyber Practice Lab</span>
        </div>
        <p className="student-access-eyebrow">Faculty workspace</p>
        <h1 id="faculty-access-title">{mode === "setup" ? "Set your password" : "Faculty sign in"}</h1>
        <p className="student-access-intro">
          {mode === "setup"
            ? "Use your one-time faculty setup code to activate your account."
            : "Sign in to create classes and assign practice labs."}
        </p>
        <form className="student-access-form" onSubmit={submit}>
          <label htmlFor="faculty-id">Faculty ID</label>
          <input id="faculty-id" type="text" autoComplete="username" maxLength={24}
            placeholder="DEMO-FAC-001" value={facultyId}
            onChange={(event) => setFacultyId(event.target.value.toUpperCase())} required />
          {mode === "setup" && <>
            <label htmlFor="faculty-setup-code">One-time setup code</label>
            <input id="faculty-setup-code" type="text" autoComplete="off" maxLength={32}
              placeholder="Enter the code from the seed output" value={setupCode}
              onChange={(event) => setSetupCode(event.target.value.toUpperCase())} required />
          </>}
          <label htmlFor="faculty-password">{mode === "setup" ? "Create password" : "Password"}</label>
          <input id="faculty-password" type="password" autoComplete={mode === "setup" ? "new-password" : "current-password"}
            maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} required />
          {mode === "setup" && <>
            <label htmlFor="faculty-confirm-password">Confirm password</label>
            <input id="faculty-confirm-password" type="password" autoComplete="new-password"
              maxLength={128} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required />
          </>}
          {message && <p className="student-access-message" role="alert">{message}</p>}
          <button className="student-access-submit" type="submit" disabled={busy}>
            {busy ? "Please wait…" : mode === "setup" ? "Activate faculty account" : "Sign in"}
          </button>
        </form>
        <button className="student-access-switch" type="button" onClick={() => {
          setMode(mode === "setup" ? "login" : "setup");
          setMessage("");
          setPassword("");
          setConfirmPassword("");
          setSetupCode("");
        }}>
          {mode === "setup" ? "Already activated? Sign in" : "First time? Activate account"}
        </button>
        <button className="student-access-switch" type="button" onClick={onBack}>
          Back to workspace choices
        </button>
      </section>
    </main>
  );
}
