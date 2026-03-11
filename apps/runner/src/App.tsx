import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { challenges } from "./challenges";
import type { ChallengeTrainingHint, ChallengeWorkedExample, LoadedChallenge } from "./types";

type AppMode = "evaluation" | "training";

const storageKey = (
  challengeId: string,
  field:
    | "notes"
    | "response"
    | "reviewerAssessment"
    | "reviewerNotes"
    | "reviewerOutcome"
    | "reviewerChecklist"
    | "trainingHintsShown",
) =>
  `steerlab:${challengeId}:${field}`;

function formatLabel(value: string) {
  return value.replace(/-/g, " ");
}

function getTrainingPrompts(challenge: LoadedChallenge) {
  if (challenge.training_support?.reflection_prompts?.length) {
    return challenge.training_support.reflection_prompts;
  }

  const archetypePrompts: Record<string, string[]> = {
    "broken-system-investigation": [
      "What are the observed facts versus your current inferences?",
      "What failure modes best explain the supplied evidence, and what evidence pushes against them?",
      "What would you mitigate immediately before you try to redesign anything?",
    ],
    "architecture-thought-experiment": [
      "What constraints matter most here, and which are easiest to miss on a first pass?",
      "Which tradeoffs are structural versus simply implementation details?",
      "What would a safe first version look like, and what should be intentionally deferred?",
    ],
    "tool-steering-challenge": [
      "What parts of this task should AI accelerate, and what parts require direct human judgment?",
      "How will you constrain scope before asking a model for help?",
      "What will you verify before trusting generated output or generated reasoning?",
    ],
  };

  return archetypePrompts[challenge.archetype] ?? [
    "What is the core engineering judgment this challenge is trying to surface?",
    "What assumptions are you making, and how would you test them?",
    "What would a stronger response do that a shallow response would miss?",
  ];
}

function getTrainingChecklist(challenge: LoadedChallenge) {
  if (challenge.training_support?.thinking_checklist?.length) {
    return challenge.training_support.thinking_checklist;
  }

  return [
    `State the problem in your own words before solving it`,
    `Name the most important constraints explicitly`,
    `Use the supplied artifacts instead of relying on generic advice`,
    `Call out uncertainty or missing information honestly`,
    ...(challenge.archetype === "tool-steering-challenge"
      ? [`Explain how AI output would be validated before trust is granted`]
      : []),
    ...(challenge.archetype === "architecture-thought-experiment"
      ? [`Separate what is needed now from what should be deferred`]
      : []),
    ...(challenge.archetype === "broken-system-investigation"
      ? [`Distinguish immediate mitigation from durable prevention`]
      : []),
  ];
}

function getWorkedExampleLinks(challenge: LoadedChallenge) {
  if (challenge.training_support?.worked_examples?.length) {
    return challenge.training_support.worked_examples;
  }

  const byArchetype: Record<string, { label: string; href: string }[]> = {
    "broken-system-investigation": [
      { label: "Broken System example review", href: "/docs/example-review.md" },
    ],
    "architecture-thought-experiment": [
      { label: "Architecture example review", href: "/docs/example-review-architecture.md" },
    ],
    "tool-steering-challenge": [
      { label: "Tool Steering example review", href: "/docs/example-review-tool-steering.md" },
    ],
  };

  return byArchetype[challenge.archetype] ?? [];
}

