import { resolve } from "https://deno.land/std@0.224.0/path/resolve.ts"
import { SiteConfig } from "./types.ts"


export const config: SiteConfig = {
  port: 8000,
  minify: true,
  sourceMap: false,
  paths: {
    contentDir: "./",
    whitelist: ["./assets/*.*"],
    indexFile: "./index.md"
  },

  title: "Bookmark",
  description: "A dynamic markdown webserver and file explorer",

  renderOverrides: {
    "iframe": [],
    "codeblock": ["./**/*.html"]
  }
}

export const PORT: number =
  parseInt(Deno.env.get("PORT") ?? config.port.toString())

export const contentDir: string =
  resolve(config.paths.contentDir)