In order to decrease developer overhead, Bookmark has no dedicated build step, and instead performs most necessary build tasks when a server instance starts up. Because the server runs on the [Deno](https://deno.com/) runtime, only the client-side code needs to be transpiled and bundled. The only build task, therefore, is to assemble the final HTML page which will be sent to the client.

This process is handled by the *build.ts* file. Below, each step it performs is explained in detail.
## TypeScript Bundling

The first task is to process the client-side TypeScript code using the exceptionally fast [esbuild](https://esbuild.github.io/) bundler. The process begins with the *init-client.ts* file as its entry point. From there, esbuild follows all import statements and bundles the entire client-side application into a single, JavaScript file. The output is configured to target the `es2020` JavaScript standard for modern browser compatibility. For development, inline source maps can be enabled via `config.sourceMap` to simplify debugging, while in production, the code is minified if `config.minify` is set to `true`.

## CSS Processing

Next, all client-side CSS files are loaded and combined into a single stylesheet. The build script reads all files from ./client/styles and concatenates their contents. To aid debugging during development, a helpful comment header like "*/\* ====> styles.css <==== \*/*" is added before the content of each individual file. If minification is enabled in the server configuration, this combined CSS string is then processed by esbuild, which removes all unnecessary whitespace, comments, and characters to reduce its size.

## HTML Template Assembly

The html template file for delivery to the user is then assembled by loading *client.html*, and dynamically injecting the previously generated assets into it through placeholder replacement. Only one html file is used because bookmark is a single-page application.

The `<PLACEHOLDER-HEAD/>` placeholder is replaced with a block of essential tags and data. This includes a meta tag for the site description, a link to the external PhotoSwipe stylesheet for the image gallery, and the application's combined CSS, which is injected directly into a `<style>` tag to avoid an extra network request. Additionally, [Twind](https://twind.style/) scans the HTML for TailwindCSS classes and injects a second style tag containing the necessary just-in-time generated styles. Finally, the *vaultMap* and *fileTypeIcons* objects needed by the client in order to display the explorer are serialized as JSON and placed in a script tag to make them available to the client.

The second placeholder, `<PLACEHOLDER-JS/>`, located just before the closing `</body>` tag, is replaced with a `<script>` tag containing the transpiled JavaScript bundle generated in the first step.

As a final optimization, if minification is enabled, the complete HTML string is processed by [html-minifier-terser](https://github.com/terser/html-minifier-terser). This step further reduces the page size by collapsing whitespace and removing any remaining comments, making the file as lightweight as possible before it's sent to the user.
## Result

The output of this entire process is a single, self-contained HTML string stored in the `htmlTemplate` constant. When a user connects to the server, this template is sent with the `\$PLACEHOLDER-CONTENT` tag replaced with the content of the first requested page.
