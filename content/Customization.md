# Customization

This page contains various potential needs to modify Bookmark, and an explanation of how to accomplish each of them.
## Expose a Simulated Entry in the Explorer

If you want to make a dynamically generated file e.g. sitemap.md, sitemap.json, site.zip appear in the explorer, you can create an empty file with that name.

## Create a Page Without Sidebars

To hide the sidebars, including the file explorer and table of contents, add the following code block to the top of your markdown page:

```
<style>#explorer,#toc-panel{width:0!important;padding:0!important;visibility:hidden!important;overflow:hidden!important;transition:none!important}#explorer-handle,#toc-handle{display:none!important}</style>
```

**Important:** When you hide the sidebars, users won't be able to navigate away using the explorer. Make sure you add links or other navigation elements to the page so they don't get stuck.

## Center Text
Text can be centered using inline css, as seen below:

`<p style="text-align: center;">This text will be centered.</p>`
<p style="text-align: center;">This text will be centered.</p>