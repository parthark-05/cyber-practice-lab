import { useEffect, useRef, useState } from "react";
import "./StudentAccess.css";

const STUDENT_AUTH_URL = "http://localhost:4000/api/student";

function measurePasswordStrength(password) {
  if (!password) return { score: 0, label: "Not set" };

  const lowered = password.toLowerCase();
  const looksCommon = ["password", "qwerty", "letmein", "welcome", "admin", "12345678"]
    .some((part) => lowered.includes(part));
  const characterTypes = [/[a-z]/.test(password), /[A-Z]/.test(password), /[0-9]/.test(password), /[^A-Za-z0-9]/.test(password)]
    .filter(Boolean).length;

  if (looksCommon || /^(.)\1+$/.test(password)) return { score: 1, label: "Weak" };
  if (password.length >= 12 && (characterTypes >= 3 || password.length >= 16)) {
    return { score: 3, label: "Strong" };
  }
  if (password.length >= 8 && (characterTypes >= 2 || password.length >= 12)) {
    return { score: 2, label: "Medium" };
  }
  return { score: 1, label: "Weak" };
}

export default function StudentAccess({ onAuthenticated, onBack }) {
  const cursorGlowRef = useRef(null);
  const [mode, setMode] = useState("login");
  const [usn, setUsn] = useState("");
  const [password, setPassword] = useState("");
  const [setupCode, setSetupCode] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const passwordStrength = measurePasswordStrength(password);

  useEffect(() => {
    const glow = cursorGlowRef.current;
    if (!glow) return;

    const hasMouse = window.matchMedia("(hover: hover) and (pointer: fine)");
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!hasMouse.matches || reduceMotion.matches) return;

    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;
    let frameId = null;
    let hasMoved = false;

    function draw() {
      currentX += (targetX - currentX) * 0.12;
      currentY += (targetY - currentY) * 0.12;
      glow.style.transform =
        `translate3d(${currentX}px, ${currentY}px, 0) translate(-50%, -50%)`;
      const isClose =
        Math.abs(targetX - currentX) < 0.5 && Math.abs(targetY - currentY) < 0.5;
      frameId = isClose ? null : requestAnimationFrame(draw);
    }

    function handlePointerMove(event) {
      if (event.pointerType !== "mouse") return;
      targetX = event.clientX;
      targetY = event.clientY;
      if (!hasMoved) {
        hasMoved = true;
        currentX = targetX;
        currentY = targetY;
        glow.classList.add("is-active");
      }
      if (frameId === null) frameId = requestAnimationFrame(draw);
    }

    function handlePointerLeave() {
      glow.classList.remove("is-active");
    }

    function handlePointerEnter() {
      if (hasMoved) glow.classList.add("is-active");
    }

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", handlePointerLeave);
    document.documentElement.addEventListener("pointerenter", handlePointerEnter);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      document.documentElement.removeEventListener("pointerleave", handlePointerLeave);
      document.documentElement.removeEventListener("pointerenter", handlePointerEnter);
      if (frameId !== null) cancelAnimationFrame(frameId);
    };
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");

    if (mode === "setup" && password !== confirmPassword) {
      setMessage("The passwords do not match. Check both fields and try again.");
      return;
    }
    if (mode === "setup" && passwordStrength.score < 2) {
      setMessage("Choose a medium or strong password before continuing.");
      return;
    }

    setIsBusy(true);
    try {
      const response = await fetch(
        `${STUDENT_AUTH_URL}/${mode === "setup" ? "activate" : "login"}`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            mode === "setup"
              ? { usn, setupCode, password, confirmPassword }
              : { usn, password }
          ),
        }
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Could not sign in.");
      onAuthenticated(data.student);
    } catch (error) {
      setMessage(
        error instanceof TypeError
          ? "Could not reach the student service. Make sure the backend is running."
          : error.message
      );
    } finally {
      setIsBusy(false);
    }
  }

  function changeMode(nextMode) {
    setMode(nextMode);
    setMessage("");
    setPassword("");
    setSetupCode("");
    setConfirmPassword("");
    setShowPassword(false);
    setShowConfirmPassword(false);
  }

  return (
    <main className="student-access-shell">
      <div className="cursor-glow" ref={cursorGlowRef} aria-hidden="true" />
      <section className="student-access-card" aria-labelledby="student-access-title">
        <div className="student-access-brand" aria-label="Cyber Practice Lab">
          <span className="student-access-mark" aria-hidden="true" />
          <span>Cyber Practice Lab</span>
        </div>

        <p className="student-access-eyebrow">Student workspace</p>
        <h1 id="student-access-title">
          {mode === "setup" ? "Set your password" : "Welcome back"}
        </h1>
        <p className="student-access-intro">
          {mode === "setup"
            ? "Use your one-time setup code, then choose a password only you know."
            : "Sign in with your student ID to continue your cybersecurity practice."}
        </p>

        <form className="student-access-form" onSubmit={handleSubmit}>
          <label htmlFor="student-usn">Student ID</label>
          <input
            id="student-usn"
            type="text"
            autoComplete="username"
            autoCapitalize="characters"
            maxLength={20}
            placeholder="DEMO-CY-001"
            value={usn}
            onChange={(event) => setUsn(event.target.value.toUpperCase())}
            required
          />

          {mode === "setup" && (
            <>
              <label htmlFor="student-setup-code">One-time setup code</label>
              <input
                id="student-setup-code"
                type="text"
                autoComplete="off"
                maxLength={32}
                placeholder="Enter the code from the backend seed output"
                value={setupCode}
                onChange={(event) => setSetupCode(event.target.value.toUpperCase())}
                required
              />
            </>
          )}

          <label htmlFor="student-password">
            {mode === "setup" ? "New password" : "Password"}
          </label>
          <div className="student-password-wrap">
            <input
              id="student-password"
              type={showPassword ? "text" : "password"}
              autoComplete={mode === "setup" ? "new-password" : "current-password"}
              maxLength={128}
              placeholder={mode === "setup" ? "Create a password" : "Enter your password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
            <button
              className="student-password-toggle"
              type="button"
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              onClick={() => setShowPassword((visible) => !visible)}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>

          {mode === "setup" && (
            <>
              <div className={`password-strength strength-${passwordStrength.score}`} role="status" aria-live="polite">
                <div className="password-strength-bars" aria-hidden="true">
                  {[1, 2, 3].map((level) => (
                    <span
                      key={level}
                      className={level <= passwordStrength.score ? "is-filled" : ""}
                    />
                  ))}
                </div>
                <div className="password-strength-caption">
                  <span>Password strength</span>
                  <strong>{passwordStrength.label}</strong>
                </div>
              </div>
              <p className="student-access-hint">
                Use 8 or more characters. A longer phrase or a mix of character types is stronger.
              </p>
              <label htmlFor="student-password-confirm">Confirm new password</label>
              <div className="student-password-wrap">
                <input
                  id="student-password-confirm"
                  type={showConfirmPassword ? "text" : "password"}
                  autoComplete="new-password"
                  maxLength={128}
                  placeholder="Type the new password again"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  required
                />
                <button
                  className="student-password-toggle"
                  type="button"
                  aria-label={showConfirmPassword ? "Hide confirmation password" : "Show confirmation password"}
                  aria-pressed={showConfirmPassword}
                  onClick={() => setShowConfirmPassword((visible) => !visible)}
                >
                  {showConfirmPassword ? "Hide" : "Show"}
                </button>
              </div>
              {confirmPassword && (
                <p
                  className={`password-match${password === confirmPassword ? " is-confirmed" : " is-mismatch"}`}
                  role="status"
                  aria-live="polite"
                >
                  {password === confirmPassword ? "✓ Passwords match" : "Passwords do not match yet"}
                </p>
              )}
            </>
          )}

          {message && <p className="student-access-message" role="alert">{message}</p>}

          <button
            className="student-access-submit"
            type="submit"
            disabled={isBusy || (mode === "setup" && passwordStrength.score < 2)}
          >
            {isBusy
              ? mode === "setup" ? "Setting up…" : "Signing in…"
              : mode === "setup" ? "Set password and continue" : "Sign in"}
          </button>
        </form>

        <button
          className="student-access-switch"
          type="button"
          onClick={() => changeMode(mode === "setup" ? "login" : "setup")}
        >
          {mode === "setup" ? "Already set a password? Sign in" : "First time here? Set up your password"}
        </button>
        <button className="student-access-switch" type="button" onClick={onBack}>
          Back to workspace choices
        </button>
      </section>
    </main>
  );
}