function getTrainingHints(challenge: LoadedChallenge): ChallengeTrainingHint[] {
  if (challenge.training_support?.hints?.length) {
    return challenge.training_support.hints;
  }

  const byArchetype: Record<string, ChallengeTrainingHint[]> = {
    "broken-system-investigation": [
      {
        title: "Start with evidence",
        content:
          "List the observable facts in the artifacts before you decide what failure mode you believe happened.",
      },
      {
        title: "Find a causal chain",
        content:
          "Ask what concrete mechanism could connect the observed symptoms to the system behavior shown in the artifacts.",
      },
      {
        title: "Separate now from later",
        content:
          "A strong response usually distinguishes immediate mitigation from durable prevention.",
      },
    ],
    "architecture-thought-experiment": [
      {
        title: "Name the real constraints first",
        content:
          "Before proposing architecture, identify which constraints actually drive the design and which are secondary.",
      },
      {
        title: "Think about the path, not just the destination",
        content:
          "Strong architecture responses usually explain migration and rollout, not just the end state.",
      },
      {
        title: "Choose what to defer",
        content:
          "Version-one discipline matters. Good design reasoning includes what you would intentionally not build yet.",
      },
    ],
    "tool-steering-challenge": [
      {
        title: "Constrain the model before asking for help",
        content:
          "Define what the AI is allowed to change, what it should not touch, and how success will be checked.",
      },
      {
        title: "Validation matters more than prompt style",
        content:
          "Explain how generated output or generated reasoning will be verified before it is trusted.",
      },
      {
        title: "Keep ownership explicit",
        content:
          "Look for the parts of the task where direct human judgment still has to own tradeoffs, risks, or business logic.",
      },
    ],
  };

  return byArchetype[challenge.archetype] ?? [];
}

