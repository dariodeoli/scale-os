# Skill Registry — scale-os

**Detected**: 2026-09-14
This file is an index, not a summary. Subagents read the full SKILL.md at the listed path as source of truth.

## User Skills

| Name | Trigger | Path | Scope |
| --- | --- | --- | --- |
| branch-pr | creating, opening, or preparing PRs for review | /Users/dariodeoli/.agents/skills/branch-pr/SKILL.md | user |
| chained-pr | PRs over 400 lines, stacked PRs, review slices | /Users/dariodeoli/.agents/skills/chained-pr/SKILL.md | user |
| cognitive-doc-design | writing guides, READMEs, RFCs, onboarding, architecture, review-facing docs | /Users/dariodeoli/.agents/skills/cognitive-doc-design/SKILL.md | user |
| comment-writer | PR feedback, issue replies, reviews, Slack messages, GitHub comments | /Users/dariodeoli/.agents/skills/comment-writer/SKILL.md | user |
| gentle-ai-bench | bench, journey, journeys, driven mode, gentle-ai-bench, journey corpus, j-numbers, bench axis | /Users/dariodeoli/.agents/skills/gentle-ai-bench/SKILL.md | user |
| go-testing | Go tests, go test coverage, Bubbletea teatest, golden files | /Users/dariodeoli/.agents/skills/go-testing/SKILL.md | user |
| issue-creation | issue creation, bug reports, feature requests, issue approval | /Users/dariodeoli/.agents/skills/issue-creation/SKILL.md | user |
| judgment-day | judgment day, dual review, adversarial review, juzgar | /Users/dariodeoli/.agents/skills/judgment-day/SKILL.md | user |
| rdd-defect-workflow | RDD, receipt-driven development, review authority, receipt/lineage, correction/recovery, delivery gate/kill switch, bounded review defects | /Users/dariodeoli/.agents/skills/rdd-defect-workflow/SKILL.md | user |
| skill-creator | new skills, agent instructions, documenting AI usage patterns | /Users/dariodeoli/.agents/skills/skill-creator/SKILL.md | user |
| skill-improver | improve skills, audit skills, refactor skills, skill quality | /Users/dariodeoli/.agents/skills/skill-improver/SKILL.md | user |
| source-command-gentle-sdd-init | initialize SDD context, detects project stack and bootstraps persistence backend | /Users/dariodeoli/.agents/skills/source-command-gentle-sdd-init/SKILL.md | user |
| source-command-gentle-sdd-onboard | guided SDD walkthrough on the real codebase | /Users/dariodeoli/.agents/skills/source-command-gentle-sdd-onboard/SKILL.md | user |
| systemic-issue-triage | new issue, bug report, triage, backlog, issue flood, community report, root cause, dead-end, blocked user | /Users/dariodeoli/.agents/skills/systemic-issue-triage/SKILL.md | user |
| work-unit-commits | implementation, commit splitting, chained PRs, keeping tests and docs with code | /Users/dariodeoli/.agents/skills/work-unit-commits/SKILL.md | user |
| apple-design | gesture-driven UI, spring animations, drag/swipe/sheet interactions, Apple-style interfaces | /Users/dariodeoli/.codex/skills/apple-design/SKILL.md | user |
| emil-design-eng | UI polish, component design, animation decisions, invisible details | /Users/dariodeoli/.codex/skills/emil-design-eng/SKILL.md | user |
| engram-memory | ALWAYS ACTIVE — persistent memory protocol | /Users/dariodeoli/.codex/skills/memory/SKILL.md | user |
| pick-ui-library | pick the right library for a frontend task (explicit invocation only) | /Users/dariodeoli/.codex/skills/pick-ui-library/SKILL.md | user |
| ui-ux-pro-max | designing, building, reviewing, or fixing interfaces: pages, components, design systems, accessibility, responsive layout | /Users/dariodeoli/.codex/skills/ui-ux-pro-max/SKILL.md | user |

## Project Skills

None found (no skills/, .opencode/skills/, .claude/skills/, .agents/skills/, .atl/skills/, .github/skills/ or equivalent under the workspace root).

## Convention Files

None found at project root: agents.md, AGENTS.md, CLAUDE.md, .cursorrules, GEMINI.md, copilot-instructions.md — none present.

## Scan Notes

- Scanned user dirs: ~/.agents/skills, ~/.claude/skills, ~/.copilot/skills, ~/.codex/skills (other listed user dirs do not exist).
- Skipped: sdd-* skills, _shared, skill-registry, and ~/.codex/skills/.system (platform-internal bundle).
- Deduplication: project-level wins over user-level; among user dirs the first existing dir in scan order (~/.agents/skills) is canonical.
