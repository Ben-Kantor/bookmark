# Build Process Documentation

Bookmark performs build tasks at server startup to decrease developer overhead. Since the server runs on [Deno](https://deno.com/), only client-side code needs transpilation and bundling. The *build.ts* file handles assembling the final HTML page and preparing assets.

## TypeScript Bundling

Deno's built-in bundler processes client-side TypeScript starting from *init-client.ts*. It follows imports and bundles everything into a single JavaScript IIFE targeting browsers. Source maps can be enabled via `config.sourceMap` for debugging, and minification via `config.minify` for production.

## Font Subsetting

FiraCode Nerd Font is fetched from CDN and subset using characters from `assets/charList.txt`. The font is subsetted, including only needed glyphs to reduce file size.

## CSS Processing

All CSS files from `./client/styles` are loaded and concatenated into a single stylesheet.

## HTML Template Assembly

The *client.html* template is loaded and assets are injected via placeholder replacement:

- `$PLACEHOLDER-HEAD`: Meta tags, combined CSS in a `<style>` tag.
- `$PLACEHOLDER-JS`: Transpiled JavaScript bundle in a `<script>` tag
- `$PLACEHOLDER-TITLE`: Configured site title, will be immediatly replaced by client-side code.
- `$PLACEHOLDER-EXPLORER`: Pre-built explorer HTML from vault map and icon mappings

If minification is enabled, [html-minifier-terser](https://github.com/terser/html-minifier-terser) processes the complete HTML add included CSS to collapse whitespace and remove comments.

## Result

Exports `htmlTemplate` (self-contained HTML template string) and `nerdFont` (subsetted font buffer).
