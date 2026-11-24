import { useEffect, useRef, useState } from "react";
import "./App.css";
import AccessPortal from "./AccessPortal.jsx";
import MatrixElectricField from "./MatrixElectricField.jsx";
import { apiUrl } from "./api.js";

const LABS_URL = apiUrl("/api/labs");
const PROGRESS_API_URL = apiUrl("/api/progress");
const CLASSROOMS_API_URL = apiUrl("/api/classes");
const STUDENT_AUTH_URL = apiUrl("/api/student");
const FACULTY_AUTH_URL = apiUrl("/api/faculty");
const ADMIN_AUTH_URL = apiUrl("/api/admin");

const PROGRESS_STORAGE_KEY = "cyber-practice-lab.completed-labs.v1";

function progressStorageKey(usn) {
  return `${PROGRESS_STORAGE_KEY}.${usn}`;
}

function loadCompletedLabSlugs(usn) {
  if (!usn) return [];
  try {
    const saved = JSON.parse(
      window.localStorage.getItem(progressStorageKey(usn)) || "[]"
    );

    return Array.isArray(saved)
      ? [...new Set(saved.filter((slug) => typeof slug === "string"))]
      : [];
  } catch {
    return [];
  }
}

function loadReadNotificationIds(owner) {
  if (!owner) return [];
  try {
    const saved = JSON.parse(window.localStorage.getItem(`cpl.notifications.read.${owner}`) || "[]");
    return Array.isArray(saved) ? saved.filter((id) => typeof id === "string") : [];
  } catch {
    return [];
  }
}

async function saveLabProgress(labSlug, signal) {
  const response = await fetch(PROGRESS_API_URL, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ labSlug }),
    signal,
  });

  if (!response.ok) {
    throw new Error(`Progress save failed with status ${response.status}`);
  }

  return response.json();
}

// ---------- Mock data (no network requests) ----------
const roles = [
  {
    id: "practice",
    tag: "For learners",
    title: "Practice on your own",
    description:
      "Work through hands-on labs at your own pace and build skills with instant feedback.",
    buttonLabel: "Start practicing",
    buttonClass: "button-primary",
  },
];

const stats = [
  { id: "completed", label: "Labs completed", value: "0", note: "Saved on this device" },
  { id: "streak", label: "Practice streak", value: "5 days", note: "Best: 9 days" },
  { id: "hours", label: "Hours practiced", value: "12.5", note: "Goal: 20 hours" },
  { id: "score", label: "Average score", value: "86%", note: "Up 4% this month" },
];

const continueItems = [
  {
    id: "web-basics",
    title: "Web Security Basics",
    labSlug: "input-validation",
    module: "Module 3 of 5: Sessions and cookies",
    progress: 60,
  },
  {
    id: "secure-coding",
    title: "Secure Coding Habits",
    labSlug: "secure-configuration",
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
    slug: lab.slug,
    title: lab.title,
    description: lab.description,
    difficulty: difficultyLabels[lab.difficulty] || capitalize(String(lab.difficulty).toLowerCase()),
    badgeClass: difficultyBadgeClasses[lab.difficulty] || "badge-beginner",
    time: `${lab.estimatedMinutes} min`,
    tags: tags.map(capitalize),
  };
}

// ---------- "Input validation" practice: fictional form + checks ----------
// Everything below runs in the browser only. Nothing is sent anywhere.

const practiceStepTitles = ["Learn", "Try it", "Quiz", "Done"];

function makeResult(valid, message) {
  return { valid: valid, message: message };
}

// Each function checks one value and returns { valid, message }.
function validateUsername(value) {
  if (value.length === 0) return makeResult(false, "Username is required.");
  if (!/^[A-Za-z0-9_]+$/.test(value)) {
    return makeResult(false, "Use only letters, numbers, and underscores.");
  }
  if (value.length < 3) return makeResult(false, "Too short. Use at least 3 characters.");
  if (value.length > 12) return makeResult(false, "Too long. Use at most 12 characters.");
  return makeResult(true, "Looks good.");
}

function validateAge(value) {
  const text = value.trim();
  if (text === "") return makeResult(false, "Age is required.");
  if (!/^[0-9]+$/.test(text)) {
    return makeResult(false, "Use digits only (no letters, minus signs, or decimals).");
  }
  const age = Number(text);
  if (age < 13 || age > 120) return makeResult(false, "Age must be between 13 and 120.");
  return makeResult(true, "Looks good.");
}

function validateEmail(value) {
  const text = value.trim();
  if (text === "") return makeResult(false, "Email is required.");
  // A simple pattern for practice: something@something.something
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) {
    return makeResult(false, "Enter an email like name@example.com.");
  }
  return makeResult(true, "Looks good.");
}

const practiceFields = [
  {
    id: "username",
    label: "Username",
    hint: "3 to 12 characters. Letters, numbers, and underscores only.",
    inputMode: "text",
    validate: validateUsername,
    samples: [
      { value: "maya_42", kind: "valid" },
      { value: "ab", kind: "invalid" },
      { value: "bad name!", kind: "invalid" },
      { value: "this_name_is_way_too_long", kind: "invalid" },
    ],
  },
  {
    id: "age",
    label: "Age",
    hint: "A whole number from 13 to 120.",
    inputMode: "numeric",
    validate: validateAge,
    samples: [
      { value: "19", kind: "valid" },
      { value: "7", kind: "invalid" },
      { value: "-5", kind: "invalid" },
      { value: "abc", kind: "invalid" },
    ],
  },
  {
    id: "email",
    label: "Email",
    hint: "Something like name@example.com.",
    inputMode: "email",
    validate: validateEmail,
    samples: [
      { value: "maya@example.com", kind: "valid" },
      { value: "maya@", kind: "invalid" },
      { value: "no-at-sign.com", kind: "invalid" },
    ],
  },
];

