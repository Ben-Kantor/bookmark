## File Structure

All content in the defined content directory will be exposed for requests, and all files and folders that do not begin with a . will be listed in the explorer panel on the client.
Markdown files will not display an extension in the explorer, non-markdown files will display their extension and will be proceeded by a Nerd Font icon as defined in iconMap.json.
The content directory should always contain a file called *.404.md*, to display to users when a 404 error occurs on any non-literal request.
For maximum usability, it is recommended to have no more than three layers of nested folders, and no more than 12 entries under any folder.
Files will be ordered according to their name, with names beginning in a capital coming first.

## Nerd Fonts

All nerd-font icons must be included in charList.txt in order to be included in the sliced nerd font.

## Markdown Files

By default, markdown files will have a page title and h1 header generated from the filename (capitalized automatically). If the file already has an h1 header, the content of that header will be used as the page title instead.
Markdown is processed according to the [GFM specification](https://github.github.com/gfm/).
