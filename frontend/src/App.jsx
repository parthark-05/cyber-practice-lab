import { useEffect, useRef, useState } from "react";
import "./App.css";

// Where the backend API runs during development.
const LABS_URL = "http://localhost:4000/api/labs";

// ---------- Mock data (no network requests) ----------
const roles = [
  {
    id: "teach",
    tag: "For instructors",
    title: "Teach a class",
    description:
      "Create a lab session, choose exercises, and track how your students are progressing.",
    buttonLabel: "Set up a class",
    buttonClass: "button-primary",
    message: "Class setup is coming soon. (Mock action: Teach a class)",
  },
  {
    id: "practice",
    tag: "For learners",
    title: "Practice on your own",
    description:
      "Work through hands-on labs at your own pace and build skills with instant feedback.",
    buttonLabel: "Start practicing",
    buttonClass: "button-primary",
    message: "Solo practice is coming soon. (Mock action: Practice on your own)",
  },
];

const stats = [
  { id: "completed", label: "Labs completed", value: "7", note: "+2 this week" },
  { id: "streak", label: "Practice streak", value: "5 days", note: "Best: 9 days" },
  { id: "hours", label: "Hours practiced", value: "12.5", note: "Goal: 20 hours" },
  { id: "score", label: "Average score", value: "86%", note: "Up 4% this month" },
];

const continueItems = [
  {
    id: "web-basics",
    title: "Web Security Basics",
    module: "Module 3 of 5: Sessions and cookies",
    progress: 60,
  },
  {
    id: "secure-coding",
    title: "Secure Coding Habits",
    module: "Module 1 of 4: Error handling",
    progress: 25,
  },
];

const upcoming = [
  { id: "up-1", title: "Intro to Web Security", meta: "Mon, 10:00 AM · Room B204" },
  { id: "up-2", title: "Lab session: Access control", meta: "Wed, 2:00 PM · Online" },
];

const recent = [
  { id: "rec-1", title: "Finished Input validation (quiz)", meta: "Yesterday · Score 92%" },
  { id: "rec-2", title: "Started Secure Coding Habits", meta: "2 days ago" },
  { id: "rec-3", title: "Earned the 5-day streak badge", meta: "3 days ago" },
];

// ---------- Helpers for lab data from the API ----------

// The API sends values like "BEGINNER". These maps turn them into
// a readable label and the matching CSS class for the badge.
const difficultyLabels = {
  BEGINNER: "Beginner",
  INTERMEDIATE: "Intermediate",
  ADVANCED: "Advanced",
};

const difficultyBadgeClasses = {
  BEGINNER: "badge-beginner",
  INTERMEDIATE: "badge-intermediate",
  ADVANCED: "badge-advanced",
};

function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// Turns one lab from the API into the shape the cards below use.
function toLabCard(lab) {
  const tags = Array.isArray(lab.tags) ? lab.tags : [];

  return {
    id: lab.id,
    title: lab.title,
    description: lab.description,
    difficulty: difficultyLabels[lab.difficulty] || capitalize(String(lab.difficulty).toLowerCase()),
    badgeClass: difficultyBadgeClasses[lab.difficulty] || "badge-beginner",
    time: `${lab.estimatedMinutes} min`,
    tags: tags.map(capitalize),
  };
}

