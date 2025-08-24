Embeds are the most powerful feature in bookmark, they allow a variety of types of content to be embedded in a markdown file. This page documents how to construct them and all the options that can be used to customize them.
 
## Construction

The recommended way to construct an embed is as follows:

!\[Filename.ext|option=value|option=value\]

The bang (!) at the start differentiates the embed from a [[Link]]. Then either single or double brackets surround either a filename or a path, with a filename. Paths may be absolute from the root of the content directory, or relative to their current directory. Extensions are optional in both cases.

If no extension is provided, markdown files will be preferred. If no path is given files closer to the root directory will be preferred. The behavior upon a tie may be unpredictable, so it is recommended to avoid files with duplicate names and extensions, or to use paths for all files.

## File Types

The accepted file types for embeds are the same as the file types which can be displayed in general, and will generally be formatted the same. Markdown content appears in an embed the same as if it was rendered in it's own page, with the exception that embeds in a markdown embed will not be processed.

### Web-Embeds

Embed links can also include an http url to a remote file to embed. The mime type of the file will be checked, and it will be displayed accordingly, with text/plain files without a .txt being assumed to be code and displayed as a single codeblock.

Videos hosted on youtube or vimeo have a special carve-out to embed in a properly formatted iframe if detected. 

Images, Video, and Audio will all be placed in an appropriate html element with a src attribute, HTML pages and PDFs will use an iframe.

`![https:\//youtu.be\/4XFdyQBPW5g?si=9CzYQM3Qh1hE3RGN|title="A Funny Video"|width=50%]`
![https://youtu.be/4XFdyQBPW5g?si=9CzYQM3Qh1hE3RGN|title="A Funny Video"|width=50%]
## Options

All options should be lowercase, separated by vertical bars. Each option can be valueless (notitle), have a single value (width=300px) or have a range of values seperated by a dash (pages=3-4). Some options are accepted in a singular and plural form, but both have equivalent meanings.

### Title

A title to be shown in the header above the embed, replacing the filename. It can be contained in quotes, but does not need to be, and can safely include spaces without quotes. It is best practice to always include a title, unless the exact filename is expected for a title.

**Example:**

``![Cargo.toml]``
![Cargo.toml]

If no title is provided, the embed will automatically use the filename or the URL as a fallback.

If the title is empty or the valueless property **notitle** is present, the embed will not display any title bar.

### Dimensions

You can control the width and height of an embed:

- **width**, **height** — accepts numeric values (interpreted as pixels) or strings including CSS units (`px`, `%`, `em`, `rem`, `vw`, `vh`).

**Examples:**

``![example.png|width=400|height=300]``
``![example.png|width=80%|height=50vh]``

You can also use shorthand to set the dimensions with |widthxheight.

``![example.png|400x300]``

This sets `width=400px` and `height=300px`.

### Pages

For PDFs, you can specify which pages to display:

- **page** or **pages** — a single page (`page=2`) or a range (`pages=2-5`) will embed only those pages.

**Example:**
``![manual.pdf|pages=3-7]``

### Lines

For text-based embeds (`.txt`, `.toml`, `.md`):

- **line** or **lines** — embed a specific line or a range of lines from the file.
- **numbered** — optionally add line numbers to the output.



**Example:**

``![Cargo.toml|numbered|lines=10-12]``
![Cargo.toml|numbered|lines=10-12]

This embeds lines 3 through 15 of `Cargo.toml` with line numbers displayed.

### Headers

For HTML or Markdown content, you can embed specific sections:

- **header** or **headers** — define a start header (`header=Introduction`) or a range (`headers=Start-End`).

**Example:**

``![guide.md|headers=Installation-Usage]``

This will embed the section from the "Installation" header up to right before the start of the "Usage" section.

If only one header is specified, content is embedded starting from before that header and going until right before the next header of the same size or larger.

### Styling

- **style** — custom inline CSS applied to the embed container.

**Example:**

``![chart.png|width=500px|height=400px|style="border:1px solid black;"]``