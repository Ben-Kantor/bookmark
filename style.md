# Style Guide

## Code Structure and Organization

Files should prioritize key functions at the top, with supporting utilities placed below. Files exceeding 250 lines must be split into appropriately named modules to maintain readability and modularity.

## Formatting and Whitespace

Use double indentation (4 spaces) consistently throughout all code. Remove all trailing spaces and unnecessary punctuation. Only include blank lines between codeblocks, or to split up sections of many statements in a row.

Avoid nesting beyond three levels of indentation where possible to prevent complexity buildup.

## Syntax Preferences

Eliminate semicolons and braces where possible in typescript. Use `const` for all function definitions to emphasize immutability.

Skip brackets in single-statement code blocks. Pad inline square and curly brackets but not parantheses with spaces for improved readability.

Long inline expressions up to 100 characters are acceptable when functionality remains clear or when preceded by explanatory comments.

## Language Features

Leverage destructuring, anonymous functions, and method chaining when they enhance rather than hinder readability. Method chaining should be indented to align with preceding code.

Adopt functional programming paradigms over object-oriented approaches where convenient and appropriate.

Replace `window` references with `globalThis` for broader compatibility.

## Type Safety

Define explicit types for all variables and function parameters. Completely avoid the `any` type in favor of specific type annotations.

All functions must declare return types explicitly to maintain type safety and code documentation.

Edge cases where a key html element is not found can be ignored, so assuring their presesence with a ! in the definitions is reccomended.

## Comments and Documentation

Reserve comments exclusively for non-self-explanatory code sections. Well-written code should communicate intent through clear naming and structure rather than extensive commentary.

## Code Quality

Remove all dead code and unused imports. Replace fragile implementations with robust alternatives when the replacement maintains similar complexity and avoids additional unofficial module dependencies.

Maintain existing code flow and methods unless modifications are specifically justified by the guidelines above.

## Imports and Dependencies

Prioritize jsr: module imports, followed by npm: as secondary preference. This ensures compatibility with Deno's ecosystem and reduces external dependencies.

## Spacing Conventions

Follow commas with single spaces. Maintain consistent spacing around operators and delimiters for uniform appearance.

Keep modifications to existing functionality minimal except when explicitly required by robustness or readability improvements.
