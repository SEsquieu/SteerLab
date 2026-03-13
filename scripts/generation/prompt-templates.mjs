import { slugify } from "./lib.mjs";

function compactPackContext(pack) {
  return {
    id: pack.id,
    summary: pack.summary,
    system_patterns: pack.system_patterns ?? [],
    common_failure_modes: pack.common_failure_modes ?? [],
    realism_rules: pack.realism_rules ?? [],
    anti_patterns: pack.anti_patterns ?? [],
    tag_catalog: pack.tag_catalog ?? [],
  };
}

export function buildSeedPrompt({ request, pack, mode }) {
  const artifactKinds = [
    ...(request.artifact_profile.required_kinds ?? []),
    ...(request.artifact_profile.preferred_kinds ?? []),
  ].filter((value, index, array) => array.indexOf(value) === index);

  const shape = {
    title: "string",
    premise: "one short paragraph, max 70 words",
    issue_class: "short kebab-case or short phrase",
    artifact_plan: artifactKinds.slice(0, request.artifact_profile.max_artifacts),
  };

  return `
Generate a SteerLab challenge seed.

One task only: return a small planning seed.

Return ONLY valid JSON.
No markdown fences.
No commentary.
No wrapper object.

Return exactly this shape:
${JSON.stringify(shape, null, 2)}

Rules:
- premise must be one short paragraph, max 70 words
- artifact_plan must be an array of artifact kinds only
- artifact_plan length must be <= ${request.artifact_profile.max_artifacts}
- use required kinds when present
- keep the scenario realistic and serious
- do not explain the solution

Normalized request:
${JSON.stringify(
    {
      archetype: request.archetype,
      specialty: request.specialty,
      difficulty: request.difficulty,
      estimated_time_minutes: request.estimated_time_minutes,
      topic_tags: request.topic_tags ?? [],
      artifact_profile: request.artifact_profile,
      realism_constraints: request.realism_constraints,
      mode,
      source_request: request.source_request ?? null,
    },
    null,
    2,
  )}

Specialty pack:
${JSON.stringify(compactPackContext(pack), null, 2)}
`.trim();
}

export function buildContextPrompt({ request, skeleton, pack }) {
  const shape = {
    description: "one sentence, max 24 words",
    context: "one paragraph, max 95 words",
    candidate_instructions: ["string", "string", "string"],
  };

  return `
Generate challenge framing text for a SteerLab challenge.

One task only: write short framing text and candidate instructions.

Return ONLY valid JSON.
No markdown fences.
No commentary.
No wrapper object.

Return exactly this shape:
${JSON.stringify(shape, null, 2)}

Rules:
- description must be one sentence
- context must be one paragraph
- candidate_instructions must contain at most 3 strings
- candidate_instructions must point to named artifact paths when possible
- do not restate the full prompt
- do not explain the answer

Request:
${JSON.stringify(
    {
      archetype: request.archetype,
      specialty: request.specialty,
      intended_mode: request.intended_mode,
      topic_tags: request.topic_tags ?? [],
    },
    null,
    2,
  )}

Skeleton:
${JSON.stringify(
    {
      skeleton_id: skeleton.skeleton_id,
      title: skeleton.challenge_outline.title,
      category: skeleton.challenge_outline.category,
      premise: skeleton.challenge_outline.context,
      artifact_slots: skeleton.artifact_slots,
    },
    null,
    2,
  )}

Pack hints:
${JSON.stringify(
    {
      common_failure_modes: pack.common_failure_modes ?? [],
      anti_patterns: pack.anti_patterns ?? [],
    },
    null,
    2,
  )}
`.trim();
}

export function buildArtifactPlanPrompt({ request, skeleton, pack }) {
  const shape = {
    artifacts: skeleton.artifact_slots.map((slot) => ({
      slot_id: slot.slot_id,
      path: slot.path,
      kind: slot.kind,
      purpose: "string",
      evidentiary_role: "string",
      clue: "string",
    })),
  };

  return `
Generate an artifact blueprint for a SteerLab challenge.

One task only: define what each artifact should prove.

Return ONLY valid JSON.
No markdown fences.
No commentary.
No wrapper object.

Return exactly this shape:
${JSON.stringify(shape, null, 2)}

Rules:
- preserve slot_id, path, and kind exactly
- purpose must be short and concrete
- evidentiary_role must say what the artifact proves
- clue must name the specific signal the learner should be able to notice
- do not repeat the same phrasing across artifacts
- do not give away the entire diagnosis

Request:
${JSON.stringify(
    {
      archetype: request.archetype,
      specialty: request.specialty,
      difficulty: request.difficulty,
      topic_tags: request.topic_tags ?? [],
    },
    null,
    2,
  )}

Skeleton:
${JSON.stringify(
    {
      title: skeleton.challenge_outline.title,
      issue_class: skeleton.issue_class,
      context: skeleton.challenge_outline.context,
      artifact_slots: skeleton.artifact_slots,
    },
    null,
    2,
  )}

Pack hints:
${JSON.stringify(
    {
      common_failure_modes: pack.common_failure_modes ?? [],
      artifact_guidance: pack.artifact_guidance,
    },
    null,
    2,
  )}
`.trim();
}

function artifactTypeInstructions(kind) {
  const instructions = {
    log: "Write a realistic machine or service log excerpt with timestamps and 6-8 lines. Do not explain the log.",
    config: "Write a minimal config excerpt with only 4-8 relevant fields. Do not add comments unless essential.",
    yaml: "Write a minimal YAML config excerpt with only 4-8 relevant fields. Do not add prose.",
    json: "Write a minimal JSON config excerpt with only relevant keys. Do not add prose.",
    markdown: "Write a short operational note in markdown, max 80 words. Keep it factual, not analytical.",
    trace: "Write a short trace excerpt with timing or state transitions only.",
    text: "Write a short plain-text operational note, max 80 words.",
    code: "Write a small code or config snippet, max 20 lines.",
  };

  return instructions[kind] ?? instructions.text;
}

