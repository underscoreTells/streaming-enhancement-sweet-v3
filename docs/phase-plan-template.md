# Phase Plan Template

Use this streamlined format for all phase plans to reduce documentation overhead.

## Template

```markdown
# Phase N: [Phase Name]

## Overview
[1-2 sentences what this phase accomplishes]

## Tasks
- [ ] Task 1: [Brief description]
- [ ] Task 2: [Brief description]
- [ ] Task 3: [Brief description]

## Files to Create/Modify
- `file/path/to/create.ts`
- `existing/file/to/modify.ts`

## Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

## Dependencies
- Requires Phase N-1
- Depends on [external component]
```

## What to Include

- Phase overview (1-2 sentences)
- Task checklist (brief descriptions)
- File paths affected (not full content)
- Acceptance criteria (checklist format)
- Dependencies between phases

## What to Remove

- Code snippets and detailed implementation examples
- Step-by-step "how to" instructions
- Files Created section with full file content
- Extensive explanatory notes
- Multiple integration notes sections

## When to Add Additional Notes

- During implementation: Brief architectural decisions in PLAN.md
- Post-implementation: 1-page summary in docs/archive/feature-summaries/

## Benefits

- ~80% reduction in planning time
- Focus on what and why, not implementation details
- Easier to maintain and update
- Faster iteration cycles
