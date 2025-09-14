# Build Process Documentation

Bookmark performs build tasks at server startup to decrease developer overhead. Since the server runs on [Deno](https://deno.com/), only client-side code needs transpilation and bundling. The *build.ts* file handles assembling the final HTML page and preparing assets.

## TypeScript Bundling

Deno's built-in bundler processes client-side TypeScript starting from *init-client.ts*. It follows imports and bundles everything into a single JavaScript IIFE targeting browsers. Source maps can be enabled via `config.sourceMap` for debugging, and minification via `config.minify` for production.

## Font Subsetting

FiraCode Nerd Font is fetched from CDN and subset using characters from `assets/charList.txt`. The font is converted to WOFF2 format, including only needed glyphs to reduce file size.

## CSS Processing

All CSS files from `./client/styles` are loaded and concatenated into a single stylesheet with newline separators.

## HTML Template Assembly

The *client.html* template is loaded and assets are injected via placeholder replacement:

- `$PLACEHOLDER-HEAD`: Meta tags, PhotoSwipe stylesheet link, combined CSS in a `<style>` tag, and serialized config in a `<script>` tag
- `$PLACEHOLDER-JS`: Transpiled JavaScript bundle in a `<script>` tag
- `$PLACEHOLDER-TITLE`: Configured site title
- `$PLACEHOLDER-EXPLORER`: Pre-built explorer HTML from vault map and icon mappings

If minification is enabled, [html-minifier-terser](https://github.com/terser/html-minifier-terser) processes the complete HTML to collapse whitespace and remove comments.

## Concurrent Processing

Tasks run in parallel using Promises: bundling, font processing, CSS/HTML/icon loading. Final assembly waits for required dependencies.

## Result

Exports `htmlTemplate` (self-contained HTML string) and `nerdFont` (subsetted font buffer). The template can be customized with page-specific content before delivery.
