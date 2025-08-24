## Options

The configuration is stored in the *constants.ts* file, below each option is explained.


- **port** - Port to host the server on.
- **minify** - Whether to minify html, js, and css sent to the client.
- **sourceMap** - Whether to include source maps to allow debugging typescript on the client.

### Paths

 Both the **whitelist** and **renderOverrides** options allow the use of \* in paths to indicate any file or folder name, and \*\* to indicate any file or folder names including sub folders. Both work best with relative paths.

**Examples:**
	"./assets/\*.\*" - Anything in the assets folder
	"./assets/\*\*.\*" - Anything in the assets folder or any sub-directory
	"./\*.html" - All html files

- **contentDir** - The folder to expose and to use as a root for most relative paths.
- **whitelist** - An array of paths (relative to the project root directory) to expose, for server assets such as libraries, icons, and fonts. All such requests are automatically literal.
- **indexFile** - The path (relative to the contentDir) to the index file
- **title**, **description** - Descriptor values to be used in site meta tags.

### Render Overrides

This section contains an object of key-value pairs, where each key is a rendering type, as seen in the list below. Each array of paths contains relative paths from the root of the content directory. This allows you to, for instance, force an html file which would otherwise be embedded in an iframe to be shown as code, embedded raw, or listed as a download link.

Here are all currently accepted media types: `markdown`, `plaintext`, `codeblock`, `pdf`, `image`, `video`, `audio`, `literal`, `iframe`, `download`.

If a matching override is not found, the type will be determined automatically.