function artifactTypeNegativeRules(kind) {
  const rules = {
    log: [
      "do not summarize what the log means",
      "do not mention root cause explicitly",
      "do not write prose paragraphs",
    ],
    config: [
      "do not wrap config in explanation",
      "do not include unrelated sections",
      "do not add placeholders",
    ],
    yaml: [
      "do not wrap YAML in explanation",
      "do not include unrelated sections",
      "do not add placeholders",
    ],
    json: [
      "do not wrap JSON in explanation",
      "do not add example keys unrelated to the clue",
      "do not add placeholders",
    ],
    markdown: [
      "do not introduce IDs, version tags, regions, hostnames, or service names unless they already appear in the scenario or blueprint",
      "do not claim evidence not visible in the other artifacts",
      "do not turn the note into a diagnosis",
    ],
    text: [
      "do not introduce IDs, version tags, regions, hostnames, or service names unless they already appear in the scenario or blueprint",
      "do not claim evidence not visible in the other artifacts",
      "do not turn the note into a diagnosis",
    ],
  };

  return rules[kind] ?? [
    "do not add explanation outside the artifact content",
    "do not introduce unsupported specifics",
  ];
}

function compactArtifactPackHints(pack, kind) {
  return {
    system_patterns: (pack.system_patterns ?? []).slice(0, 3),
    common_failure_modes: (pack.common_failure_modes ?? []).slice(0, 3),
    realism_rules: (pack.realism_rules ?? []).slice(0, 3),
    artifact_guidance: pack.artifact_guidance?.[kind] ?? pack.artifact_guidance?.default ?? null,
  };
}

export function buildArtifactPrompt({ request, skeleton, blueprint, artifact, pack }) {
  const shape = {
    path: artifact.path,
    content: "string",
  };

  return `
Generate one SteerLab artifact.

One task only: write the content for this artifact.

Return ONLY valid JSON.
No markdown fences.
No commentary.
No wrapper object.

Return exactly this shape:
${JSON.stringify(shape, null, 2)}

Rules:
- preserve path exactly
- ${artifactTypeInstructions(artifact.kind)}
- make the artifact realistic
- make the clue visible but not fully self-explaining
- keep the content narrowly tied to the scenario
- ${artifactTypeNegativeRules(artifact.kind).join("\n- ")}

Request:
${JSON.stringify(
    {
      specialty: request.specialty,
      difficulty: request.difficulty,
    },
    null,
    2,
  )}

Scenario:
${JSON.stringify(
    {
      title: skeleton.challenge_outline.title,
      issue_class: skeleton.issue_class,
      context: skeleton.challenge_outline.context.split(/\s+/).slice(0, 28).join(" "),
    },
    null,
    2,
  )}

Artifact blueprint:
${JSON.stringify(blueprint, null, 2)}

Pack hints:
${JSON.stringify(compactArtifactPackHints(pack, artifact.kind), null, 2)}
`.trim();
}

export function buildEvaluationPrompt({ request, skeleton, artifactBlueprints, pack, mode }) {
  const trainingShape = {
    evaluation_signals: ["string", "string", "string"],
    reflection_prompts: ["string", "string"],
    thinking_checklist: ["string", "string", "string"],
    checkpoints: [
      { id: "string", title: "string", prompt: "string" },
      { id: "string", title: "string", prompt: "string" },
    ],
    hints: [
      { title: "string", content: "string" },
      { title: "string", content: "string" },
    ],
  };

  const evaluationShape = {
    evaluation_signals: ["string", "string", "string"],
  };

  const shape = request.intended_mode === "training" ? trainingShape : evaluationShape;

  return `
Generate SteerLab evaluation and training scaffolds.

One task only: write reviewer signals and training aids.

Return ONLY valid JSON.
No markdown fences.
No commentary.
No wrapper object.

Return exactly this shape:
${JSON.stringify(shape, null, 2)}

Rules:
- evaluation_signals must be specific and artifact-anchored
- keep all items short
- checkpoints must be evidence-first, not answer-first
- hints must steer investigation without naming the full answer
- adapt output density to mode "${mode}"

Scenario:
${JSON.stringify(
    {
      title: skeleton.challenge_outline.title,
      category: skeleton.challenge_outline.category,
      context: skeleton.challenge_outline.context,
      artifact_plan: artifactBlueprints,
      scaffold_plan: skeleton.scaffold_plan,
    },
    null,
    2,
  )}

Pack hints:
${JSON.stringify(
    {
      evaluation_heuristics: pack.evaluation_heuristics ?? [],
      training_heuristics: pack.training_heuristics ?? [],
      common_failure_modes: pack.common_failure_modes ?? [],
    },
    null,
    2,
  )}
`.trim();
}

export function defaultArtifactPurpose(kind, issueClass) {
  const normalized = slugify(issueClass).replace(/-/g, " ");
  const defaults = {
    log: `Show the runtime symptom pattern for ${normalized}.`,
    config: `Show the relevant configuration tied to ${normalized}.`,
    yaml: `Show the relevant configuration tied to ${normalized}.`,
    json: `Show the relevant configuration tied to ${normalized}.`,
    markdown: `Provide field or incident context related to ${normalized}.`,
    trace: `Show timing or state transitions related to ${normalized}.`,
    text: `Provide supporting plain-text context for ${normalized}.`,
    code: `Show the relevant implementation snippet tied to ${normalized}.`,
  };

  return defaults[kind] ?? defaults.text;
}
