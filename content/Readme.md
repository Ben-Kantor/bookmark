# Bookmark

Bookmark is a dynamic markdown webserver, that serves repositories of markdown and media content as a polished, navigable website. It has an extensive media embed and link system, and preserves embedded html. It has full compatibility with [Github-Flavored Markdown](https://github.github.com/gfm/) and [Obsidian Vaults](https://help.obsidian.md/links).

## Installation

First, clone the repository and enter it
	`git clone https://github.com/Ben-Kantor/bookmark`
	`cd bookmark`

Then [Install Deno](https://docs.deno.com/runtime/getting_started/installation/)

Clear the ./Content/Directory and re-add key files
	`rm -rf ./content/*`
	`touch .404.md index.md`

Run once to setup dependencies
	`deno run dev`

Move your content vault directly into `./content`
	Put the contents directly within the content directory, not in a subdirectory
	Avoid more than three levels of folders, and files with duplicated names
	Make sure you have a `.404.md` and `index.md` file
 
Configure the server in `constants.ts`
	Change the title, description, and paths as needed

Grant access to esbuild.
	On first startup, it will request read and run access to the esbuild binary, this can then be added to your deno.json start command with their paths on your system e.g.
	`--allow-read/home/bantor/.cache/esbuild/bin/@esbuild-linux-x64@0.21.4`
	`--allow-run=/home/bkantor/.cache/esbuild/bin/@esbuild-linux-x64@0.21.4`

Run with `deno run start`
	Setup a systemd task or equivalent to keep the server running
	
Updating
	To update to the latest github version, simply run deno run update and resolve any conflicts with changes you've made

Customizing Branding
	Modifying the branding will involve changing the source paths from the client and modifying client.html and the css files, remember that paths beginning in /!!/ lead to the assets directory. 
## Features

### Core Functionality

- Real-time markdown processing with GitHub Flavored Markdown support
- Support for `[[wikilinks]]` and `[markdown](links)` with automatic resolution
- Interactive navigation sidebar with folder expansion/collapse and active file highlighting
- A single-page application frontend with Turbolinks / PJAX
- Table of contents generated from document headers with collapsible sections
- A user palette with file search, configuration, and commands (opened with ALT)
- Automatic file discovery by prefix matching, index file detection, and directory navigation
- File type icons and buttons icons using Nerd Fonts

### Navigation & Interface

- Full keyboard control with arrow keys and vim keys
- Adjustable explorer and contents panel widths with drag handles and click-to-collapse
- Dark/light mode toggle with high contrast accessibility option and persistence
- Touch-friendly interface with swipe gestures for panel control
- Click any header to copy its anchor link to clipboard
- Clean URLs with proper history handling and anchor scrolling

### Rich Content & Embeds

- Support for `![[filename]]` embeds with extensive configuration options
- Configurable dimensions, page ranges, line ranges, headers, titles, and CSS styling
- Native handling of markdown, HTML, PDF, images, video, audio, and plaintext
- YouTube, Vimeo, and arbitrary HTTP content embedding, including code files and markdown
- PhotoSwipe lightbox integration with zoom, pan, and gallery navigation
- Comprehensive code block rendering with highlight.js and language auto-detection
- Embeds can target a particular range of a file by headers or line numbers
- Automatic fallback to a download UI for binary content
- Configurable file type overrides via glob patterns and extension mapping

### Developer Experience

- Fully typed frontend and backend with ES2020+ deno features
- Zero-config TypeScript execution with built-in tooling and web standards
- ESBuild integration with optional minification, source maps, and CSS processing
- Intelligent memoization with size-based LRU eviction and memoization
- Comprehensive error catching with user-friendly fallbacks and developer warnings
- Lazy loading, efficient DOM updates, and minimal re-rendering