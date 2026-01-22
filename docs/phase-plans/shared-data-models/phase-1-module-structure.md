# Phase Plan: Shared Data Models - Phase 1 - Module Structure Setup

## Phase Overview

**Phase:** 1 of 13
**Title:** Module Structure Setup
**Estimated Time:** 2-3 hours
**Status:** Not Started

## Objective

Set up the complete directory structure for the `shared/models` module, including all subdirectories, TypeScript configuration, package setup, and initial boilerplate files. This phase creates the foundation that all other phases will build upon.

---

## Configuration

- **Package name:** `@streaming-enhancement/shared-models`
- **Location:** `shared/models/`
- **Build output:** Type declarations only (no JS compilation)
- **Monorepo:** pnpm workspaces (implicit, no workspace file needed at root)
- **TypeScript:** ES2022, strict mode, bundler resolution
- **Consistent with:** `@streaming-enhancement/keystore-native` and `@streaming-enhancement/server-daemon`

---

## Dependencies

**Before starting this phase, ensure:**
- ✅ Daemon Server Core feature is complete (monorepo structure exists)
- ✅ Node.js 18+ and pnpm are installed
- ✅ TypeScript 5.0+ configured in workspace

**This phase has no dependencies on other Shared Data Models phases** - it's the first.

---

## Tasks Breakdown

### Task 1.1: Create Directory Structure (30 minutes)

Create the complete directory tree for `shared/models/`:

```
shared/models/
├── src/
│   ├── adapters/              # Adapter implementations
│   ├── translators/           # Platform type converters
│   ├── converters/            # API response converters
│   ├── matchers/              # Stream/User matching logic
│   └── cache/                 # Category cache implementations
├── __tests__/                # Test files (mirror src structure)
│   ├── adapters/
│   ├── translators/
│   ├── converters/
│   ├── matchers/
│   └── cache/
└── package.json
```

**Commands:**
```bash
mkdir -p shared/models/src/{adapters,translators,converters,matchers,cache}
mkdir -p shared/models/__tests__/{adapters,translators,converters,matchers,cache}
```

---

### Task 1.2: Create package.json (30 minutes)

Create `shared/models/package.json`:

```json
{
  "name": "@streaming-enhancement/shared-models",
  "version": "0.1.0",
  "description": "Shared data models for streaming-enhancement - platform-agnostic types with adapter pattern",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    }
  },
  "scripts": {
    "build": "tsc",
    "test": "vitest",
    "test:coverage": "vitest --coverage"
  },
  "dependencies": {
    "uuid": "^9.0.0"
  },
  "devDependencies": {
    "@types/node": "^25.0.9",
    "@types/uuid": "^9.0.0",
    "typescript": "^5.9.3",
    "vitest": "^4.0.17",
    "@vitest/coverage-v8": "^4.0.17"
  }
}
```

**Notes:**
- Scoped package `@streaming-enhancement/shared-models` (consistent with workspace)
- ESM module type
- Type declarations only in `dist/`
- `uuid` for UUID generation
- `@types/uuid` for TypeScript type definitions

---

### Task 1.3: Create TypeScript Configuration (20 minutes)

Create `shared/models/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "es2020",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "declarationMap": true,
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "bundler",
    "types": ["node"]
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist", "__tests__"]
}
```

**Configuration notes:**
- Matches `packages/server-daemon/tsconfig.json` configuration
- ES2022 target (matches Node.js 18+)
- Bundler module resolution
- Declaration generation for type exports
- Strict mode enabled
- Excludes `__tests__` from build

---

### Task 1.4: Create Vitest Configuration (15 minutes)

Create `shared/models/vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['**/__tests__/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: ['node_modules', 'dist']
    }
  }
});
```

**Notes:**
- Simple vitest config matching server-daemon
- Node environment (not jsdom)
- V8 coverage provider
- Excludes `node_modules` and `dist`

---

### Task 1.5: Create Boilerplate Files (30 minutes)

Create initial placeholder files:

1. **`shared/models/src/index.ts`** - Barrel export file:
```typescript
// Shared data models barrel export
// Will export all types, adapters, translators, etc.

export {};
```

2. **`shared/models/src/interface.ts`** - Common interfaces:
```typescript
// Common interfaces used across shared models
// FeatureData, etc.

export {};
```

3. **`shared/models/.gitignore`** - Ignore build artifacts:
```
dist/
node_modules/
*.log
.DS_Store
```

4. **`shared/models/README.md`** - Package documentation (optional):
```markdown
# @streaming-enhancement/shared-models

Shared data types and adapters for streaming enhancement application.

This package provides platform-agnostic data models for Twitch, Kick, and YouTube
with an adapter/translator pattern to hide platform complexity.

## Installation

```bash
pnpm add @streaming-enhancement/shared-models
```

## Usage

```typescript
import { Stream, User, StreamAdapter } from '@streaming-enhancement/shared-models';
```

Note: Add detailed usage examples after implementation is complete.
```

---

### Task 1.6: Install Dependencies and Run Build (20 minutes)

Set up the package and verify everything works:

```bash
cd shared/models
pnpm install
pnpm build
pnpm test
```