export default function App() {
  const [appMode, setAppMode] = useState<AppMode>("evaluation");
  const [selectedId, setSelectedId] = useState<string>(challenges[0]?.id ?? "");
  const selected = challenges.find((challenge) => challenge.id === selectedId) as LoadedChallenge;
  const [notes, setNotes] = useState("");
  const [response, setResponse] = useState("");
  const [reviewerMode, setReviewerMode] = useState(false);
  const [reviewerOutcome, setReviewerOutcome] = useState("");
  const [reviewerAssessment, setReviewerAssessment] = useState("");
  const [reviewerNotes, setReviewerNotes] = useState("");
  const [reviewerChecklist, setReviewerChecklist] = useState<Record<string, boolean>>({});
  const [trainingHintsShown, setTrainingHintsShown] = useState(0);
  const [workspaceStatus, setWorkspaceStatus] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const checklistItems = [
    ...selected.evaluation_signals.map((signal) => ({
      id: `signal:${signal}`,
      label: signal,
      group: "Evaluation signals",
    })),
    ...(selected.rubric?.strong ?? []).map((item) => ({
      id: `strong:${item}`,
      label: item,
      group: "Strong rubric cues",
    })),
    ...(selected.rubric?.weak ?? []).map((item) => ({
      id: `weak:${item}`,
      label: `Watch for: ${item}`,
      group: "Weak rubric cues",
    })),
  ];
  const trainingPrompts = getTrainingPrompts(selected);
  const trainingChecklist = getTrainingChecklist(selected);
  const workedExampleLinks: ChallengeWorkedExample[] = getWorkedExampleLinks(selected);
  const trainingHints = getTrainingHints(selected);

  useEffect(() => {
    if (!selected) {
      return;
    }

    setNotes(window.localStorage.getItem(storageKey(selected.id, "notes")) ?? "");
    setResponse(window.localStorage.getItem(storageKey(selected.id, "response")) ?? "");
    const savedHintsShown = Number(
      window.localStorage.getItem(storageKey(selected.id, "trainingHintsShown")) ?? "0",
    );
    setTrainingHintsShown(Number.isFinite(savedHintsShown) ? savedHintsShown : 0);
    setReviewerOutcome(window.localStorage.getItem(storageKey(selected.id, "reviewerOutcome")) ?? "");
    setReviewerAssessment(
      window.localStorage.getItem(storageKey(selected.id, "reviewerAssessment")) ?? "",
    );
    setReviewerNotes(window.localStorage.getItem(storageKey(selected.id, "reviewerNotes")) ?? "");
    try {
      const savedChecklist = window.localStorage.getItem(storageKey(selected.id, "reviewerChecklist"));
      const parsed = savedChecklist ? (JSON.parse(savedChecklist) as Record<string, boolean>) : {};
      setReviewerChecklist(parsed && typeof parsed === "object" ? parsed : {});
    } catch {
      setReviewerChecklist({});
    }
  }, [selected]);

  useEffect(() => {
    if (selected) {
      window.localStorage.setItem(storageKey(selected.id, "notes"), notes);
    }
  }, [notes, selected]);

  useEffect(() => {
    if (selected) {
      window.localStorage.setItem(storageKey(selected.id, "response"), response);
    }
  }, [response, selected]);

  useEffect(() => {
    if (selected) {
      window.localStorage.setItem(
        storageKey(selected.id, "trainingHintsShown"),
        String(trainingHintsShown),
      );
    }
  }, [trainingHintsShown, selected]);

  useEffect(() => {
    if (selected) {
      window.localStorage.setItem(storageKey(selected.id, "reviewerOutcome"), reviewerOutcome);
    }
  }, [reviewerOutcome, selected]);

  useEffect(() => {
    if (selected) {
      window.localStorage.setItem(storageKey(selected.id, "reviewerAssessment"), reviewerAssessment);
    }
  }, [reviewerAssessment, selected]);

  useEffect(() => {
    if (selected) {
      window.localStorage.setItem(storageKey(selected.id, "reviewerNotes"), reviewerNotes);
    }
  }, [reviewerNotes, selected]);

  useEffect(() => {
    if (selected) {
      window.localStorage.setItem(
        storageKey(selected.id, "reviewerChecklist"),
        JSON.stringify(reviewerChecklist),
      );
    }
  }, [reviewerChecklist, selected]);

  function exportWorkspace() {
    if (!selected) {
      return;
    }

    const exportedAt = new Date().toISOString();
    const payload = {
      challengeId: selected.id,
      appMode,
      exportedAt,
      notes,
      response,
      trainingHintsShown,
      reviewerOutcome,
      reviewerAssessment,
      reviewerNotes,
      reviewerChecklist,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const safeTimestamp = exportedAt.replace(/[:.]/g, "-");
    link.download = `${selected.id}-${safeTimestamp}-workspace.json`;
    link.click();
    window.URL.revokeObjectURL(url);
    setWorkspaceStatus({
      tone: "success",
      message: `Exported workspace for ${selected.id}.`,
    });
  }

  async function importWorkspace(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !selected) {
      return;
    }

    let payload;

    try {
      const source = await file.text();
      payload = JSON.parse(source) as {
        challengeId?: string;
        appMode?: AppMode;
        exportedAt?: string;
        notes?: string;
        response?: string;
        trainingHintsShown?: number;
        reviewerOutcome?: string;
        reviewerAssessment?: string;
        reviewerNotes?: string;
        reviewerChecklist?: Record<string, boolean>;
      };
    } catch {
      setWorkspaceStatus({
        tone: "error",
        message: "Import failed: the selected file is not valid JSON.",
      });
      event.target.value = "";
      return;
    }

    if (typeof payload.challengeId !== "string" || payload.challengeId.trim().length === 0) {
      setWorkspaceStatus({
        tone: "error",
        message: "Import failed: the file is missing a valid challengeId.",
      });
      event.target.value = "";
      return;
    }

    if (typeof payload.exportedAt !== "string" || payload.exportedAt.trim().length === 0) {
      setWorkspaceStatus({
        tone: "error",
        message: "Import failed: the file is missing exportedAt metadata.",
      });
      event.target.value = "";
      return;
    }

    if (payload.challengeId !== selected.id) {
      setWorkspaceStatus({
        tone: "error",
        message: `Import failed: this file is for ${payload.challengeId}, not ${selected.id}.`,
      });
      event.target.value = "";
      return;
    }

    setAppMode(payload.appMode === "training" ? "training" : "evaluation");
    setNotes(typeof payload.notes === "string" ? payload.notes : "");
    setResponse(typeof payload.response === "string" ? payload.response : "");
    setTrainingHintsShown(
      Number.isInteger(payload.trainingHintsShown) && payload.trainingHintsShown >= 0
        ? payload.trainingHintsShown
        : 0,
    );
    setReviewerOutcome(typeof payload.reviewerOutcome === "string" ? payload.reviewerOutcome : "");
    setReviewerAssessment(
      typeof payload.reviewerAssessment === "string" ? payload.reviewerAssessment : "",
    );
    setReviewerNotes(typeof payload.reviewerNotes === "string" ? payload.reviewerNotes : "");
    setReviewerChecklist(
      payload.reviewerChecklist &&
        typeof payload.reviewerChecklist === "object" &&
        !Array.isArray(payload.reviewerChecklist)
        ? Object.fromEntries(
            Object.entries(payload.reviewerChecklist).map(([key, value]) => [key, Boolean(value)]),
          )
        : {},
    );
    setWorkspaceStatus({
      tone: "success",
      message: `Imported workspace from ${payload.exportedAt}.`,
    });
    event.target.value = "";
  }

  if (!selected) {
    return <main className="empty-state">No challenges found.</main>;
  }

  const checklistGroups = Array.from(
    checklistItems.reduce((groups, item) => {
      const existing = groups.get(item.group) ?? [];
      existing.push(item);
      groups.set(item.group, existing);
      return groups;
    }, new Map<string, typeof checklistItems>()),
  );

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-header">
          <p className="eyebrow">SteerLab</p>
          <h1>Challenge Runner</h1>
          <p className="sidebar-copy">Local-first reference UI for AI-era engineering scenarios.</p>
        </div>

        <div className="challenge-count">{challenges.length} seed challenges</div>

        <div className="toolbar">
          <div className="mode-switch" role="tablist" aria-label="Workspace mode">
            <button
              type="button"
              className={appMode === "evaluation" ? "mode-switch-button active" : "mode-switch-button"}
              onClick={() => setAppMode("evaluation")}
            >
              Evaluation
            </button>
            <button
              type="button"
              className={appMode === "training" ? "mode-switch-button active" : "mode-switch-button"}
              onClick={() => setAppMode("training")}
            >
              Training
            </button>
          </div>
          <button
            type="button"
            className={reviewerMode ? "mode-toggle active" : "mode-toggle"}
            onClick={() => setReviewerMode((current) => !current)}
            disabled={appMode !== "evaluation"}
          >
            {reviewerMode ? "Reviewer Mode On" : "Reviewer Mode Off"}
          </button>
          <button type="button" className="tool-button" onClick={exportWorkspace}>
            Export Workspace
          </button>
          <button
            type="button"
            className="tool-button"
            onClick={() => fileInputRef.current?.click()}
          >
            Import Workspace
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            className="hidden-input"
            onChange={importWorkspace}
          />
        </div>

        <nav className="challenge-list" aria-label="Challenges">
          {challenges.map((challenge) => (
            <button
              key={challenge.id}
              type="button"
              className={challenge.id === selected.id ? "challenge-link active" : "challenge-link"}
              onClick={() => setSelectedId(challenge.id)}
            >
              <span className="challenge-link-category">{formatLabel(challenge.archetype)}</span>
              <strong>{challenge.title}</strong>
              <span>
                {formatLabel(challenge.category)} · {challenge.difficulty} · {challenge.estimated_time_minutes} min
              </span>
            </button>
          ))}
        </nav>
      </aside>

      <main className="content">
        {workspaceStatus && (
          <section
            className={
              workspaceStatus.tone === "success" ? "status-banner success" : "status-banner error"
            }
          >
            <strong>{workspaceStatus.tone === "success" ? "Workspace" : "Import Error"}</strong>
            <span>{workspaceStatus.message}</span>
          </section>
        )}

        {appMode === "training" && (
          <section className="panel training-intro">
            <div className="section-heading">
              <h3>Training Mode</h3>
              <span className="source-path">Practice first, compare later</span>
            </div>
            <p className="training-copy">
              Use this mode to work through the scenario deliberately. Start with your own notes and
              response, use the reflection prompts and thinking checklist to sharpen your reasoning,
              and only then compare against worked examples.
            </p>
          </section>
        )}

        {appMode === "evaluation" && (
          <section className="panel evaluation-intro">
            <div className="section-heading">
              <h3>Evaluation Mode</h3>
              <span className="source-path">Capture reasoning for review</span>
            </div>
            <p className="training-copy">
              Use this mode to work through the scenario as a candidate or reviewer. Capture notes,
              write a response, and, when reviewer mode is enabled, record structured assessment
              against the challenge’s evaluation signals and rubric.
            </p>
          </section>
        )}

        <header className="hero">
          <p className="eyebrow">{formatLabel(selected.archetype)}</p>
          <h2>{selected.title}</h2>
          <p className="hero-description">{selected.description}</p>
          <div className="meta-row">
            <span>{formatLabel(appMode)} mode</span>
            <span>{formatLabel(selected.category)}</span>
            <span>{selected.difficulty}</span>
            <span>{selected.estimated_time_minutes} minutes</span>
            <span>{selected.id}</span>
          </div>
        </header>

        <section className="panel">
          <h3>Context</h3>
          <p className="multiline">{selected.context}</p>
        </section>

        <section className="panel">
          <h3>{appMode === "training" ? "Practice Instructions" : "Candidate Instructions"}</h3>
          <ul>
            {selected.candidate_instructions.map((instruction) => (
              <li key={instruction}>{instruction}</li>
            ))}
          </ul>
        </section>

        <section className="panel">
          <h3>{appMode === "training" ? "What Strong Thinking Should Surface" : "Evaluation Signals"}</h3>
          <ul>
            {selected.evaluation_signals.map((signal) => (
              <li key={signal}>{signal}</li>
            ))}
          </ul>
        </section>

        {appMode === "evaluation" && selected.rubric && (
          <section className="panel">
            <h3>Rubric</h3>
            {selected.rubric.strong && (
              <>
                <h4>Strong signals</h4>
                <ul>
                  {selected.rubric.strong.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </>
            )}
            {selected.rubric.weak && (
              <>
                <h4>Weak signals</h4>
                <ul>
                  {selected.rubric.weak.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </>
            )}
          </section>
        )}

        <section className="panel">
          <div className="section-heading">
            <h3>{appMode === "training" ? "Study Materials" : "Artifacts"}</h3>
            <span className="source-path">{selected.sourcePath}</span>
          </div>
          <div className="artifact-grid">
            {selected.artifacts.map((artifact) => (
              <article key={artifact.path} className="artifact-card">
                <div className="artifact-meta">
                  <strong>{artifact.path}</strong>
                  <span>{artifact.kind}</span>
                </div>
                <p>{artifact.purpose}</p>
                <pre>{artifact.content}</pre>
              </article>
            ))}
          </div>
        </section>

        <section className="workspace-grid">
          <section className="panel">
            <h3>{appMode === "training" ? "Learning Notes" : "Candidate Notes"}</h3>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder={
                appMode === "training"
                  ? "Capture observations, assumptions, tradeoffs, and what you are learning."
                  : "Capture hypotheses, tradeoffs, missing data, and working notes."
              }
            />
          </section>
          <section className="panel">
            <h3>{appMode === "training" ? "Practice Response" : "Draft Response"}</h3>
            <textarea
              value={response}
              onChange={(event) => setResponse(event.target.value)}
              placeholder={
                appMode === "training"
                  ? "Write your current thinking before comparing it with examples or future coaching."
                  : "Write the response you would submit for review."
              }
            />
          </section>
        </section>

        {appMode === "training" && (
          <>
            <section className="workspace-grid">
              <section className="panel">
                <h3>Reflection Prompts</h3>
                <ul>
                  {trainingPrompts.map((prompt) => (
                    <li key={prompt}>{prompt}</li>
                  ))}
                </ul>
              </section>
              <section className="panel">
                <h3>Thinking Checklist</h3>
                <ul>
                  {trainingChecklist.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </section>
            </section>

            {trainingHints.length > 0 && (
              <section className="panel">
                <div className="section-heading">
                  <h3>Progressive Hints</h3>
                  <span className="source-path">
                    Reveal only after pushing your own reasoning as far as you can
                  </span>
                </div>
                <div className="hints-toolbar">
                  <button
                    type="button"
                    className="tool-button"
                    onClick={() =>
                      setTrainingHintsShown((current) => Math.min(current + 1, trainingHints.length))
                    }
                    disabled={trainingHintsShown >= trainingHints.length}
                  >
                    {trainingHintsShown === 0 ? "Show first hint" : "Show next hint"}
                  </button>
                  <button
                    type="button"
                    className="tool-button"
                    onClick={() => setTrainingHintsShown(0)}
                    disabled={trainingHintsShown === 0}
                  >
                    Reset hints
                  </button>
                </div>
                <div className="hint-list">
                  {trainingHintsShown === 0 && (
                    <p className="source-path">No hints revealed yet.</p>
                  )}
                  {trainingHints.slice(0, trainingHintsShown).map((hint, index) => (
                    <article key={`${hint.title}-${index}`} className="hint-card">
                      <strong>
                        Hint {index + 1}: {hint.title}
                      </strong>
                      <p>{hint.content}</p>
                    </article>
                  ))}
                </div>
              </section>
            )}

            <section className="panel">
              <div className="section-heading">
                <h3>Worked Examples</h3>
                <span className="source-path">Use after attempting your own response</span>
              </div>
              <div className="worked-examples">
                {workedExampleLinks.map((link) => (
                  <a key={link.href} className="worked-example-link" href={link.href} target="_blank" rel="noreferrer">
                    {link.label}
                  </a>
                ))}
              </div>
            </section>
          </>
        )}

        {appMode === "evaluation" && reviewerMode && (
          <>
            <section className="panel">
              <div className="section-heading">
                <h3>Reviewer Checklist</h3>
                <span className="source-path">Structured cues derived from this challenge</span>
              </div>
              <div className="review-outcome-group">
                <span className="review-outcome-label">Quick outcome</span>
                <div className="outcome-options">
                  {["Strong", "Mixed", "Weak"].map((option) => (
                    <button
                      key={option}
                      type="button"
                      className={reviewerOutcome === option ? "outcome-chip active" : "outcome-chip"}
                      onClick={() => setReviewerOutcome(option)}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
              <div className="checklist-groups">
                {checklistGroups.map(([group, items]) => (
                  <section key={group} className="checklist-group">
                    <h4>{group}</h4>
                    <div className="checklist-items">
                      {items.map((item) => (
                        <label key={item.id} className="checklist-item">
                          <input
                            type="checkbox"
                            checked={Boolean(reviewerChecklist[item.id])}
                            onChange={(event) =>
                              setReviewerChecklist((current) => ({
                                ...current,
                                [item.id]: event.target.checked,
                              }))
                            }
                          />
                          <span>{item.label}</span>
                        </label>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            </section>

            <section className="workspace-grid">
            <section className="panel">
              <h3>Reviewer Assessment</h3>
              <textarea
                value={reviewerAssessment}
                onChange={(event) => setReviewerAssessment(event.target.value)}
                placeholder="Record overall assessment, key strengths, concerns, and decision notes."
              />
            </section>
            <section className="panel">
              <h3>Reviewer Notes</h3>
              <textarea
                value={reviewerNotes}
                onChange={(event) => setReviewerNotes(event.target.value)}
                placeholder="Capture evidence-based review notes tied to the evaluation signals."
              />
            </section>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