const emptyValues = { username: "", age: "", email: "" };

const quizQuestion =
  "Your sign-up form already checks the username in the browser. Why should the server check it again?";

const quizCorrectId = "skipped";

const quizOptions = [
  {
    id: "skipped",
    text: "Because anyone can send data to the server without using your form, so browser checks can be skipped.",
  },
  {
    id: "browsers",
    text: "Because browsers are not able to check text at all.",
  },
  {
    id: "faster",
    text: "Because checking twice always makes the page load faster.",
  },
];

// The whole practice experience. It lives inside the lab modal.
function InputValidationPractice({ onBackToPreview, onStatus, onComplete }) {
  const [step, setStep] = useState(0);

  // Step 2 (Try it) state
  const [values, setValues] = useState(emptyValues);
  const [touched, setTouched] = useState({});
  const [checkedInvalid, setCheckedInvalid] = useState(false);
  const [checkedValid, setCheckedValid] = useState(false);
  const [formMessage, setFormMessage] = useState(null);

  // Step 3 (Quiz) state
  const [answer, setAnswer] = useState("");
  const [quizResult, setQuizResult] = useState(""); // "", "correct", or "wrong"

  // Each step has a heading. We move keyboard focus there when the step changes.
  const headingRef = useRef(null);

  useEffect(() => {
    if (headingRef.current) headingRef.current.focus();
  }, [step]);

  // Check every field every time the component draws.
  const results = {};
  practiceFields.forEach((field) => {
    results[field.id] = field.validate(values[field.id]);
  });

  function handleChange(fieldId, newValue) {
    setValues((previous) => ({ ...previous, [fieldId]: newValue }));
    setTouched((previous) => ({ ...previous, [fieldId]: true }));
    setFormMessage(null);
  }

  function handleSubmit(event) {
    event.preventDefault(); // stay on the page: there is no server in this exercise

    // After the first submit, show feedback for every field.
    const allTouched = {};
    practiceFields.forEach((field) => {
      allTouched[field.id] = true;
    });
    setTouched(allTouched);

    const invalidCount = practiceFields.filter(
      (field) => !results[field.id].valid
    ).length;

    if (invalidCount > 0) {
      setCheckedInvalid(true);
      setFormMessage({
        type: "invalid",
        text:
          invalidCount === 1
            ? "1 field needs fixing. Read the message under it, then try again."
            : `${invalidCount} fields need fixing. Read the message under each one, then try again.`,
      });
    } else {
      setCheckedValid(true);
      setFormMessage({
        type: "valid",
        text: "Every field passed. In a real app, the server would check these values again before saving anything.",
      });
    }
  }

  function handleClearForm() {
    setValues(emptyValues);
    setTouched({});
    setFormMessage(null);
  }

  function handleSelectAnswer(optionId) {
    setAnswer(optionId);
    setQuizResult("");
  }

  function handleCheckAnswer() {
    setQuizResult(answer === quizCorrectId ? "correct" : "wrong");
  }

  function handleFinish() {
    setStep(3);
    onComplete("input-validation");
    onStatus("Completed the Input validation practice. Nice work!");
  }

  function handleRestart() {
    setValues(emptyValues);
    setTouched({});
    setCheckedInvalid(false);
    setCheckedValid(false);
    setFormMessage(null);
    setAnswer("");
    setQuizResult("");
    setStep(0);
    onStatus("Practice restarted. Begin again from step 1.");
  }

  const goalsDone = checkedInvalid && checkedValid;

  return (
    <div className="practice">
      <ol className="practice-steps" aria-label="Practice progress">
        {practiceStepTitles.map((title, index) => {
          let stateClass = "";
          if (index === step) stateClass = " is-current";
          else if (index < step) stateClass = " is-done";

          return (
            <li
              key={title}
              className={`practice-step${stateClass}`}
              aria-current={index === step ? "step" : undefined}
            >
              <span className="practice-step-number" aria-hidden="true">
                {index + 1}
              </span>
              <span className="practice-step-label">{title}</span>
            </li>
          );
        })}
      </ol>

      {/* Step 1: explain the idea */}
      {step === 0 && (
        <>
          <h3 className="practice-heading" tabIndex={-1} ref={headingRef}>
            Why inputs are untrusted
          </h3>
          <p className="practice-text">
            Anything a person types into a form is input. Your app cannot
            control what arrives. People make typos, copy and paste odd text,
            and sometimes data is sent on purpose to cause trouble. That is why
            we treat all input as untrusted until it has been checked.
          </p>
          <ul className="practice-list">
            <li>Check the type: is it a number when it should be a number?</li>
            <li>Check the length: not empty, and not unreasonably long.</li>
            <li>Check the format: does it look like an email address?</li>
            <li>
              Prefer allow-lists: describe exactly what is allowed and reject
              everything else.
            </li>
          </ul>
          <p className="practice-note">
            Everything here runs in your browser on a fictional sign-up form.
            Nothing is sent anywhere.
          </p>
          <div className="practice-actions">
            <button
              type="button"
              className="button button-primary"
              onClick={() => setStep(1)}
            >
              Continue
            </button>
          </div>
        </>
      )}

      {/* Step 2: try the form */}
      {step === 1 && (
        <>
          <h3 className="practice-heading" tabIndex={-1} ref={headingRef}>
            Try the Lab Club sign-up form
          </h3>
          <p className="practice-text">
            Type your own values or tap a sample. The checks run as you type.
            Press &ldquo;Check form&rdquo; to submit.
          </p>

          <ul className="practice-checklist" aria-label="Goals">
            <li className={`practice-check${checkedInvalid ? " is-done" : ""}`}>
              <span className="check-mark" aria-hidden="true">
                {checkedInvalid ? "✓" : "○"}
              </span>
              <span>
                Submit the form with a bad value and read the feedback.
                <span className="visually-hidden">
                  {checkedInvalid ? " Done." : " Not done yet."}
                </span>
              </span>
            </li>
            <li className={`practice-check${checkedValid ? " is-done" : ""}`}>
              <span className="check-mark" aria-hidden="true">
                {checkedValid ? "✓" : "○"}
              </span>
              <span>
                Fix every field and submit a form that passes all checks.
                <span className="visually-hidden">
                  {checkedValid ? " Done." : " Not done yet."}
                </span>
              </span>
            </li>
          </ul>

          <form
            className="practice-form"
            onSubmit={handleSubmit}
            noValidate
            aria-label="Fictional Lab Club sign-up form"
          >
            {practiceFields.map((field) => {
              const result = results[field.id];
              const showFeedback = Boolean(touched[field.id]);
              let stateClass = "";
              if (showFeedback) {
                stateClass = result.valid ? " is-valid" : " is-invalid";
              }

              const inputId = `practice-${field.id}`;

              return (
                <div key={field.id} className="practice-field">
                  <label className="field-label" htmlFor={inputId}>
                    {field.label}
                  </label>
                  <p className="field-hint" id={`${inputId}-hint`}>
                    {field.hint}
                  </p>
                  <input
                    id={inputId}
                    className={`field-input${stateClass}`}
                    type="text"
                    inputMode={field.inputMode}
                    autoComplete="off"
                    spellCheck="false"
                    value={values[field.id]}
                    onChange={(event) =>
                      handleChange(field.id, event.target.value)
                    }
                    aria-describedby={`${inputId}-hint ${inputId}-feedback`}
                    aria-invalid={showFeedback && !result.valid ? "true" : "false"}
                  />
                  <p
                    id={`${inputId}-feedback`}
                    className={`field-feedback${stateClass}`}
                    aria-live="polite"
                  >
                    {showFeedback
                      ? (result.valid ? "Valid: " : "Invalid: ") + result.message
                      : ""}
                  </p>

                  <div
                    className="sample-list"
                    role="group"
                    aria-label={`Sample values for ${field.label}`}
                  >
                    <span className="sample-label">Try a sample:</span>
                    {field.samples.map((sample) => (
                      <button
                        key={sample.value}
                        type="button"
                        className={`sample-chip sample-chip-${sample.kind}`}
                        onClick={() => handleChange(field.id, sample.value)}
                      >
                        <span className="sample-kind">
                          {sample.kind === "valid" ? "Valid" : "Invalid"}
                        </span>
                        <span className="sample-value">{sample.value}</span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}

            <p
              className={`practice-result${
                formMessage
                  ? formMessage.type === "valid"
                    ? " is-valid"
                    : " is-invalid"
                  : ""
              }`}
              role="status"
            >
              {formMessage ? formMessage.text : ""}
            </p>

            <div className="practice-actions">
              <button
                type="button"
                className="button button-ghost"
                onClick={handleClearForm}
              >
                Clear form
              </button>
              <button type="submit" className="button button-secondary">
                Check form
              </button>
            </div>
          </form>

          {!goalsDone && (
            <p className="practice-note">
              Complete both goals to continue.
            </p>
          )}

          <div className="practice-actions">
            <button
              type="button"
              className="button button-ghost"
              onClick={() => setStep(0)}
            >
              Back
            </button>
            <button
              type="button"
              className="button button-primary"
              disabled={!goalsDone}
              onClick={() => setStep(2)}
            >
              Continue
            </button>
          </div>
        </>
      )}

      {/* Step 3: knowledge question */}
      {step === 2 && (
        <>
          <h3 className="practice-heading" tabIndex={-1} ref={headingRef}>
            Knowledge check
          </h3>

          <fieldset className="quiz">
            <legend className="quiz-legend">{quizQuestion}</legend>
            <div className="quiz-options">
              {quizOptions.map((option) => (
                <label
                  key={option.id}
                  className={`quiz-option${
                    answer === option.id ? " is-selected" : ""
                  }`}
                >
                  <input
                    type="radio"
                    name="validation-quiz"
                    className="quiz-input"
                    value={option.id}
                    checked={answer === option.id}
                    onChange={() => handleSelectAnswer(option.id)}
                  />
                  <span>{option.text}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <p
            className={`quiz-feedback${
              quizResult === "correct"
                ? " is-valid"
                : quizResult === "wrong"
                ? " is-invalid"
                : ""
            }`}
            role="status"
          >
            {quizResult === "correct" &&
              "Correct. Treat every request as untrusted: browser checks help users, but the server must check again."}
            {quizResult === "wrong" &&
              "Not quite. Think about who or what can send data to a server besides your own form."}
          </p>

          <div className="practice-actions">
            <button
              type="button"
              className="button button-ghost"
              onClick={() => setStep(1)}
            >
              Back
            </button>
            <button
              type="button"
              className="button button-secondary"
              disabled={answer === "" || quizResult === "correct"}
              onClick={handleCheckAnswer}
            >
              Check answer
            </button>
            <button
              type="button"
              className="button button-primary"
              disabled={quizResult !== "correct"}
              onClick={handleFinish}
            >
              Finish
            </button>
          </div>
        </>
      )}

      {/* Step 4: completion */}
      {step === 3 && (
        <>
          <h3 className="practice-heading" tabIndex={-1} ref={headingRef}>
            Practice complete
          </h3>
          <p className="practice-text">
            Nice work! You tried valid and invalid values on a fictional form
            and answered the knowledge check correctly.
          </p>
          <ul className="practice-summary">
            <li>Treat everything a user sends as untrusted.</li>
            <li>Check type, length, and format, and prefer allow-lists.</li>
            <li>
              Browser checks help users, but the server must check again.
            </li>
          </ul>
          <div className="practice-actions">
            <button
              type="button"
              className="button button-secondary"
              onClick={handleRestart}
            >
              Restart practice
            </button>
            <button
              type="button"
              className="button button-primary"
              onClick={onBackToPreview}
            >
              Back to lab preview
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ---------- Component ----------
function App() {
  const [studentAuthStatus, setStudentAuthStatus] = useState("checking");
  const [currentStudent, setCurrentStudent] = useState(null);
  const [currentFaculty, setCurrentFaculty] = useState(null);
  const [currentAdmin, setCurrentAdmin] = useState(null);
  const [accessMode, setAccessMode] = useState("student");
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [readNotificationIds, setReadNotificationIds] = useState([]);
  const [completedLabSlugs, setCompletedLabSlugs] = useState([]);
  const [progressSyncStatus, setProgressSyncStatus] = useState("syncing");

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${STUDENT_AUTH_URL}/me`, {
      credentials: "include",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (response.ok) {
          const data = await response.json();
          setCurrentStudent(data.student);
          setCompletedLabSlugs(loadCompletedLabSlugs(data.student.usn));
          setProgressSyncStatus("syncing");
          setReadNotificationIds(loadReadNotificationIds(data.student.usn));
          setAccessMode("student");
          setStudentAuthStatus("signed-in");
          return;
        }
        const facultyResponse = await fetch(`${FACULTY_AUTH_URL}/me`, {
          credentials: "include",
          signal: controller.signal,
        });
        if (facultyResponse.ok) {
          const data = await facultyResponse.json();
          setCurrentFaculty(data.faculty);
          setCompletedLabSlugs([]);
          setProgressSyncStatus("local");
          setReadNotificationIds(loadReadNotificationIds(data.faculty.facultyId));
          setAccessMode("faculty");
          setStudentAuthStatus("signed-in");
          return;
        }
        const adminResponse = await fetch(`${ADMIN_AUTH_URL}/me`, {
          credentials: "include",
          signal: controller.signal,
        });
        if (!adminResponse.ok) throw new Error("No active session.");
        const data = await adminResponse.json();
        setCurrentAdmin(data.admin);
        setCompletedLabSlugs([]);
        setProgressSyncStatus("local");
        setReadNotificationIds([]);
        setAccessMode("admin");
        setStudentAuthStatus("signed-in");
      })
      .catch((error) => {
        if (error.name === "AbortError") return;
        setCurrentStudent(null);
        setCurrentFaculty(null);
        setCurrentAdmin(null);
        setCompletedLabSlugs([]);
        setProgressSyncStatus("local");
        setReadNotificationIds([]);
        setStudentAuthStatus("signed-out");
      });
    return () => controller.abort();
  }, []);

  // One small piece of state: the message shown near the top of the page.
  const [statusMessage, setStatusMessage] = useState(
    "Pick a role, resume a course, or preview a lab to get started."
  );

  // Labs loaded from the backend.
  // labsStatus is one of: "loading", "success", or "error".
  const [labs, setLabs] = useState([]);
  const [labsStatus, setLabsStatus] = useState("loading");
  const [labsReloadCount, setLabsReloadCount] = useState(0);

  const [isClassSetupOpen, setIsClassSetupOpen] = useState(false);
  const [isJoinClassOpen, setIsJoinClassOpen] = useState(false);
  const [className, setClassName] = useState("");
  const [selectedSetupLabSlugs, setSelectedSetupLabSlugs] = useState([]);
  const [classSetupError, setClassSetupError] = useState("");
  const [createdClassPreview, setCreatedClassPreview] = useState(null);
  const [isCreatingClass, setIsCreatingClass] = useState(false);
  const [joinCodeInput, setJoinCodeInput] = useState("");
  const [classJoinError, setClassJoinError] = useState("");
  const [isJoiningClass, setIsJoiningClass] = useState(false);
  const [joinedClass, setJoinedClass] = useState(null);

  useEffect(() => {
    if (!currentStudent) return;
    try {
      window.localStorage.setItem(
        progressStorageKey(currentStudent.usn),
        JSON.stringify(completedLabSlugs)
      );
    } catch {
      // Progress still works for this visit if browser storage is unavailable.
    }
  }, [completedLabSlugs, currentStudent]);

  const notificationOwner = accessMode === "faculty"
    ? currentFaculty?.facultyId
    : currentStudent?.usn;
  // Sync saved progress with the API. The browser copy is a fallback and also
  // lets older local completions be uploaded the first time this is connected.
  useEffect(() => {
    if (!currentStudent) return undefined;
    const controller = new AbortController();

    async function syncProgress() {
      setProgressSyncStatus("syncing");

      try {
        const response = await fetch(PROGRESS_API_URL, {
          credentials: "include",
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Progress load failed with status ${response.status}`);
        }

        const data = await response.json();
        const serverSlugs = Array.isArray(data.completedLabs)
          ? data.completedLabs
              .map((lab) => lab.slug)
              .filter((slug) => typeof slug === "string")
          : [];
        const localSlugs = loadCompletedLabSlugs(currentStudent.usn);
        const mergedSlugs = [...new Set([...serverSlugs, ...localSlugs])];

        setCompletedLabSlugs(mergedSlugs);

        const slugsToUpload = localSlugs.filter(
          (slug) => !serverSlugs.includes(slug)
        );
        await Promise.all(
          slugsToUpload.map((slug) =>
            saveLabProgress(slug, controller.signal)
          )
        );

        setProgressSyncStatus("synced");
      } catch (error) {
        if (error.name === "AbortError") return;
        setProgressSyncStatus("local");
      }
    }

    syncProgress();
    return () => controller.abort();
  }, [currentStudent]);

  // The lab currently shown in the preview modal (null = modal is closed).
  const [selectedLab, setSelectedLab] = useState(null);
  const isModalOpen = selectedLab !== null;

  // True while the modal is showing the interactive practice instead of the preview.
  const [isPracticing, setIsPracticing] = useState(false);

  // Only the Input validation lab has a practice exercise for now.
  const canPractice = isModalOpen && selectedLab.slug === "input-validation";

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

  async function signOutStudent() {
    try {
      const authUrl = accessMode === "admin"
        ? ADMIN_AUTH_URL
        : accessMode === "faculty" ? FACULTY_AUTH_URL : STUDENT_AUTH_URL;
      await fetch(`${authUrl}/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch {
      handleAction("Could not reach the server to end your session.");
    } finally {
      setCurrentStudent(null);
      setCurrentFaculty(null);
      setCurrentAdmin(null);
      setCompletedLabSlugs([]);
      setProgressSyncStatus("local");
      setReadNotificationIds([]);
      setStudentAuthStatus("signed-out");
    }
  }

  function markLabComplete(slug) {
    setCompletedLabSlugs((current) =>
      current.includes(slug) ? current : [...current, slug]
    );

    setProgressSyncStatus("syncing");
    saveLabProgress(slug)
      .then(() => setProgressSyncStatus("synced"))
      .catch(() => setProgressSyncStatus("local"));
  }

  function openClassSetup() {
    setIsJoinClassOpen(false);
    setIsClassSetupOpen(true);
    setCreatedClassPreview(null);
    setClassSetupError("");
    handleAction("Set up a demo class by choosing a name and labs.");
  }

  function closeClassSetup() {
    setIsClassSetupOpen(false);
    setClassSetupError("");
  }

  function toggleSetupLab(slug) {
    setSelectedSetupLabSlugs((current) =>
      current.includes(slug)
        ? current.filter((item) => item !== slug)
        : [...current, slug]
    );
  }

  async function handleCreateClass(event) {
    event.preventDefault();
    const trimmedName = className.trim();

    if (!trimmedName) {
      setClassSetupError("Enter a class name to continue.");
      return;
    }

    if (selectedSetupLabSlugs.length === 0) {
      setClassSetupError("Choose at least one lab for this class.");
      return;
    }

    setClassSetupError("");
    setIsCreatingClass(true);

    try {
      const response = await fetch(CLASSROOMS_API_URL, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          labSlugs: selectedSetupLabSlugs,
        }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || "Could not save this class.");
      }

      const classroom = data.classroom;
      setCreatedClassPreview({
        id: classroom.id,
        name: classroom.name,
        joinCode: classroom.joinCode,
        labSlugs: classroom.labs.map((lab) => lab.slug),
      });
      handleAction(`Class "${classroom.name}" saved to the database.`);
    } catch (error) {
      setClassSetupError(
        error instanceof TypeError
          ? "Could not reach the backend. Make sure the backend server is running."
          : error.message
      );
    } finally {
      setIsCreatingClass(false);
    }
  }

  function startPracticing() {
    handleAction("Choose a lab below to start practicing.");
    document.getElementById("labs-heading")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  async function handleJoinClass(event) {
    event.preventDefault();
    const joinCode = joinCodeInput.replace(/\s/g, "").toUpperCase();

    if (!/^(?:[A-F0-9]{8}|[A-F0-9]{12})$/.test(joinCode)) {
      setClassJoinError("Enter a valid class code (8 or 12 characters).");
      return;
    }

    setClassJoinError("");
    setIsJoiningClass(true);
    try {
      const response = await fetch(
        `${CLASSROOMS_API_URL}/${encodeURIComponent(joinCode)}`
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Could not find that class.");

      setJoinedClass(data.classroom);
      handleAction(`Joined the "${data.classroom.name}" class preview.`);
    } catch (error) {
      setClassJoinError(
        error instanceof TypeError
          ? "Could not reach the backend. Make sure the backend server is running."
          : error.message
      );
    } finally {
      setIsJoiningClass(false);
    }
  }

  function openAssignedLab(slug, event) {
    const lab = labs.find((item) => item.slug === slug);
    if (lab) openLabPreview(lab, event);
  }

  function openLabPreview(lab, event) {
    // Remember which button opened the modal so focus can return to it.
    lastFocusedRef.current = event.currentTarget;
    setIsPracticing(false);
    setSelectedLab(lab);
    handleAction(`Previewing the "${lab.title}" lab.`);
  }

  function resumeCourse(item, event) {
    const lab = labs.find((candidate) => candidate.slug === item.labSlug);
    if (!lab) {
      handleAction(`The lab for "${item.title}" is not available right now.`);
      return;
    }

    lastFocusedRef.current = event.currentTarget;
    setSelectedLab(lab);
    setIsPracticing(true);
    handleAction(`Resuming "${item.title}" in the ${lab.title} lab.`);
  }

  function closeLabPreview() {
    setSelectedLab(null);
    setIsPracticing(false);
  }

  function startPractice() {
    setIsPracticing(true);
    handleAction(`Practicing the "${selectedLab.title}" lab.`);
  }

  function backToPreview() {
    setIsPracticing(false);
    handleAction(`Previewing the "${selectedLab.title}" lab.`);
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
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    // Listen for mouse pointers even on hybrid touch laptops. Pointer type is
    // checked in the handler, so touch input still does not create a trail.
    if (reduceMotion.matches) return;

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
        // Match the cursor trail to the safety card's red warning theme.
        glow.classList.toggle(
          "is-safety",
          Boolean(event.target.closest(".safety-note"))
        );
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
  }, [studentAuthStatus]);

  // Modal behavior: runs while the modal is open.
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
        setIsPracticing(false);
        return;
      }

      // Keep Tab and Shift+Tab cycling through the modal's own controls.
      if (event.key !== "Tab" || !dialog) return;

      const focusable = dialog.querySelectorAll(
        "button:not([disabled]), input:not([disabled])"
      );
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

  // When the modal goes back to the preview view, focus the X button again.
  // (While practicing, the practice steps move focus to their own headings.)
  useEffect(() => {
    if (isModalOpen && !isPracticing && closeButtonRef.current) {
      closeButtonRef.current.focus();
    }
  }, [isModalOpen, isPracticing]);

  const notifications = [
    ...(labsStatus === "success" && labs.length > 0
      ? [{ id: "labs-ready", title: "Practice labs are ready", detail: `${labs.length} published labs are available in your workspace.` }]
      : []),
    ...(currentStudent && completedLabSlugs.length > 0
      ? [{ id: "progress-saved", title: "Your progress is saved", detail: `${completedLabSlugs.length} completed lab${completedLabSlugs.length === 1 ? "" : "s"} recorded for your account.` }]
      : []),
    ...(joinedClass
      ? [{ id: `joined-${joinedClass.name}`, title: `Joined ${joinedClass.name}`, detail: `${joinedClass.labs.length} assigned lab${joinedClass.labs.length === 1 ? "" : "s"} are ready to open.` }]
      : []),
    ...(createdClassPreview
      ? [{ id: `created-${createdClassPreview.id}`, title: `Class created: ${createdClassPreview.name}`, detail: `Share join code ${createdClassPreview.joinCode} with your learners.` }]
      : []),
  ];
  const unreadNotifications = notifications.filter((item) => !readNotificationIds.includes(item.id));
  const completedAvailableLabs = labs.filter((lab) => completedLabSlugs.includes(lab.slug)).length;
  const studentProgressPercent = labs.length > 0
    ? Math.round((completedAvailableLabs / labs.length) * 100)
    : 0;

  function markNotificationsRead() {
    const nextReadIds = [...new Set([...readNotificationIds, ...notifications.map((item) => item.id)])];
    setReadNotificationIds(nextReadIds);
    try {
      if (notificationOwner) {
        window.localStorage.setItem(`cpl.notifications.read.${notificationOwner}`, JSON.stringify(nextReadIds));
      }
    } catch {
      // The notifications remain usable for this visit if storage is unavailable.
    }
  }

  if (studentAuthStatus === "checking") {
    return (
      <main className="student-access-shell" role="status" aria-live="polite">
        <p className="student-access-intro">Checking your student session…</p>
      </main>
    );
  }

  if (studentAuthStatus === "signed-out") {
    return (
      <AccessPortal
        onStudentAuthenticated={(student) => {
          setCurrentFaculty(null);
          setCurrentAdmin(null);
          setCurrentStudent(student);
          setCompletedLabSlugs(loadCompletedLabSlugs(student.usn));
          setProgressSyncStatus("syncing");
          setReadNotificationIds(loadReadNotificationIds(student.usn));
          setAccessMode("student");
          setStudentAuthStatus("signed-in");
        }}
        onFacultyAuthenticated={(faculty) => {
          setCurrentStudent(null);
          setCurrentAdmin(null);
          setCurrentFaculty(faculty);
          setCompletedLabSlugs([]);
          setProgressSyncStatus("local");
          setReadNotificationIds(loadReadNotificationIds(faculty.facultyId));
          setAccessMode("faculty");
          setStudentAuthStatus("signed-in");
        }}
        onAdminAuthenticated={(admin) => {
          setCurrentStudent(null);
          setCurrentFaculty(null);
          setCurrentAdmin(admin);
          setCompletedLabSlugs([]);
          setProgressSyncStatus("local");
          setReadNotificationIds([]);
          setAccessMode("admin");
          setStudentAuthStatus("signed-in");
        }}
      />
    );
  }

  return (
    <div className="app">
      <MatrixElectricField />
      {/* Decorative glow that follows the mouse (hidden from screen readers) */}
      <div className="cursor-glow" ref={cursorGlowRef} aria-hidden="true"></div>

      <header className="site-header">
        <div className="container header-inner">
          <div className="brand">
            <span className="brand-mark" aria-hidden="true"></span>
            <span className="brand-name">Cyber Practice Lab</span>
          </div>
          <div className="header-actions">
            <span className="pill">
              {accessMode === "admin" ? currentAdmin?.label : accessMode === "faculty" ? currentFaculty?.facultyId : currentStudent?.usn}
            </span>
            <button
              type="button"
              className="button button-ghost"
              onClick={signOutStudent}
            >
              Sign out
            </button>
            <div className="notifications-anchor">
              <button
                type="button"
                className="button button-ghost"
                aria-expanded={isNotificationsOpen}
                aria-controls="notifications-panel"
                onClick={() => setIsNotificationsOpen((open) => !open)}
              >
                Notifications{unreadNotifications.length > 0 ? ` (${unreadNotifications.length})` : ""}
              </button>
              {isNotificationsOpen && (
                <section id="notifications-panel" className="notifications-panel" aria-label="Notifications">
                  <div className="notifications-heading">
                    <div>
                      <p className="modal-eyebrow">Your updates</p>
                      <h2 className="role-title">Notifications</h2>
                    </div>
                    <button type="button" className="button button-ghost notifications-close" onClick={() => setIsNotificationsOpen(false)}>
                      Close
                    </button>
                  </div>
                  {unreadNotifications.length > 0 && (
                    <button type="button" className="button button-secondary notifications-mark-read" onClick={markNotificationsRead}>
                      Mark all as read
                    </button>
                  )}
                  {notifications.length === 0 ? (
                    <p className="notification-empty">You’re all caught up. Updates will appear here as you use your workspace.</p>
                  ) : (
                    <ul className="notification-list">
                      {notifications.map((item) => (
                        <li key={item.id} className={`notification-item${readNotificationIds.includes(item.id) ? " is-read" : ""}`}>
                          <span className="notification-dot" aria-hidden="true" />
                          <div><strong>{item.title}</strong><p>{item.detail}</p></div>
                          {!readNotificationIds.includes(item.id) && <span className="notification-new">New</span>}
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              )}
            </div>
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
                <strong className="stat-value">
                  {stat.id === "completed"
                    ? completedLabSlugs.length
                    : stat.value}
                </strong>
                  <span className="stat-note">
                    {stat.id === "completed"
                      ? progressSyncStatus === "synced"
                        ? "Synced to database"
                        : progressSyncStatus === "syncing"
                          ? "Syncing progress…"
                          : "Saved on this device"
                      : stat.note}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        {/* Role cards */}
        <section className="section" aria-labelledby="roles-heading">
          <h2 id="roles-heading" className="section-title">
            {accessMode === "faculty" ? "Faculty workspace" : "How would you like to start?"}
          </h2>
          <div className="role-grid">
            {(accessMode === "faculty" ? [{
              id: "teach",
              tag: "Faculty workspace",
              title: "Teach a class",
              description: "Create a class, assign practice labs, and share its join code with learners.",
              buttonLabel: "Set up a class",
              buttonClass: "button-primary",
            }] : roles).map((role) => (
              <article
                key={role.id}
                className={`panel role-card role-card-${role.id}`}
              >
                <div className="role-card-copy">
                  <p className="role-tag">{role.tag}</p>
                  <h3 className="role-title">{role.title}</h3>
                  <p className="card-text">{role.description}</p>
                </div>
                <div className="role-card-actions">
                  <button
                    type="button"
                    className={`button ${role.buttonClass}`}
                    onClick={role.id === "teach" ? openClassSetup : startPracticing}
                  >
                    {role.buttonLabel}
                  </button>
                  {role.id === "practice" && (
                    <button
                      type="button"
                      className="button button-secondary"
                      onClick={() => {
                        setIsClassSetupOpen(false);
                        setIsJoinClassOpen(true);
                        setClassJoinError("");
                        setJoinedClass(null);
                      }}
                    >
                      Join a class
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>

          {isJoinClassOpen && (
            <section className="panel class-setup-panel" aria-labelledby="join-class-heading">
              <div className="class-setup-header">
                <div>
                  <p className="modal-eyebrow">Learner workspace</p>
                  <h3 id="join-class-heading" className="role-title">Join a class</h3>
                </div>
                <button
                  type="button"
                  className="button button-ghost"
                  onClick={() => setIsJoinClassOpen(false)}
                >
                  Close
                </button>
              </div>

              {joinedClass ? (
                <div className="class-preview" role="status">
                  <h4 className="card-title">You’re in {joinedClass.name}</h4>
                  <p className="practice-text">Labs assigned by your teacher:</p>
                  <ul className="timeline">
                    {joinedClass.labs.map((lab) => (
                      <li key={lab.slug} className="timeline-item">
                        <span className="timeline-title">{lab.title}</span>
                        <span className="timeline-meta">
                          {capitalize(lab.difficulty.toLowerCase())} · {lab.estimatedMinutes} min
                        </span>
                        <button
                          type="button"
                          className="button button-secondary"
                          onClick={(event) => openAssignedLab(lab.slug, event)}
                        >
                          Open lab
                        </button>
                      </li>
                    ))}
                  </ul>
                  {joinedClass.labs.length === 0 && (
                    <p className="field-hint">This class has no published labs available right now.</p>
                  )}
                  <p className="class-setup-note">
                    This demo does not create student accounts or record who joined.
                  </p>
                </div>
              ) : (
                <form className="practice-form" onSubmit={handleJoinClass}>
                  <div className="practice-field">
                    <label className="field-label" htmlFor="class-join-code">Class code</label>
                    <p className="field-hint" id="class-join-code-hint">
                      New class codes are 12 characters; older 8-character codes still work.
                    </p>
                    <input
                      id="class-join-code"
                      className="field-input"
                      type="text"
                      value={joinCodeInput}
                      onChange={(event) => setJoinCodeInput(event.target.value.toUpperCase())}
                      maxLength={12}
                      autoComplete="off"
                      aria-describedby="class-join-code-hint"
                      required
                    />
                  </div>
                  {classJoinError && (
                    <p className="quiz-feedback is-invalid" role="alert">{classJoinError}</p>
                  )}
                  <p className="class-setup-note">
                    The code only shows the class name and its published labs. Do not use it as a password.
                  </p>
                  <div className="practice-actions">
                    <button type="submit" className="button button-primary" disabled={isJoiningClass}>
                      {isJoiningClass ? "Looking up class…" : "View assigned labs"}
                    </button>
                  </div>
                </form>
              )}
            </section>
          )}

          {isClassSetupOpen && (
            <section
              className="panel class-setup-panel"
              aria-labelledby="class-setup-heading"
            >
              <div className="class-setup-header">
                <div>
                  <p className="modal-eyebrow">Instructor workspace</p>
                  <h3 id="class-setup-heading" className="role-title">
                    Set up a class
                  </h3>
                </div>
                <button
                  type="button"
                  className="button button-ghost"
                  onClick={closeClassSetup}
                >
                  Close
                </button>
              </div>

              {createdClassPreview ? (
                <div className="class-preview" role="status">
                  <h4 className="card-title">Class saved</h4>
                  <p className="practice-text">
                    <strong>{createdClassPreview.name}</strong> includes{" "}
                    {createdClassPreview.labSlugs.length} lab
                    {createdClassPreview.labSlugs.length === 1 ? "" : "s"}.
                  </p>
                  <p className="class-join-code">
                    Class join code: <code>{createdClassPreview.joinCode}</code>
                  </p>
                  <p className="class-setup-note">
                    Saved in the database under your faculty account. Share the join code with your learners.
                  </p>
                  <div className="practice-actions">
                    <button
                      type="button"
                      className="button button-secondary"
                      onClick={() => setCreatedClassPreview(null)}
                    >
                      Edit setup
                    </button>
                  </div>
                </div>
              ) : (
                <form className="practice-form" onSubmit={handleCreateClass}>
                  <div className="practice-field">
                    <label className="field-label" htmlFor="class-name">
                      Class name
                    </label>
                    <p className="field-hint" id="class-name-hint">
                      For example, “Intro to Web Security — Section A”.
                    </p>
                    <input
                      id="class-name"
                      className="field-input"
                      type="text"
                      maxLength={80}
                      value={className}
                      onChange={(event) => setClassName(event.target.value)}
                      aria-describedby="class-name-hint"
                      required
                    />
                  </div>

                  <fieldset className="class-lab-fieldset">
                    <legend className="quiz-legend">Choose labs</legend>
                    {labsStatus === "loading" && (
                      <p className="field-hint">Loading available labs…</p>
                    )}
                    {labsStatus === "error" && (
                      <p className="field-hint" role="alert">
                        Labs could not be loaded. Start the backend and try
                        again.
                      </p>
                    )}
                    {labsStatus === "success" && labs.length === 0 && (
                      <p className="field-hint">No published labs are available.</p>
                    )}
                    {labs.length > 0 && (
                      <div className="quiz-options">
                        {labs.map((lab) => (
                          <label
                            key={lab.slug}
                            className={`quiz-option class-lab-option${
                              selectedSetupLabSlugs.includes(lab.slug)
                                ? " is-selected"
                                : ""
                            }`}
                          >
                            <input
                              className="quiz-input"
                              type="checkbox"
                              checked={selectedSetupLabSlugs.includes(lab.slug)}
                              onChange={() => toggleSetupLab(lab.slug)}
                            />
                            <span>
                              <strong>{lab.title}</strong>
                              <span className="field-hint">
                                {lab.difficulty} · {lab.time}
                              </span>
                            </span>
                          </label>
                        ))}
                      </div>
                    )}
                  </fieldset>

                  {classSetupError && (
                    <p className="quiz-feedback is-invalid" role="alert">
                      {classSetupError}
                    </p>
                  )}

                  <p className="class-setup-note">
                    This demo stores the class name and selected labs. Do not
                    enter teacher or student personal information.
                  </p>

                  <div className="practice-actions">
                    <button
                      type="button"
                      className="button button-ghost"
                      onClick={closeClassSetup}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="button button-primary"
                      disabled={
                        labsStatus !== "success" ||
                        labs.length === 0 ||
                        isCreatingClass
                      }
                    >
                      {isCreatingClass ? "Saving class…" : "Save class"}
                    </button>
                  </div>
                </form>
              )}
            </section>
          )}
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
                      onClick={(event) => resumeCourse(item, event)}
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
                    Check that the service is available, then try again.
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

              {accessMode === "student" && (
                <section className="student-progress-summary" aria-labelledby="student-progress-heading">
                  <div className="student-progress-heading-row">
                    <h3 id="student-progress-heading" className="side-subtitle">Your lab progress</h3>
                    <strong>{studentProgressPercent}%</strong>
                  </div>
                  <div
                    className="progress student-progress-track"
                    role="progressbar"
                    aria-label="Student lab completion"
                    aria-valuemin="0"
                    aria-valuemax="100"
                    aria-valuenow={studentProgressPercent}
                  >
                    <span className="progress-fill" style={{ width: `${studentProgressPercent}%` }} />
                  </div>
                  <p className="progress-text">
                    {labsStatus === "loading"
                      ? "Loading your available labs…"
                      : labs.length === 0
                        ? "No published labs are available yet."
                        : `${completedAvailableLabs} of ${labs.length} available labs completed`}
                  </p>
                </section>
              )}
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
            Cyber Practice Lab
          </p>
        </div>
      </footer>

      {/* Lab modal: preview view, or the interactive practice view */}
      {selectedLab && (
        <div
          className="modal-backdrop"
          onPointerDown={handleBackdropPointerDown}
          onClick={handleBackdropClick}
        >
          <div
            className={`modal${isPracticing ? " modal-wide" : ""}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="lab-modal-title"
            aria-describedby={isPracticing ? undefined : "lab-modal-description"}
            ref={dialogRef}
          >
            <div className="modal-header">
              <div>
                <p className="modal-eyebrow">
                  {isPracticing ? "Practice lab" : "Lab preview"}
                </p>
                <h2 id="lab-modal-title" className="modal-title">
                  {selectedLab.title}
                </h2>
              </div>
              <button
                type="button"
                className="modal-close"
                ref={closeButtonRef}
                aria-label={
                  isPracticing ? "Close practice" : "Close lab preview"
                }
                onClick={closeLabPreview}
              >
                <span aria-hidden="true">&times;</span>
              </button>
            </div>

            {isPracticing ? (
              <InputValidationPractice
                onBackToPreview={backToPreview}
                onStatus={handleAction}
                onComplete={markLabComplete}
              />
            ) : (
              <>
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
                  {canPractice
                    ? "Ready to try it? The practice runs in your browser on a fictional form."
                    : "This is a preview. Labs run in isolated, intentionally vulnerable practice environments."}
                </p>

                <div className="modal-actions">
                  <button
                    type="button"
                    className={`button ${
                      canPractice ? "button-ghost" : "button-primary"
                    }`}
                    onClick={closeLabPreview}
                  >
                    Close
                  </button>
                  {canPractice && (
                    <button
                      type="button"
                      className="button button-primary"
                      onClick={startPractice}
                    >
                      Start practice
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