**Expected outputs:**
- `pnpm install` - Installs dependencies, creates `node_modules/` and `pnpm-lock.yaml`
- `pnpm build` - Generates `dist/index.d.ts` and `dist/interface.d.ts`
- `pnpm test` - Runs vitest (no tests yet, but should pass)

---

### Task 1.7: Verify TypeScript Compilation (10 minutes)

Test that TypeScript correctly compiles with declarations:

```bash
cd shared/models
pnpm exec tsc --noEmit
```

**Expected:** No errors

Also verify that the package can be imported from another package (e.g., server-daemon):

1. Temporarily add to server-daemon dependencies in `packages/server-daemon/package.json`:
```json
"dependencies": {
  "@streaming-enhancement/shared-models": "file:../../shared/models",
  ...
}
```

2. Try importing in `packages/server-daemon/src/some-file.ts`:
```typescript
import { } from '@streaming-enhancement/shared-models';
```

3. Run `cd packages/server-daemon && pnpm build`

**Expected:** No import errors

---

### Task 1.8: Clean Up and Finalize (10 minutes)

1. Remove temporary test import from server-daemon (if added)
2. Verify final directory structure matches the plan
3. Ensure all files are tracked by git (except `dist/`, `node_modules/`, `pnpm-lock.yaml`)

---

## Task-by-Task File Breakdown

| Task | Files Created | Lines (approx) |
|------|---------------|----------------|
| 1.1 | Directories only | - |
| 1.2 | `package.json` | 30 lines |
| 1.3 | `tsconfig.json` | 19 lines |
| 1.4 | `vitest.config.ts` | 12 lines |
| 1.5 | `index.ts`, `interface.ts`, `.gitignore`, `README.md` | 20-30 lines |
| 1.6 | Generated `dist/` and `pnpm-lock.yaml` | - |
| 1.7 | Test file (temporary, deleted) | - |
| **Total** | **7-8 source files** | **80-90 lines** |

---

## Success Criteria

- [ ] All directories created successfully: `src/{adapters,translators,converters,matchers,cache}` and `__tests__/`
- [ ] `package.json` created with correct scope (`@streaming-enhancement/shared-models`)
- [ ] `tsconfig.json` created matching server-daemon configuration
- [ ] `vitest.config.ts` created with v8 coverage provider
- [ ] `src/index.ts` and `src/interface.ts` created as barrel exports
- [ ] `.gitignore` created to ignore `dist/` and `node_modules/`
- [ ] `pnpm install` completes without errors
- [ ] `pnpm build` generates type declarations in `dist/`
- [ ] `pnpm test` runs vitest successfully
- [ ] `tsc --noEmit` completes without errors
- [ ] Package can be imported from other workspace packages
- [ ] No TypeScript errors in workspace

---

## Deliverables

1. **Complete directory structure:** `shared/models/` with all subdirectories
2. **Package configuration:** `package.json`, `tsconfig.json`, `vitest.config.ts`
3. **Boilerplate files:** `src/index.ts`, `src/interface.ts`, `.gitignore`, `README.md`
4. **Test setup:** Working vitest configuration
5. **Build system:** Type declaration generation working
6. **Workspace integration:** Package can be imported from other packages

---

## Edge Cases to Handle

1. **TypeScript version mismatch:**
   - Ensure `typescript` in devDependencies matches workspace version (5.9.3)
   - Check root workspace for shared config

2. **Module resolution:**
   - Verify `moduleResolution: "bundler"` works with pnpm
   - If issues arise, fallback to `"node"` resolution

3. **pnpm workspace detection:**
   - Package should be auto-discovered by pnpm workspaces
   - Verify no workspace config file needed at root (pnpm auto-detects `package.json`)

4. **Import path resolution:**
   - Test import from server-daemon to ensure workspace linking works
   - Use `"file:../../shared/models"` reference for local development

---

## Testing Strategy for This Phase

1. **Smoke test:** Verify module structure has all directories
2. **Build test:** Ensure `pnpm build` generates type declarations
3. **Test test:** Ensure `pnpm test` runs vitest without crashing
4. **Workspace test:** Verify package is importable from other packages

**No unit tests needed** - this phase is infrastructure only. Real tests will be added in Phase 2+.

---

## Notes

- This phase is pure infrastructure - no actual business logic
- Keep changes minimal; don't over-engineer
- Focus on getting the directory structure and build system working
- All subsequent phases will add files to directories created in this phase
- Test coverage thresholds will be adjusted in later phases as real tests are added
- Type declarations only (no JS compilation) is acceptable for this shared types package

---

## Next Steps After This Phase

Once Phase 1 is complete:

1. **Phase 2:** Platform-Specific Base Types (TwitchStream, KickStream, YouTubeStream, Platform type)
2. **Phase 3:** Live Data Types (StreamStats)
3. **Phase 4:** Converter Layer (TwitchConverter, KickConverter, YouTubeConverter)

---

## Status

**Ready for implementation**

**Estimated Effort:** 2-3 hours
**Dependencies:** Daemon Server Core complete (workspace exists), pnpm configured
**Followed by:** Phase 2 - Platform-Specific Base Types
