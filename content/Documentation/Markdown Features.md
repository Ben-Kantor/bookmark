
This document aims to test and showcase many of the markdown features available through marked.js

---

## Headings

# Heading 1
## Heading 2
### Heading 3
#### Heading 4
##### Heading 5
###### Heading 6

## Paragraphs & Line Breaks

This is a paragraph. It contains several sentences and demonstrates how text flows within a block.
It can also contain multiple lines that are still part of the same paragraph if there isn't an empty line in between.

This is another paragraph.

This is a paragraph with a soft line break here >
< It will render as a single line.

This is a paragraph ending in two spaces for a hard line break.
This line should appear directly below the first one.
## Emphasis

*This text is emphasized with asterisks (italics).*
_This text is emphasized with underscores (italics)._

**This text is strongly emphasized with double asterisks (bold).**
__This text is strongly emphasized with double underscores (bold).__

***This text is both strongly emphasized and emphasized with tripe asterisks (bold italics).***
___This text is both strongly emphasized and emphasized with tripe underscores (bold italics).___

**_This text is emphasized with underscores inside double asterisks. (bold italics in italic color)._**
## Links

This wikilink connects to the readme [[Readme]]. `[[Readme]]`

This wikilink connects to a header on this page: [[#Lists]]. `[[#Lists]]`

## Lists

### Unordered Lists

* Item 1
* Item 2
    * Nested Item 2.1
    * Nested Item 2.2
        * Deeply Nested Item 2.2.1
* Item 3

- Another way to make unordered lists
- Using hyphens
    - Nested hyphen item

+ Yet another way
+ Using plus signs
    + Nested plus item

### Ordered Lists

1. First item
2. Second item
    1. Nested ordered item 2.1
    2. Nested ordered item 2.2
3. Third item

4. Ordered list starting with 1
5. The numbers don't have to be consecutive, CommonMark renders them sequentially starting from the first number.
6. This will still be the third item.

### Task Lists

- [x] This is a completed task.
- [ ] This is an uncompleted task.
    - [x] Nested completed task.
    - [ ] Nested uncompleted task.
## Images
Images and other media can be embedded by putting a local or remote link inside square brackets, preceded by an exclamation mark. More information can be found in the page on [[Embeds]].

`![https://upload.wikimedia.org/wikipedia/commons/b/b6/Felis_catus-cat_on_snow.jpg]`

![https://upload.wikimedia.org/wikipedia/commons/b/b6/Felis_catus-cat_on_snow.jpg]

## Code

### Inline Code

This is `inline code`. You can put `variables` or `function_names()` here.

### Code Blocks (Fenced)

```plaintext
This is a plaintext codeblock.
Here is what it's definition looks like:

\`\`\`plaintext
This is a plaintext codeblock.
\`\`\`

The triple backtick was escaped by preceding each by a backslash (\\`\\`\\`)
```

```javascript
const greet = (name) => {
  console.log(`Hello, ${name}!`);
}

const data = {
  id: 1,
  value: "test"
};
```

### Code Blocks (Indented)

    This is an indented code block.
    It uses four spaces or a tab for indentation.
    Another line of code.

## Tables

| Header 1 | Header 2 | Header 3 |
| :------- | :------: | -------: |
| Left     | Center   | Right    |
| Cell 1   | Cell 2   | Cell 3   |
| Long text | Short | Another long text |



|  |  |
| :------- | :------: |
| This Table Has | an Empty Header |

## Escaping Characters

To display characters that have special meaning,1 you can escape them with a backslash.

\* Not an italic \*
\_ Not an italic \_
\` Not inline code \`
\[ Not a link \[
\< Not a tag \>
\\ A backslash \\
\# Not a heading \#
\+ Not a list item \+
\- Not a list item \-
\. Not an ordered list item \.
\! Not an image \!
\| Not a table \|

## Raw HTML

Bookmark allows raw HTML without sanitization, this gives great power in creating embedded content, but does pose a danger, so it is recommended to avoid hosting non-trusted markdown.

This is a paragraph with <span>inline HTML</span>.

<div style="border: 1px solid blue; padding: 10px; margin-top: 20px;">
  <h3>HTML Block Example</h3>
  <p>This is content inside an HTML div block.</p>
  <ul>
    <li>Item one</li>
    <li>Item two</li>
  </ul>
</div>

## Footnotes

[^1]: This is a footnote content.

Here is a simple footnote[^1]. With some additional text after it[^@#$%] and without disrupting the blocks[^bignote].


Footnotes are invoked with `[^label]`, the label must be unique, but can be a number, character or word.
A footnote definition is created by starting a line with the same identifier,
and all footnote definitions are moved to the end of the page in their own section.1

[^bignote]: The first paragraph of the definition.

    Paragraph two of the definition.

    > A blockquote with
    > multiple lines.

    ~~~
    a code block
    ~~~

    | Header 1 | Header 2 |
    | -------- | -------- |
    | Cell 1   | Cell 2   |

    A \`final\` paragraph before list.

    - Item 1
    - Item 2
      - Subitem 1
      - Subitem 2

[^@#$%]: A footnote on the label: "@#$%".
