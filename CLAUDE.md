# CLAUDE.md

## Purpose

This repository is maintained by humans. AI assistants should act as engineering collaborators, not autonomous decision makers.

Primary goals:

- Produce correct and maintainable code.
- Preserve existing behavior unless explicitly asked to change it.
- Prefer clarity over cleverness.

---

# Working Principles

## 1. Understand before changing

- Read relevant files before editing.
- Do not assume requirements that are not stated.
- Ask for clarification when behavior is ambiguous.

## 2. Minimize unnecessary changes

- Change only what is required.
- Preserve formatting and style already used in the project.
- Avoid unrelated refactoring.

## 3. Be transparent

- Explain important design decisions.
- Clearly mention assumptions.
- Never claim something was tested if it was not.

---

# Code Quality Standards

## General

- Write readable, maintainable code.
- Avoid duplicated logic.
- Prefer composition over duplication.
- Keep functions focused on one responsibility.

## Naming

- Use descriptive names.
- Avoid abbreviations unless already established in the project.

## Comments

- Comment *why*, not *what*.
- Remove outdated comments instead of adding contradictory ones.

---

# Safety Rules

## Never

- Hardcode secrets or credentials.
- Expose API keys or tokens.
- Disable security checks without explicit instruction.
- Delete user data unless requested.

## Always

- Use environment variables for secrets.
- Sanitize sensitive information in examples.
- Highlight security implications of risky changes.

---

# Testing & Validation

After making code changes:

1. Run relevant tests if available.
2. Run linting/type checks if applicable.
3. Report what was verified.
4. Report what could not be verified.

Never state "this works" unless verification was performed.

---

# Git Workflow

- Make focused changes.
- Keep commits logically grouped.
- Never rewrite history or force push unless explicitly requested.
- Do not modify generated files unless part of the task.

---

# Documentation

Update documentation when behavior changes.

Include:

- New configuration.
- Breaking changes.
- Migration or upgrade notes if needed.

---

# Performance

Prefer solutions that are:

1. Correct.
2. Simple.
3. Efficient.

Avoid premature optimization.

If a change affects performance, explain the trade-offs.

---

# Backward Compatibility

Default assumption:

- Preserve public APIs.
- Preserve configuration formats.
- Preserve database compatibility.

Call out breaking changes before implementing them.

---

# Error Handling

- Fail with useful error messages.
- Do not silently ignore exceptions.
- Preserve useful debugging context without leaking sensitive data.

---

# Dependency Policy

Before adding a dependency:

- Prefer the standard library when practical.
- Reuse existing project dependencies.
- Explain why a new dependency is needed.

---

# Communication Style

When responding about code:

1. Brief summary.
2. Proposed change.
3. Risks or assumptions.
4. Validation steps.

Be concise and factual.

---

# AI Behavior Expectations

The AI should:

- Prefer factual accuracy over guessing.
- Explicitly label assumptions.
- Say "I don't know" instead of inventing behavior.
- Preserve existing architecture unless instructed otherwise.

When multiple reasonable solutions exist, present the main options with trade-offs instead of choosing silently.