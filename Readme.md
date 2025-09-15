# Bookmark

Bookmark is a dynamic markdown webserver, that serves repositories of markdown and media content as a polished, navigable single-page website. It has an extensive media embed and link system, and preserves embedded html. It has full compatibility with [Github-Flavored Markdown](https://github.github.com/gfm/) and [Obsidian Vaults](https://help.obsidian.md/links). It's designed with a focus on speed and developer experience.

## Features

### Core Functionality

-   Real-time markdown processing with GitHub Flavored Markdown support
-   Support for `[[wikilinks]]` and `[markdown](links)` with automatic resolution
-   Interactive navigation sidebar with folder expansion/collapse and active file highlighting
-   A single-page application frontend with Turbolinks
-   Table of contents generated from document headers with collapsible sections
-   A user palette with file search, configuration, and commands (opened with Escape)
-   Automatic file discovery by prefix matching, index file detection, and directory navigation
-   File type icons and buttons icons using Nerd Fonts
-   Full accessibility with Aria tags.

### Navigation & Interface

-   Full keyboard control with arrow keys and vim keys
-   Adjustable explorer and contents panel widths with drag handles and click-to-collapse
-   Dark/light mode toggle with high contrast accessibility option and persistence
-   Adaptive touch-friendly interface with swipe gestures for panel control
-   Click-to-copy any header to clipboard
-   Clean URLs with proper history handling and anchor scrolling

### Rich Content & Embeds

-   Support for `![[filename]]` embeds with extensive configuration options
-   Configurable dimensions, page ranges, line ranges, headers, titles, and CSS styling
-   Native handling of markdown, HTML, PDF, images, video, audio, and plaintext
-   YouTube, Vimeo, and arbitrary HTTP content embedding, including code files and markdown
-   PhotoSwipe lightbox integration with zoom, pan, and gallery navigation
-   Comprehensive code block rendering with highlight.js and language auto-detection
-   Embeds can target a particular range of a file by headers or line numbers
-   Automatic fallback to a download UI for binary content
-   Configurable file type overrides via glob patterns and extension mapping

### Developer Experience

-   Fully typed frontend and backend with ES2020+ deno features
-   Zero-config TypeScript execution with built-in tooling and web standards
-   Intelligent memoization with size-based LRU eviction and memoization
-   Comprehensive error catching with user-friendly fallbacks and developer warnings
-   Lazy loading, efficient DOM updates, and minimal re-rendering

## Installation

1.  **Clone the repository:**
  ```bash
  git clone https://github.com/Ben-Kantor/bookmark
  cd bookmark
  ```

2.  **Install Deno:**
  Run this command: `curl -fsSL https://deno.land/install.sh | sh`

  Follow the instructions on the [official Deno website](https://docs.deno.com/runtime/getting_started/installation/).

3.  **Add your content:**
  Move your content directly into the `./content` directory.
  Avoid more than three levels of folders, and files with duplicated names.
  Make sure you have a `.404.md` and `index.md` file.

4.  **Configure the server:**
  Edit the `constants.ts` file to change the title, description, and paths as needed.

## Usage

-   **Start the server:**
    ```bash
    deno run serve
    ```

-   **Update the server and packages:** *(May require merge conflict resolution.)*
    ```bash
    deno run update
    ```

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## License

This project is licensed under the MIT License.
