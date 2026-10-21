# Field Data Lab

Behavioral science, tested on the playing field. Live at <https://fielddatalab.github.io>.

Built with [Quarto](https://quarto.org). Pushing to `main` publishes the site through GitHub Actions.

## Write an article

1. Create a folder in `posts/`, e.g. `posts/2026-11-02-penalty-kicks/`, with an `index.qmd` inside.
   Copy the front matter from `posts/2026-10-18-par-reference-point/index.qmd`:
   `title`, `date`, `sport`, `categories` (the tags), `keywords`, `abstract`, and optionally `article-id` and `bibliography`.
2. Preview while you write:
   ```sh
   QUARTO_PYTHON=.venv/bin/python quarto preview
   ```
   Drafts (`draft: true`) show up in preview but are left out of the published site.
3. When it's ready, remove `draft: true`, render once so code results are saved to `_freeze/`, then commit and push:
   ```sh
   QUARTO_PYTHON=.venv/bin/python quarto render
   git add -A && git commit -m "Add article: …" && git push
   ```

Python packages for analysis: `uv add <package>`.

## Where things live

| File | What it does |
|---|---|
| `index.qmd`, `_listing.ejs`, `assets/listing.js` | Contents page: search, sport/tag/month filters, 10 articles per page |
| `assets/fdl.css` | All styling (colors, fonts, light and dark) |
| `posts/_metadata.yml` | Settings shared by every article: author, citation, table of contents, giscus comments |
| `about.qmd`, `data.qmd` | About and Data & code pages |
