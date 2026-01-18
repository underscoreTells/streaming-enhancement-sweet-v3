# AI-Assisted Development Workflow

This document describes the methodology for working with AI agents on this project.

## Documentation Structure

### AGENTS.md
- **Purpose**: Project context for AI agents
- **Content**: Tech stack, code conventions, build/test/run commands
- **Auto-generated**: Run `/init` to create
- **When updated**: When project structure or conventions change

### PLAN.md
- **Purpose**: Current feature being implemented
- **Content**: Feature overview, task checklist, module tracking
- **Updated by**: Agent suggests updates, human reviews and approves
- **When updated**: At feature boundaries, task completions

### docs/module-plans/*.md
- **Purpose**: Detailed plans for each module (server-daemon, cli, web-ui)
- **Content**: Module overview, structure, interfaces, features list
- **Created by**: Agent creates template, fills in during development
- **When archived**: When module is complete → moved to `docs/archive/`

### docs/archive/*.md
- **Purpose**: Completed module plans for reference
- **Content**: Summary of implemented module, key features, decisions
- **Named**: `module-[name].md` (no dates)
- **When created**: When module is completed

## Agent Mode Usage

### Plan Mode (Tab key)
- **Purpose**: Analyze and create plans without making changes
- **When to use**: Starting new features, major changes
- **Output**: Suggested updates to PLAN.md, task breakdowns
- **Constraint**: Read-only, asks before running bash commands

### Build Mode (Tab key)
- **Purpose**: Full development work with all tools enabled
- **When to use**: Implementing approved plans, making changes
- **Output**: Code implementation, file updates, tests
- **Permissions**: Full access to file edits, bash commands

## Feature Development Workflow

### Step 1: Plan a Feature
1. Human requests: "Plan out [feature name]"
2. Agent (Plan Mode):
   - Suggests which module this belongs to
   - Human agrees or clarifies
   - Agent references module plan: `@docs/module-plans/[module].md`
   - Agent generates task breakdown in PLAN.md
3. Human reviews and approves
4. Switch to Build Mode

### Step 2: Implement Feature
1. Agent works through tasks in PLAN.md sequentially
2. Each task completion: Update checkbox status in PLAN.md
3. Feature complete: Move to next feature, update PLAN.md
4. At end of feature, document decisions in module plan

### Step 3: Complete Module
1. All features in module complete
2. Agent suggests: Archive module plan to `docs/archive/module-[name].md`
3. Human reviews and approves
4. Agent archives file, updates PLAN.md with next module

## File References

- `@AGENTS.md` - Project context, tech stack, conventions
- `@docs/PLAN.md` - Current feature and task list
- `@docs/module-plans/[name].md` - Detailed module documentation
- `@docs/archive/module-[name].md` - Completed modules

## Tech Stack

- **server-daemon**: TypeScript (Node.js) + Express + WebSocket
- **cli**: Go + Cobra CLI (cross-platform only, no platform-specific deps)
- **web-ui**: Svelte (latest)

## Agent Protocols

### Cross-Platform Guidelines (Go CLI)
- NO platform-specific dependencies
- NO CGO (C bindings) - use pure Go libraries
- Test on multiple platforms before shipping
- Use standard cross-platform Go packages

### Server Daemon Guidelines
- Structure: controllers/services/repositories/infrastructure (Option C)
- Event-driven architecture for stream data
- WebSocket for real-time client communication
- OAuth handling for Twitch/Kick API

### Documentation Updates
- Agent suggests updates → Human reviews → Agent applies
- Commit after each feature completion
- Archive completed modules with summary