// ---------- Component ----------
function App() {
  // One small piece of state: the message shown near the top of the page.
  const [statusMessage, setStatusMessage] = useState(
    "Pick a role, resume a course, or preview a lab to get started."
  );

  // Labs loaded from the backend.
  // labsStatus is one of: "loading", "success", or "error".
  const [labs, setLabs] = useState([]);
  const [labsStatus, setLabsStatus] = useState("loading");
  // Changing this number makes the labs load again ("Try again" button).
  const [labsReloadCount, setLabsReloadCount] = useState(0);

  // The lab currently shown in the preview modal (null = modal is closed).
  const [selectedLab, setSelectedLab] = useState(null);
  const isModalOpen = selectedLab !== null;

  // A reference to the glowing circle that follows the mouse.
  const cursorGlowRef = useRef(null);

  // References used by the preview modal.
  const dialogRef = useRef(null); // the modal box
  const closeButtonRef = useRef(null); // the X button (gets focus when opened)
  const lastFocusedRef = useRef(null); // the button that opened the modal
  const backdropPressRef = useRef(false); // did the click start on the backdrop?

  function handleAction(message) {
    setStatusMessage(message);
  }

  function openLabPreview(lab, event) {
    // Remember which button opened the modal so focus can return to it.
    lastFocusedRef.current = event.currentTarget;
    setSelectedLab(lab);
    handleAction(`Previewing the "${lab.title}" lab.`);
  }

  function closeLabPreview() {
    setSelectedLab(null);
  }

  // Only close when the press AND the click both happen on the dark backdrop,
  // so selecting text inside the modal and releasing outside does not close it.
  function handleBackdropPointerDown(event) {
    backdropPressRef.current = event.target === event.currentTarget;
  }

  function handleBackdropClick(event) {
    if (backdropPressRef.current && event.target === event.currentTarget) {
      closeLabPreview();
    }
    backdropPressRef.current = false;
  }

  // Load the labs from the API when the page opens (and on "Try again").
  useEffect(() => {
    const controller = new AbortController();

    async function loadLabs() {
      setLabsStatus("loading");

      try {
        const response = await fetch(LABS_URL, { signal: controller.signal });

        if (!response.ok) {
          throw new Error("The server responded with status " + response.status);
        }

        const data = await response.json();

        if (!Array.isArray(data.labs)) {
          throw new Error("The server response was not in the expected format");
        }

        setLabs(data.labs.map(toLabCard));
        setLabsStatus("success");
      } catch (error) {
        // Ignore the cancellation that happens when the page closes.
        if (error.name === "AbortError") return;

        console.error("Could not load labs:", error);
        setLabsStatus("error");
      }
    }

    loadLabs();

    // Cancel the request if the component is removed.
    return () => controller.abort();
  }, [labsReloadCount]);

  // Pointer effects: a soft glow follows the mouse, and glass panels
  // get a faint highlight where the mouse is. Nothing here changes layout.
  useEffect(() => {
    const glow = cursorGlowRef.current;
    if (!glow) return;

    // Only run on devices with a real mouse, and only if the person has
    // not asked for reduced motion.
    const hasMouse = window.matchMedia("(hover: hover) and (pointer: fine)");
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!hasMouse.matches || reduceMotion.matches) return;

    let targetX = 0; // where the mouse is
    let targetY = 0;
    let currentX = 0; // where the glow is drawn (it eases toward the mouse)
    let currentY = 0;
    let frameId = null;
    let hasMoved = false;

    function draw() {
      // Move 12% of the remaining distance each frame for a smooth trail.
      currentX += (targetX - currentX) * 0.12;
      currentY += (targetY - currentY) * 0.12;
      glow.style.transform =
        "translate3d(" + currentX + "px, " + currentY + "px, 0) translate(-50%, -50%)";

      const isClose =
        Math.abs(targetX - currentX) < 0.5 && Math.abs(targetY - currentY) < 0.5;
      // Keep animating until the glow catches up, then stop to save work.
      frameId = isClose ? null : requestAnimationFrame(draw);
    }

    function handlePointerMove(event) {
      // Ignore touch and pen input. Only a mouse moves the glow.
      if (event.pointerType !== "mouse") return;

      targetX = event.clientX;
      targetY = event.clientY;

      if (!hasMoved) {
        // First movement: place the glow right at the cursor and show it.
        hasMoved = true;
        currentX = targetX;
        currentY = targetY;
        glow.classList.add("is-active");
      }

      if (frameId === null) {
        frameId = requestAnimationFrame(draw);
      }

      // If the mouse is over a glass panel, tell the panel where it is
      // (relative to the panel) so CSS can place a faint highlight there.
      if (event.target instanceof Element) {
        const panel = event.target.closest(".panel");
        if (panel) {
          const box = panel.getBoundingClientRect();
          panel.style.setProperty("--mx", event.clientX - box.left + "px");
          panel.style.setProperty("--my", event.clientY - box.top + "px");
        }
      }
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

    // Clean up when the component is removed.
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      document.documentElement.removeEventListener("pointerleave", handlePointerLeave);
      document.documentElement.removeEventListener("pointerenter", handlePointerEnter);
      if (frameId !== null) cancelAnimationFrame(frameId);
    };
  }, []);

  // Modal behavior: runs while the preview modal is open.
  // - stops the page behind it from scrolling
  // - moves focus into the modal
  // - closes on Escape and keeps Tab focus inside the modal
  // - returns focus to the "Preview lab" button when it closes
  useEffect(() => {
    if (!isModalOpen) return;

    const dialog = dialogRef.current;

    // Lock page scroll (and keep the layout from jumping when the scrollbar hides).
    const previousOverflow = document.body.style.overflow;
    const previousPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = scrollbarWidth + "px";
    }

    // Put keyboard focus inside the modal.
    if (closeButtonRef.current) closeButtonRef.current.focus();

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        setSelectedLab(null);
        return;
      }

      // Keep Tab and Shift+Tab cycling through the modal's own buttons.
      if (event.key !== "Tab" || !dialog) return;

      const focusable = dialog.querySelectorAll("button:not([disabled])");
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    // Clean up when the modal closes.
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPaddingRight;
      if (lastFocusedRef.current) lastFocusedRef.current.focus();
    };
  }, [isModalOpen]);

  return (
    <div className="app">
      {/* Decorative glow that follows the mouse (hidden from screen readers) */}
      <div className="cursor-glow" ref={cursorGlowRef} aria-hidden="true"></div>

      <header className="site-header">
        <div className="container header-inner">
          <div className="brand">
            <span className="brand-mark" aria-hidden="true"></span>
            <span className="brand-name">Cyber Practice Lab</span>
          </div>
          <div className="header-actions">
            <span className="pill">Student preview</span>
            <button
              type="button"
              className="button button-ghost"
              onClick={() =>
                handleAction("You have 2 new notifications. (Mock action)")
              }
            >
              Notifications
            </button>
          </div>
        </div>
      </header>

      <main className="container main">
        {/* Welcome area and progress stats, side by side on desktop */}
        <div className="top-grid">
          <section className="panel hero" aria-labelledby="welcome-heading">
            <p className="eyebrow">Dashboard</p>
            <h1 id="welcome-heading" className="hero-title">
              Welcome back to Cyber Practice Lab
            </h1>
            <p className="hero-text">
              Build real cybersecurity skills through guided, hands-on labs.
              Pick up where you left off, or choose a new path below.
            </p>
            <p className="status" role="status" aria-live="polite">
              <span className="status-dot" aria-hidden="true"></span>
              {statusMessage}
            </p>
          </section>

          <section className="progress-section" aria-labelledby="stats-heading">
            <h2 id="stats-heading" className="section-title">
              Your progress
            </h2>
            <ul className="stat-grid">
              {stats.map((stat) => (
                <li key={stat.id} className="panel stat-card">
                  <span className="stat-label">{stat.label}</span>
                  <strong className="stat-value">{stat.value}</strong>
                  <span className="stat-note">{stat.note}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        {/* Role cards */}
        <section className="section" aria-labelledby="roles-heading">
          <h2 id="roles-heading" className="section-title">
            How would you like to start?
          </h2>
          <div className="role-grid">
            {roles.map((role) => (
              <article
                key={role.id}
                className={`panel role-card role-card-${role.id}`}
              >
                <p className="role-tag">{role.tag}</p>
                <h3 className="role-title">{role.title}</h3>
                <p className="card-text">{role.description}</p>
                <button
                  type="button"
                  className={`button ${role.buttonClass}`}
                  onClick={() => handleAction(role.message)}
                >
                  {role.buttonLabel}
                </button>
              </article>
            ))}
          </div>
        </section>

        <div className="layout">
          <div className="content">
            {/* Continue learning */}
            <section className="section" aria-labelledby="continue-heading">
              <h2 id="continue-heading" className="section-title">
                Continue learning
              </h2>
              <ul className="continue-list">
                {continueItems.map((item) => (
                  <li key={item.id} className="panel continue-card">
                    <div className="continue-info">
                      <h3 className="card-title">{item.title}</h3>
                      <p className="card-meta">{item.module}</p>
                      <div
                        className="progress"
                        role="progressbar"
                        aria-label={`${item.title} progress`}
                        aria-valuemin="0"
                        aria-valuemax="100"
                        aria-valuenow={item.progress}
                      >
                        <span
                          className="progress-fill"
                          style={{ width: `${item.progress}%` }}
                        ></span>
                      </div>
                      <p className="progress-text">{item.progress}% complete</p>
                    </div>
                    <button
                      type="button"
                      className="button button-secondary"
                      onClick={() =>
                        handleAction(
                          `Resuming "${item.title}" soon. (Mock action)`
                        )
                      }
                    >
                      Resume
                    </button>
                  </li>
                ))}
              </ul>
            </section>

            {/* Sample labs (loaded from the backend API) */}
            <section
              className="section"
              aria-labelledby="labs-heading"
              aria-busy={labsStatus === "loading"}
            >
              <h2 id="labs-heading" className="section-title">
                Sample labs
              </h2>

              {labsStatus === "loading" && (
                <p className="status" role="status" aria-live="polite">
                  <span className="status-dot" aria-hidden="true"></span>
                  Loading labs...
                </p>
              )}

              {labsStatus === "error" && (
                <div className="panel side-panel" role="alert">
                  <h3 className="card-title">Could not load the labs</h3>
                  <p className="card-text">
                    Make sure the backend is running at http://localhost:4000,
                    then try again.
                  </p>
                  <button
                    type="button"
                    className="button button-secondary"
                    onClick={() => setLabsReloadCount(labsReloadCount + 1)}
                  >
                    Try again
                  </button>
                </div>
              )}

              {labsStatus === "success" && labs.length === 0 && (
                <p className="status" role="status">
                  <span className="status-dot" aria-hidden="true"></span>
                  No labs are published yet.
                </p>
              )}

              {labsStatus === "success" && labs.length > 0 && (
                <ul className="lab-grid">
                  {labs.map((lab) => (
                    <li key={lab.id} className="panel lab-card">
                      <div className="lab-top">
                        <h3 className="card-title">{lab.title}</h3>
                        <span className={`badge ${lab.badgeClass}`}>
                          {lab.difficulty}
                        </span>
                      </div>
                      <p className="card-text">{lab.description}</p>
                      <ul className="tag-list" aria-label="Topics">
                        {lab.tags.map((tag) => (
                          <li key={tag} className="tag">
                            {tag}
                          </li>
                        ))}
                      </ul>
                      <dl className="lab-meta">
                        <div className="meta-item">
                          <dt>Difficulty</dt>
                          <dd>{lab.difficulty}</dd>
                        </div>
                        <div className="meta-item">
                          <dt>Estimated time</dt>
                          <dd>{lab.time}</dd>
                        </div>
                      </dl>
                      <button
                        type="button"
                        className="button button-secondary"
                        aria-haspopup="dialog"
                        onClick={(event) => openLabPreview(lab, event)}
                      >
                        Preview lab
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <div className="sidebar">
            {/* Upcoming classes and recent activity */}
            <aside className="panel side-panel" aria-labelledby="schedule-heading">
              <h2 id="schedule-heading" className="side-title">
                Schedule and activity
              </h2>

              <h3 className="side-subtitle">Upcoming classes</h3>
              <ul className="timeline">
                {upcoming.map((item) => (
                  <li key={item.id} className="timeline-item">
                    <span className="timeline-title">{item.title}</span>
                    <span className="timeline-meta">{item.meta}</span>
                  </li>
                ))}
              </ul>

              <h3 className="side-subtitle">Recent activity</h3>
              <ul className="timeline">
                {recent.map((item) => (
                  <li key={item.id} className="timeline-item">
                    <span className="timeline-title">{item.title}</span>
                    <span className="timeline-meta">{item.meta}</span>
                  </li>
                ))}
              </ul>

              <button
                type="button"
                className="button button-ghost"
                onClick={() =>
                  handleAction("The full calendar is coming soon. (Mock action)")
                }
              >
                View calendar
              </button>
            </aside>

            {/* Safety note */}
            <aside className="panel safety-note" aria-labelledby="safety-heading">
              <h2 id="safety-heading" className="safety-title">
                Safety note
              </h2>
              <p className="safety-text">
                Practice labs run in isolated, intentionally vulnerable
                environments built for learning. Only use these techniques
                inside the labs, never on systems you do not own or have
                permission to test.
              </p>
            </aside>
          </div>
        </div>
      </main>

      <footer className="site-footer">
        <div className="container">
          <p className="footer-text">
            Cyber Practice Lab &middot; Prototype with mock data
          </p>
        </div>
      </footer>

      {/* Lab preview modal */}
      {selectedLab && (
        <div
          className="modal-backdrop"
          onPointerDown={handleBackdropPointerDown}
          onClick={handleBackdropClick}
        >
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="lab-modal-title"
            aria-describedby="lab-modal-description"
            ref={dialogRef}
          >
            <div className="modal-header">
              <div>
                <p className="modal-eyebrow">Lab preview</p>
                <h2 id="lab-modal-title" className="modal-title">
                  {selectedLab.title}
                </h2>
              </div>
              <button
                type="button"
                className="modal-close"
                ref={closeButtonRef}
                aria-label="Close lab preview"
                onClick={closeLabPreview}
              >
                <span aria-hidden="true">&times;</span>
              </button>
            </div>

            <p id="lab-modal-description" className="modal-description">
              {selectedLab.description}
            </p>

            <dl className="lab-meta modal-meta">
              <div className="meta-item">
                <dt>Difficulty</dt>
                <dd>
                  <span className={`badge ${selectedLab.badgeClass}`}>
                    {selectedLab.difficulty}
                  </span>
                </dd>
              </div>
              <div className="meta-item">
                <dt>Estimated time</dt>
                <dd>{selectedLab.time}</dd>
              </div>
            </dl>

            <ul className="tag-list" aria-label="Topics">
              {selectedLab.tags.map((tag) => (
                <li key={tag} className="tag">
                  {tag}
                </li>
              ))}
            </ul>

            <p className="modal-note">
              This is a preview. Labs run in isolated, intentionally vulnerable
              practice environments.
            </p>

            <div className="modal-actions">
              <button
                type="button"
                className="button button-primary"
                onClick={closeLabPreview}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;