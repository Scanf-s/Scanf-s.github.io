# Portfolio Redesign — Design Spec

**Date:** 2026-06-19
**Repo:** `Scanf-s/Scanf-s.github.io` (GitHub user page, served at `https://scanf-s.github.io`)
**Goal:** Replace the current Jekyll/Chirpy blog with a minimal, typography-driven personal site that doubles as a portfolio/résumé, with a secondary blog. Inspired by https://www.utam0k.jp/en/page/about/.

## Decisions

| Topic | Decision |
|---|---|
| Primary purpose | Single-page portfolio/landing (main) + secondary blog |
| Stack | Astro (official blog starter as base, then heavily customized) |
| Visual style | Minimal, typography-centric; near monochrome; thin 0.5px dividers; monospace for meta/labels/code |
| Sections | About · Work/Experience · Projects · OSS · Skills · Blog · Contact |
| Language | English only |
| Existing blog posts | Start fresh — old 12 Chirpy posts archived to a `legacy` branch, not migrated |
| Domain | `scanf-s.github.io` (no custom domain; can attach later) |
| Theme | Light/dark toggle, persisted in localStorage, defaults to `prefers-color-scheme` |

## Architecture & File Layout

```
src/
├── pages/
│   ├── index.astro          # Landing: About·Work·Projects·OSS·Skills·Blog·Contact (one-page)
│   ├── blog/
│   │   ├── index.astro      # Post list (newest first)
│   │   └── [...slug].astro  # Individual post
│   └── rss.xml.js           # RSS feed
├── content/
│   ├── blog/                # Markdown posts (.md); per-post folder for co-located images
│   └── config.ts            # Content collection schema (title, date, description, tags, draft)
├── components/
│   ├── Section.astro        # Common wrapper for landing sections (label + content)
│   ├── ThemeToggle.astro    # Light/dark toggle
│   ├── ProjectCard.astro
│   ├── WorkItem.astro
│   └── ...
├── layouts/
│   ├── Base.astro           # head / nav / footer shell
│   └── BlogPost.astro
├── data/                    # Content separated from markup
│   ├── work.ts              # Experience entries
│   ├── projects.ts          # Project entries
│   └── skills.ts
├── assets/                  # Optimized images (profile, project thumbnails) — Astro <Image>
│   ├── profile.jpg
│   └── projects/
└── styles/
    └── global.css           # Design tokens (color, font, spacing) + theme variables
public/                      # Served as-is (no transform)
├── resume.pdf
├── favicon.svg
└── og-image.png
```

### Key principles
- **Landing is one-page scroll.** Sections flow top to bottom; top nav anchors jump to each section. No separate pages per section.
- **Content separated as data.** Work, projects, skills live as typed arrays in `data/*.ts`; components render them. Adding an entry means editing data, not markup.

### Media handling

| Kind | Location | Why |
|---|---|---|
| UI images (profile, thumbnails, logo) | `src/assets/` | Astro `<Image>` auto resize / WebP / lazy-load at build |
| Images inside a blog post | co-located with the post (`content/blog/<post>/img.png`) | managed with the post; relative path optimized by Astro |
| Downloadable files (résumé PDF, slides) | `public/` | served as original, linked at `/resume.pdf` |
| Video | `public/` or external (YouTube embed) | large media should be external, not in the repo |

Avoid committing large media (tens-of-MB video, high-res image dumps); use external hosting/CDN and let Astro compress `src/assets/` images.

## Landing Page Layout

Minimal, typography-led, single-page scroll (per the approved mockup):

- **Type hierarchy carries the design** — large name + monospace meta labels (`// software engineer`, uppercase section labels). Color used sparingly; rely on text, whitespace, thin 0.5px rules.
- **Sections divided by a thin horizontal rule** (utam0k-style label + flowing content). Cards used only where info density needs it.
- **About / hero** — monospace role line, large name, one-line tagline, short intro, profile photo, social icons.
- **Work** — two-column year ↔ role/description timeline.
- **Projects** — small card grid (name, one-line description, tech tags).
- **OSS** — list with PR icon; e.g. youki contributor + link to merged PRs.
- **Skills** — monospace chips.
- **Writing/Blog** — title ↔ date list (latest 3–5 on landing; full list at `/blog`).
- **Top nav** — name (logo) left; section anchor links + theme toggle right.
- **Footer** — GitHub / LinkedIn / Email icons + copyright.

## Blog

- **Astro Content Collections** — posts in `src/content/blog/*.md`; `config.ts` enforces frontmatter schema (title, date, description, tags, draft) as types, caught at build.
- `/blog` — post list (newest first: date + title + one-line description). Landing's Writing section pulls the most recent few.
- `/blog/[slug]` — individual post: markdown body + code-block syntax highlighting (Astro's built-in Shiki, light/dark aware) + optional table of contents.
- **RSS** (`/rss.xml`) via `@astrojs/rss` and **sitemap** via `@astrojs/sitemap`, auto-generated.
- **Authoring flow** — add one `.md` file → push → auto-deploy. Images co-located with the post.

## Style System

- **Design tokens** in `global.css` CSS variables (color, font, spacing) managed in one place. Light/dark toggled via a `data-theme` attribute.
  - Color: near black/white + neutral steps; no accent color, or at most one (e.g. link hover).
  - Fonts: body = system sans-serif (fast); labels/code/meta = monospace (e.g. JetBrains Mono or system mono). Body serif optional — default to sans.
  - Theme toggle persisted in localStorage; default from `prefers-color-scheme`.

## Deployment

- `.github/workflows/deploy.yml` — on push, Astro build → GitHub Pages deploy (official `withastro/action`).
- Migration safety: back up current Chirpy site to a `legacy` branch, then replace `main` with the new site.
- `astro.config.mjs` — `site: 'https://scanf-s.github.io'`. User page, so `base` is root (simple).

## Quality Baseline

- Semantic HTML, meta tags + OG image (social share preview), responsive (mobile), Lighthouse 100 target.

## Out of Scope (YAGNI)

- Migrating old blog posts.
- Bilingual (KO/EN) content.
- Comments, guestbook, or any dynamic/server features.
- Custom domain (can be attached later without rework).
