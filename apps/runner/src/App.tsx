import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { challenges } from "./challenges";
import type { LoadedChallenge } from "./types";

const storageKey = (
  challengeId: string,
  field:
    | "notes"
    | "response"
    | "reviewerAssessment"
    | "reviewerNotes"
    | "reviewerOutcome"
    | "reviewerChecklist",
) =>
  `steerlab:${challengeId}:${field}`;

function formatLabel(value: string) {
  return value.replace(/-/g, " ");
}

export default function App() {
  const [selectedId, setSelectedId] = useState<string>(challenges[0]?.id ?? "");
  const selected = challenges.find((challenge) => challenge.id === selectedId) as LoadedChallenge;
  const [notes, setNotes] = useState("");
  const [response, setResponse] = useState("");
  const [reviewerMode, setReviewerMode] = useState(false);
  const [reviewerOutcome, setReviewerOutcome] = useState("");
  const [reviewerAssessment, setReviewerAssessment] = useState("");
  const [reviewerNotes, setReviewerNotes] = useState("");
  const [reviewerChecklist, setReviewerChecklist] = useState<Record<string, boolean>>({});
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

  useEffect(() => {
    if (!selected) {
      return;
    }

    setNotes(window.localStorage.getItem(storageKey(selected.id, "notes")) ?? "");
    setResponse(window.localStorage.getItem(storageKey(selected.id, "response")) ?? "");
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
      exportedAt,
      notes,
      response,
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
        exportedAt?: string;
        notes?: string;
        response?: string;
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

    setNotes(typeof payload.notes === "string" ? payload.notes : "");
    setResponse(typeof payload.response === "string" ? payload.response : "");
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
          <button
            type="button"
            className={reviewerMode ? "mode-toggle active" : "mode-toggle"}
            onClick={() => setReviewerMode((current) => !current)}
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

        <header className="hero">
          <p className="eyebrow">{formatLabel(selected.archetype)}</p>
          <h2>{selected.title}</h2>
          <p className="hero-description">{selected.description}</p>
          <div className="meta-row">
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
          <h3>Candidate Instructions</h3>
          <ul>
            {selected.candidate_instructions.map((instruction) => (
              <li key={instruction}>{instruction}</li>
            ))}
          </ul>
        </section>

        <section className="panel">
          <h3>Evaluation Signals</h3>
          <ul>
            {selected.evaluation_signals.map((signal) => (
              <li key={signal}>{signal}</li>
            ))}
          </ul>
        </section>

        {selected.rubric && (
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
            <h3>Artifacts</h3>
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
            <h3>Candidate Notes</h3>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Capture hypotheses, tradeoffs, missing data, and working notes."
            />
          </section>
          <section className="panel">
            <h3>Draft Response</h3>
            <textarea
              value={response}
              onChange={(event) => setResponse(event.target.value)}
              placeholder="Write the response you would submit for review."
            />
          </section>
        </section>

        {reviewerMode && (
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
