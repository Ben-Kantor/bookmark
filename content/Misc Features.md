## Files
  1. If a file does not have an h1 header at the start, one is automatically inserted based on the file name.
  2. The first h1 header in a page is used as the tab title by the client.
  
## Codeblocks
  1. Language is detected first by checking the string immediately following the opening backtick, before the first newline character.
  2. If this is a shebang line, the language is set to the shebang line's interpreter.
  3. If this is not detected as a valid language, the language is auto-detected.

## Requests
  1. A request to /sitemap.md returns a human-readable markdown directory map of the site.
  2. A request to /sitemap.json returns the json vault map.
  3. A request to /site.zip creates a .zip archive of the content directory and returns that.
  