## Files
If a file does not have an h1 header at the start, one is automatically inserted based on the file name.

The first h1 header in a page is used as the tab title by the client.
  
## Codeblocks
Language is detected first by checking the string immediately following the opening backtick, before the first newline character.

If this is a shebang line, the language is set to the shebang line's interpreter.

If this is not detected as a valid language, the language is auto-detected.

## Requests
A request to /sitemap.md returns a human-readable markdown directory map of the site.

A request to /sitemap.json returns the json vault map.

A request to /site.zip creates a .zip archive of the content directory and returns that.

## Memoization
The `memoize()` function takes as arguments a function and a maximum number of kilobytes to cache, and returns a memoized version.

This is used primarily for the expensive `loadFileToHTML` function, which means subsequent requests for the same file will be significantly quicker.