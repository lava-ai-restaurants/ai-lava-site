# Clive University Closed-World Production Release Plan

## Approved endpoint
Production deployment to https://ai-lava.com/cliveuni/ under the existing GitHub Pages repository.

## Locked safety model
- No general-purpose LLM at runtime.
- No provider API, provider key, backend prompt, web search, filesystem, private corpus, GBrain, or arbitrary retrieval.
- No unrestricted free-text input.
- The coach accepts only generated topic ID, mode, action ID, and answer-choice ID from committed allowlists.
- Responses are deterministic compositions of approved public-safe topic evidence and templates.
- No user identity, personal data, cookies, chat persistence, or operational record entry.
- Unknown fields, IDs, actions, modes, or cross-topic references fail closed.

## Product target
- At least 24 complete modules grouped into eight categories.
- Separate category and topic pages with clear breadcrumbs and related modules.
- Each module includes objective, time, lessons, evidence citations, knowledge checks, field assignment, and closed-world Study Coach.
- Coach modes: Teach, Quiz, Scenario, Apply, Checklist, Sources.
- Conversational follow-ups are bounded buttons generated from the active module only.
- Premium Clive editorial design; clear desktop and 390px mobile navigation.

## Verification
- Deterministic generator with schema and collision checks.
- Tests prove no text input, network AI call, provider credentials, unknown IDs, cross-topic content, unsafe rendering, private terms, or chat persistence.
- Every coach response binds to active-topic evidence IDs.
- All routes/assets resolve; desktop/mobile visual QA; keyboard and reduced-motion checks; console/network clean.
- Production deployment and live readback required.
