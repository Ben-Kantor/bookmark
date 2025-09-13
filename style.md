# Style Guide

## General Principles

- **File Size**: 100 lines maximum per file. Split into logical modules when exceeded.
- **Structure**: Key functions at top, utilities below.
- **Comments**: Only for confusing logic - explain *why*, not *what*.
- **Indentation**: 4 spaces consistently.
- **Dependencies**: Prefer `jsr:` imports, then `npm:` as fallback.

## TypeScript

### Syntax
- Eliminate semicolons and braces where language permits
- Use `const` for function definitions
- Skip brackets for single-statement blocks
- Pad inline `[ ]` and `{ }` but not `( )`
- Lines up to 100 characters acceptable when clear

### Types
- Explicit types for all variables and parameters
- Never use `any` - use specific annotations
- All functions must declare return types
- Use `!` for known-present DOM elements to avoid null checks

### Style
- Leverage destructuring, arrow functions, method chaining
- Favor functional over object-oriented patterns
- Use `globalThis` instead of `window`
- Remove dead code and unused imports

## CSS

### Organization
- Group related rules together
- Use CSS custom properties for theming
- Avoid nesting beyond 3 levels

### Formatting
- One selector per line for multiple selectors
- Space after colons, before opening braces
- Alphabetize properties within rules
- Use shorthand properties when possible

### Naming
- Use kebab-case for classes and IDs
- Semantic class names over presentation-based
- Prefix component-specific classes

## HTML

### Structure
- Semantic elements over generic `div`/`span`
- Proper ARIA attributes for accessibility
- `alt` attributes for all images
- Consistent indentation matching CSS/TS

### Attributes
- Boolean attributes without values
- Use `role` attributes for complex interactions
- Include `aria-label` for non-obvious controls
- Quote all attribute values

### Accessibility
- Logical heading hierarchy (h1→h2→h3)
- `aria-hidden="true"` for decorative elements
- Keyboard navigation support
- Screen reader friendly labels

## Code Quality

- Remove trailing whitespace and blank lines at EOF
- Single blank line between code sections
- Maintain existing patterns unless improvement is clear
- Test edge cases but don't over-engineer