import { useEffect, useRef, useState } from "react";
import StudentAccess from "./StudentAccess.jsx";
import FacultyAccess from "./FacultyAccess.jsx";
import AdminAccess from "./AdminAccess.jsx";
import MatrixElectricField from "./MatrixElectricField.jsx";
import "./AccessPortal.css";

export default function AccessPortal({ onStudentAuthenticated, onFacultyAuthenticated, onAdminAuthenticated }) {
  const [stage, setStage] = useState("welcome");
  const [selectedRole, setSelectedRole] = useState(null);
  const transitionTimer = useRef(null);

  useEffect(() => () => window.clearTimeout(transitionTimer.current), []);

  function transition(nextStage, role = null) {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.clearTimeout(transitionTimer.current);
    setSelectedRole(role);
    setStage(nextStage);
    const destination = nextStage === "welcome-exit" ? "roles" : "login";
    transitionTimer.current = window.setTimeout(
      () => setStage(role ? `${role}-login` : destination),
      reducedMotion ? 30 : 680
    );
  }

  function backToRoles() {
    window.clearTimeout(transitionTimer.current);
    setSelectedRole(null);
    setStage("roles");
  }

  function backToWelcome() {
    window.clearTimeout(transitionTimer.current);
    setSelectedRole(null);
    setStage("welcome");
  }

  const isWelcome = stage === "welcome" || stage === "welcome-exit";
  const isRoles = stage === "roles" || stage === "roles-exit";
  const isExiting = stage.endsWith("-exit");

  if (["student-login", "faculty-login", "admin-login"].includes(stage)) {
    return (
      <div className="access-portal-root">
        <MatrixElectricField />
        <div className="portal-login-screen">
          {stage === "student-login" ? (
            <StudentAccess onAuthenticated={onStudentAuthenticated} onBack={backToRoles} />
          ) : stage === "faculty-login" ? (
            <FacultyAccess onAuthenticated={onFacultyAuthenticated} onBack={backToRoles} />
          ) : (
            <AdminAccess onAuthenticated={onAdminAuthenticated} onBack={backToRoles} />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`access-portal-root portal-stage-${isRoles ? "roles" : "welcome"}`}>
      <MatrixElectricField />
      <svg className="portal-target-surges" viewBox="0 0 1000 900" preserveAspectRatio="none" aria-hidden="true">
        <path className="portal-zap portal-zap-welcome" d="M145 90 L210 145 L184 205 L272 265 L238 324 L340 390 L309 448 L421 510 L500 612" />
        <path className="portal-zap portal-zap-student" d="M45 240 L132 280 L104 335 L182 372 L155 426 L230 464 L210 518 L300 590" />
        <path className="portal-zap portal-zap-faculty" d="M955 230 L874 278 L906 333 L824 374 L852 429 L775 467 L796 522 L704 590" />
      </svg>

      <main className={`portal-stage-card${isExiting ? " is-dissolving" : ""}`}>
        <div className="portal-brand">
          <span className="student-access-mark" aria-hidden="true" />
          <span>Cyber Practice Lab</span>
        </div>

        {isWelcome ? (
          <section className="portal-welcome" aria-labelledby="portal-welcome-title">
            <p className="student-access-eyebrow">A hands-on cyber learning space</p>
            <h1 id="portal-welcome-title">Learn by doing.<br />Build real security skills.</h1>
            <p className="portal-description">
              Explore guided labs, practice safely, and track your progress in one place.
            </p>
            <button
              type="button"
              className={`portal-action-button${stage === "welcome-exit" ? " is-nuked" : ""}`}
              onClick={() => transition("welcome-exit")}
              disabled={isExiting}
            >
              Sign in
              <span aria-hidden="true">↗</span>
            </button>
            <p className="portal-hint">A focused workspace for students and faculty</p>
          </section>
        ) : (
          <section className="portal-roles" aria-labelledby="portal-roles-title">
            <p className="student-access-eyebrow">Choose your workspace</p>
            <h1 id="portal-roles-title">Who’s signing in?</h1>
            <p className="portal-description">Select your role to continue to the matching sign-in page.</p>
            <div className="portal-role-grid">
              <article className={`portal-role-card${selectedRole === "student" && isExiting ? " is-selected" : ""}`}>
                <span className="portal-role-symbol" aria-hidden="true">01</span>
                <div>
                  <h2>Students</h2>
                  <p>Continue labs, join a class, and follow your learning progress.</p>
                </div>
                <button
                  type="button"
                  className={`portal-action-button${selectedRole === "student" && isExiting ? " is-nuked" : ""}`}
                  onClick={() => transition("roles-exit", "student")}
                  disabled={isExiting}
                >
                  Login for students <span aria-hidden="true">↗</span>
                </button>
              </article>
              <article className={`portal-role-card${selectedRole === "faculty" && isExiting ? " is-selected" : ""}`}>
                <span className="portal-role-symbol portal-role-symbol-faculty" aria-hidden="true">02</span>
                <div>
                  <h2>Faculty</h2>
                  <p>Create classes, assign labs, and share class access codes.</p>
                </div>
                <button
                  type="button"
                  className={`portal-action-button portal-action-faculty${selectedRole === "faculty" && isExiting ? " is-nuked" : ""}`}
                  onClick={() => transition("roles-exit", "faculty")}
                  disabled={isExiting}
                >
                  Login for faculty <span aria-hidden="true">↗</span>
                </button>
              </article>
            </div>
            <button
              type="button"
              className="portal-back-button"
              onClick={() => transition("roles-exit", "admin")}
              disabled={isExiting}
            >
              Developer? Admin sign in
            </button>
            <button type="button" className="portal-back-button" onClick={backToWelcome} aria-label="Back to welcome screen">
              <span aria-hidden="true">←</span> Welcome
            </button>
          </section>
        )}
      </main>
    </div>
  );
}
