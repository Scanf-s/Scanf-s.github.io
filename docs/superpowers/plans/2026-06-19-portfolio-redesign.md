# Portfolio Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Jekyll/Chirpy blog at `Scanf-s.github.io` with a minimal, typography-driven Astro site that is primarily a one-page portfolio with a secondary blog.

**Architecture:** Astro static site. A single landing page (`/`) renders portfolio sections from typed data modules; a secondary blog uses Astro Content Collections with build-time schema validation. Design is driven by CSS-variable design tokens with a light/dark theme toggle. Deployed to GitHub Pages via GitHub Actions.

**Tech Stack:** Astro 5, TypeScript, Vitest (unit tests for data/schema/util), `@astrojs/rss`, `@astrojs/sitemap`, GitHub Actions (`withastro/action`).

## Global Constraints

- Node 20+ required (local env is v25; CI pins Node 20).
- Site URL: `https://scanf-s.github.io`; it is a GitHub **user page**, so `base` is `/` (root).
- All site copy is in **English only**.
- Visual style: minimal, near-monochrome, thin `0.5px` dividers, monospace for meta/labels/code. No accent color beyond at most one link-hover color.
- Every color must be a CSS variable that resolves correctly in both light and dark themes.
- Work on branch `redesign-astro`. Do **not** touch `main` until the final task. The Chirpy site must be backed up to a `legacy` branch before any deletion.
- Commit frequently — one commit per completed task minimum.

---

### Task 1: Back up Chirpy, scaffold a clean Astro project

**Files:**
- Create: `package.json`, `astro.config.mjs`, `tsconfig.json`, `.gitignore`, `src/pages/index.astro` (temporary smoke page)
- Delete: all Jekyll/Chirpy files (`_config.yml`, `Gemfile`, `_posts/`, `_tabs/`, `_site/`, `index.html`, `404.html`, `assets/`, `README.md`)

**Interfaces:**
- Produces: a buildable Astro project at the repo root; `npm run dev`, `npm run build`, `npm run check` scripts.

- [ ] **Step 1: Back up the current site to a `legacy` branch and push it**

```bash
cd /Users/uijong/Development/Scanf-s.github.io
git branch legacy main
git push -u origin legacy
```

Expected: `legacy` branch created from `main` and pushed. This preserves all 12 Chirpy posts and the old site.

- [ ] **Step 2: Remove all Chirpy/Jekyll files (keep `.git`, `.github` for now, and `docs/`)**

```bash
git rm -r --quiet _posts _tabs _config.yml Gemfile index.html 404.html assets .gitignore README.md
rm -rf _site .DS_Store
```

Expected: working tree contains only `.git/`, `.github/`, and `docs/`.

- [ ] **Step 3: Create `package.json`**

```json
{
  "name": "scanf-s-portfolio",
  "type": "module",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "check": "astro check",
    "test": "vitest run"
  },
  "dependencies": {
    "astro": "^5.0.0",
    "@astrojs/rss": "^4.0.0",
    "@astrojs/sitemap": "^3.0.0"
  },
  "devDependencies": {
    "@astrojs/check": "^0.9.0",
    "typescript": "^5.6.0",
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 4: Create `astro.config.mjs`**

```js
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://scanf-s.github.io',
  integrations: [sitemap()],
});
```

- [ ] **Step 5: Create `tsconfig.json`**

```json
{
  "extends": "astro/tsconfigs/strict",
  "include": [".astro/types.d.ts", "**/*"],
  "exclude": ["dist"]
}
```

- [ ] **Step 6: Create `.gitignore`**

```
dist/
node_modules/
.astro/
.DS_Store
*.log
```

- [ ] **Step 7: Create a temporary smoke page `src/pages/index.astro`**

```astro
---
---
<html lang="en">
  <head><meta charset="utf-8" /><title>scaffold ok</title></head>
  <body><h1>scaffold ok</h1></body>
</html>
```

- [ ] **Step 8: Install dependencies and build to verify the scaffold**

Run: `npm install && npm run build`
Expected: install succeeds; build prints `Complete!` and writes `dist/index.html`. No errors.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "chore: remove Chirpy, scaffold Astro project"
```

---

### Task 2: Design tokens, Base layout, theme toggle, nav, footer

**Files:**
- Create: `src/styles/global.css`, `src/layouts/Base.astro`, `src/components/Nav.astro`, `src/components/Footer.astro`, `src/components/ThemeToggle.astro`
- Modify: `src/pages/index.astro` (use Base layout)

**Interfaces:**
- Produces:
  - `Base.astro` — props `{ title: string; description: string }`; renders `<html>`, `<head>` (meta + global.css import), `<Nav />`, a `<slot />`, `<Footer />`. Sets the no-flash theme script in `<head>`.
  - CSS variables in `global.css`: `--bg`, `--bg-subtle`, `--text`, `--text-muted`, `--text-faint`, `--rule`, `--link-hover`, `--font-sans`, `--font-mono`, `--maxw` (content max-width). Theming switched by `:root` vs `:root[data-theme="dark"]`.

- [ ] **Step 1: Create `src/styles/global.css` with design tokens and base element styles**

```css
:root {
  --bg: #ffffff;
  --bg-subtle: #f6f6f4;
  --text: #1a1a1a;
  --text-muted: #595959;
  --text-faint: #8a8a8a;
  --rule: rgba(0, 0, 0, 0.1);
  --link-hover: #0066cc;
  --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  --font-mono: ui-monospace, "JetBrains Mono", "SF Mono", Menlo, Consolas, monospace;
  --maxw: 640px;
}
:root[data-theme="dark"] {
  --bg: #111111;
  --bg-subtle: #1b1b1b;
  --text: #e8e8e8;
  --text-muted: #a0a0a0;
  --text-faint: #6e6e6e;
  --rule: rgba(255, 255, 255, 0.12);
  --link-hover: #6fb3ff;
}
* { box-sizing: border-box; }
html { scroll-behavior: smooth; }
body {
  margin: 0;
  background: var(--bg);
  color: var(--text);
  font-family: var(--font-sans);
  font-size: 16px;
  line-height: 1.7;
  -webkit-font-smoothing: antialiased;
}
a { color: inherit; text-decoration: none; }
a:hover { color: var(--link-hover); }
.wrap { max-width: var(--maxw); margin: 0 auto; padding: 0 24px; }
.mono { font-family: var(--font-mono); }
.section-label {
  font-family: var(--font-mono);
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-faint);
  margin: 0 0 16px;
}
```

- [ ] **Step 2: Create `src/components/ThemeToggle.astro`**

```astro
<button id="theme-toggle" aria-label="Toggle color theme" class="mono">
  <span data-theme-icon>theme</span>
</button>
<style>
  #theme-toggle {
    background: none; border: none; cursor: pointer;
    font-family: var(--font-mono); font-size: 13px; color: var(--text-muted); padding: 0;
  }
  #theme-toggle:hover { color: var(--link-hover); }
</style>
<script is:inline>
  (() => {
    const btn = document.getElementById('theme-toggle');
    const label = () => {
      const t = document.documentElement.getAttribute('data-theme') || 'light';
      btn.querySelector('[data-theme-icon]').textContent = t === 'dark' ? 'light' : 'dark';
    };
    label();
    btn.addEventListener('click', () => {
      const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('theme', next);
      label();
    });
  })();
</script>
```

- [ ] **Step 3: Create `src/components/Nav.astro`**

```astro
---
import ThemeToggle from './ThemeToggle.astro';
const links = [
  { href: '/#about', label: 'About' },
  { href: '/#work', label: 'Work' },
  { href: '/#projects', label: 'Projects' },
  { href: '/#oss', label: 'OSS' },
  { href: '/blog', label: 'Blog' },
];
---
<nav>
  <div class="wrap nav-inner">
    <a href="/" class="mono brand">uijong</a>
    <div class="nav-right">
      {links.map((l) => <a href={l.href} class="nav-link">{l.label}</a>)}
      <ThemeToggle />
    </div>
  </div>
</nav>
<style>
  nav { border-bottom: 0.5px solid var(--rule); position: sticky; top: 0; background: var(--bg); z-index: 10; }
  .nav-inner { display: flex; align-items: center; justify-content: space-between; height: 52px; }
  .brand { font-size: 14px; font-weight: 500; }
  .nav-right { display: flex; align-items: center; gap: 16px; }
  .nav-link { font-size: 13px; color: var(--text-muted); }
  @media (max-width: 480px) { .nav-link { display: none; } }
</style>
```

- [ ] **Step 4: Create `src/components/Footer.astro`**

```astro
---
const year = new Date().getFullYear();
const socials = [
  { href: 'https://github.com/Scanf-s', label: 'GitHub' },
  { href: 'https://www.linkedin.com/', label: 'LinkedIn' },
  { href: 'mailto:ssu.uijong@gmail.com', label: 'Email' },
];
---
<footer>
  <div class="wrap foot-inner">
    <div class="foot-links">
      {socials.map((s) => <a href={s.href} class="mono">{s.label}</a>)}
    </div>
    <span class="mono copy">© {year} Uijong</span>
  </div>
</footer>
<style>
  footer { border-top: 0.5px solid var(--rule); margin-top: 64px; padding: 28px 0; }
  .foot-inner { display: flex; justify-content: space-between; align-items: center; }
  .foot-links { display: flex; gap: 16px; }
  .foot-links a, .copy { font-size: 13px; color: var(--text-muted); }
</style>
```

- [ ] **Step 5: Create `src/layouts/Base.astro`**

```astro
---
import '../styles/global.css';
import Nav from '../components/Nav.astro';
import Footer from '../components/Footer.astro';
interface Props { title: string; description: string; }
const { title, description } = Astro.props;
---
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{title}</title>
    <meta name="description" content={description} />
    <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
    <script is:inline>
      (() => {
        const stored = localStorage.getItem('theme');
        const theme = stored || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
        document.documentElement.setAttribute('data-theme', theme);
      })();
    </script>
  </head>
  <body>
    <Nav />
    <main class="wrap"><slot /></main>
    <Footer />
  </body>
</html>
```

- [ ] **Step 6: Update `src/pages/index.astro` to use Base layout**

```astro
---
import Base from '../layouts/Base.astro';
---
<Base title="Uijong" description="Software engineer working on low-level systems and open source.">
  <p style="padding: 40px 0;">Landing page coming soon.</p>
</Base>
```

- [ ] **Step 7: Build and type-check**

Run: `npm run build && npm run check`
Expected: build `Complete!`, `astro check` reports `0 errors`.

- [ ] **Step 8: Visually verify theme toggle in dev**

Run: `npm run dev` then open the printed localhost URL. Click the theme toggle; confirm light↔dark switches and persists across reload. Stop the dev server.
Expected: theme switches, no flash of wrong theme on reload.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: design tokens, base layout, nav, footer, theme toggle"
```

---

### Task 3: Blog content collection, schema, sort util, tests, seed post

**Files:**
- Create: `src/content.config.ts`, `src/lib/posts.ts`, `src/lib/posts.test.ts`, `vitest.config.ts`, `src/content/blog/hello-world.md`

**Interfaces:**
- Produces:
  - Collection `blog` with schema `{ title: string; description: string; pubDate: Date; tags: string[]; draft: boolean }`.
  - `sortByDateDesc(posts)` — sorts an array of objects shaped `{ data: { pubDate: Date } }` newest-first, returns a new array.
  - `publishedPosts(posts)` — filters out `data.draft === true`, then sorts newest-first.
- Consumes (later tasks): `getCollection('blog')` from `astro:content`.

- [ ] **Step 1: Create `src/content.config.ts`**

```ts
import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

export const collections = { blog };
```

- [ ] **Step 2: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
});
```

- [ ] **Step 3: Write the failing test `src/lib/posts.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { sortByDateDesc, publishedPosts } from './posts';

const make = (title: string, iso: string, draft = false) => ({
  data: { pubDate: new Date(iso), draft, title },
});

describe('sortByDateDesc', () => {
  it('orders newest first', () => {
    const out = sortByDateDesc([make('a', '2024-01-01'), make('b', '2026-05-01')]);
    expect(out.map((p) => p.data.title)).toEqual(['b', 'a']);
  });
  it('does not mutate the input array', () => {
    const input = [make('a', '2024-01-01'), make('b', '2026-05-01')];
    sortByDateDesc(input);
    expect(input[0].data.title).toBe('a');
  });
});

describe('publishedPosts', () => {
  it('drops drafts and sorts newest first', () => {
    const out = publishedPosts([
      make('draft', '2026-06-01', true),
      make('old', '2024-01-01'),
      make('new', '2026-05-01'),
    ]);
    expect(out.map((p) => p.data.title)).toEqual(['new', 'old']);
  });
});
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `npx vitest run src/lib/posts.test.ts`
Expected: FAIL — cannot resolve `./posts` (module not found).

- [ ] **Step 5: Write minimal implementation `src/lib/posts.ts`**

```ts
type DatedEntry = { data: { pubDate: Date; draft?: boolean } };

export function sortByDateDesc<T extends DatedEntry>(posts: T[]): T[] {
  return [...posts].sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());
}

export function publishedPosts<T extends DatedEntry>(posts: T[]): T[] {
  return sortByDateDesc(posts.filter((p) => !p.data.draft));
}
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npx vitest run src/lib/posts.test.ts`
Expected: PASS — all 4 tests green.

- [ ] **Step 7: Create a seed post `src/content/blog/hello-world.md`**

```markdown
---
title: "Hello, world"
description: "First post on the new site."
pubDate: 2026-06-19
tags: ["meta"]
---

This is the first post on the rebuilt site. Code highlighting works out of the box:

\```rust
fn main() {
    println!("hello from youki land");
}
\```
```

(Note: remove the backslashes before the triple backticks when creating the file — they are escaped here only to keep this plan's code fence intact.)

- [ ] **Step 8: Build to verify schema accepts the seed post**

Run: `npm run build`
Expected: build `Complete!`, no content-collection schema errors.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: blog content collection, post sort util with tests, seed post"
```

---

### Task 4: Blog list page, post page, RSS feed

**Files:**
- Create: `src/layouts/BlogPost.astro`, `src/pages/blog/index.astro`, `src/pages/blog/[...slug].astro`, `src/pages/rss.xml.js`

**Interfaces:**
- Consumes: `getCollection('blog')`, `render` from `astro:content`; `publishedPosts` from `src/lib/posts.ts`.
- Produces: routes `/blog`, `/blog/<id>`, `/rss.xml`.

- [ ] **Step 1: Create `src/layouts/BlogPost.astro`**

```astro
---
import Base from './Base.astro';
interface Props { title: string; description: string; pubDate: Date; }
const { title, description, pubDate } = Astro.props;
const dateStr = pubDate.toISOString().slice(0, 10);
---
<Base title={`${title} — Uijong`} description={description}>
  <article class="post">
    <p class="section-label">{dateStr}</p>
    <h1>{title}</h1>
    <div class="post-body"><slot /></div>
    <p style="margin-top:40px"><a href="/blog" class="mono">← all posts</a></p>
  </article>
</Base>
<style>
  .post { padding: 40px 0; }
  .post h1 { font-size: 28px; font-weight: 500; line-height: 1.2; margin: 0 0 24px; }
  .post-body :global(h2) { font-size: 20px; font-weight: 500; margin: 32px 0 12px; }
  .post-body :global(pre) { background: var(--bg-subtle); padding: 16px; border-radius: 8px; overflow-x: auto; font-size: 14px; }
  .post-body :global(code) { font-family: var(--font-mono); }
  .post-body :global(p) { margin: 0 0 16px; }
</style>
```

- [ ] **Step 2: Create `src/pages/blog/index.astro`**

```astro
---
import { getCollection } from 'astro:content';
import Base from '../../layouts/Base.astro';
import { publishedPosts } from '../../lib/posts';
const posts = publishedPosts(await getCollection('blog'));
---
<Base title="Blog — Uijong" description="Writing on systems, Rust, and open source.">
  <section style="padding: 40px 0;">
    <p class="section-label">Writing</p>
    {posts.map((p) => (
      <a href={`/blog/${p.id}`} class="row">
        <span class="row-title">{p.data.title}</span>
        <span class="mono row-date">{p.data.pubDate.toISOString().slice(0, 10)}</span>
      </a>
    ))}
  </section>
</Base>
<style>
  .row { display: flex; justify-content: space-between; align-items: baseline; gap: 16px; padding: 12px 0; border-top: 0.5px solid var(--rule); }
  .row-title { font-size: 15px; }
  .row-date { font-size: 12px; color: var(--text-faint); white-space: nowrap; }
</style>
```

- [ ] **Step 3: Create `src/pages/blog/[...slug].astro`**

```astro
---
import { getCollection, render } from 'astro:content';
import BlogPost from '../../layouts/BlogPost.astro';

export async function getStaticPaths() {
  const posts = await getCollection('blog');
  return posts.map((post) => ({ params: { slug: post.id }, props: { post } }));
}

const { post } = Astro.props;
const { Content } = await render(post);
---
<BlogPost title={post.data.title} description={post.data.description} pubDate={post.data.pubDate}>
  <Content />
</BlogPost>
```

- [ ] **Step 4: Create `src/pages/rss.xml.js`**

```js
import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';

export async function GET(context) {
  const posts = (await getCollection('blog')).filter((p) => !p.data.draft);
  return rss({
    title: 'Uijong',
    description: 'Writing on systems, Rust, and open source.',
    site: context.site,
    items: posts.map((p) => ({
      title: p.data.title,
      description: p.data.description,
      pubDate: p.data.pubDate,
      link: `/blog/${p.id}/`,
    })),
  });
}
```

- [ ] **Step 5: Build and verify routes + feed are generated**

Run: `npm run build`
Expected: build `Complete!`; `dist/blog/index.html`, `dist/blog/hello-world/index.html`, and `dist/rss.xml` all exist.

- [ ] **Step 6: Visually verify in dev**

Run: `npm run dev`, open `/blog`, click the seed post, confirm the title/date render and the Rust code block is syntax-highlighted. Stop the server.
Expected: list and post render correctly; code block highlighted; back-link works.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: blog list, post page, and RSS feed"
```

---

### Task 5: Portfolio data modules with schema validation tests

**Files:**
- Create: `src/data/work.ts`, `src/data/projects.ts`, `src/data/skills.ts`, `src/data/data.test.ts`

**Interfaces:**
- Produces (consumed by Task 6):
  - `work: WorkItem[]` where `WorkItem = { period: string; role: string; org: string; summary: string }`.
  - `projects: Project[]` where `Project = { name: string; description: string; tech: string[]; href?: string }`.
  - `skills: string[]`.

- [ ] **Step 1: Create `src/data/work.ts`** (placeholder content the user edits later; shape is final)

```ts
export interface WorkItem {
  period: string;
  role: string;
  org: string;
  summary: string;
}

export const work: WorkItem[] = [
  {
    period: '2024 — now',
    role: 'Backend Engineer',
    org: 'Company',
    summary: 'One line on what you did and the impact.',
  },
  {
    period: '2023',
    role: 'Intern',
    org: 'Company',
    summary: 'Short summary line.',
  },
];
```

- [ ] **Step 2: Create `src/data/projects.ts`**

```ts
export interface Project {
  name: string;
  description: string;
  tech: string[];
  href?: string;
}

export const projects: Project[] = [
  {
    name: 'project-name',
    description: 'What it does, in one sentence.',
    tech: ['Rust', 'Tokio'],
    href: 'https://github.com/Scanf-s',
  },
  {
    name: 'another-one',
    description: 'What it does, in one sentence.',
    tech: ['Go', 'gRPC'],
  },
];
```

- [ ] **Step 3: Create `src/data/skills.ts`**

```ts
export const skills: string[] = ['Rust', 'Linux', 'Docker', 'Go', 'gRPC', 'Kubernetes'];
```

- [ ] **Step 4: Write the failing test `src/data/data.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { work } from './work';
import { projects } from './projects';
import { skills } from './skills';

describe('portfolio data integrity', () => {
  it('every work item has all required fields', () => {
    for (const w of work) {
      expect(w.period && w.role && w.org && w.summary).toBeTruthy();
    }
  });
  it('every project has a name, description, and at least one tech tag', () => {
    for (const p of projects) {
      expect(p.name && p.description).toBeTruthy();
      expect(p.tech.length).toBeGreaterThan(0);
    }
  });
  it('project hrefs, when present, are absolute URLs', () => {
    for (const p of projects) {
      if (p.href) expect(p.href).toMatch(/^https?:\/\//);
    }
  });
  it('skills are non-empty unique strings', () => {
    expect(skills.length).toBeGreaterThan(0);
    expect(new Set(skills).size).toBe(skills.length);
  });
});
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run src/data/data.test.ts`
Expected: PASS — all 4 tests green (data modules already satisfy the schema).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: portfolio data modules with integrity tests"
```

---

### Task 6: Landing page sections and components

**Files:**
- Create: `src/components/Section.astro`, `src/components/WorkItem.astro`, `src/components/ProjectCard.astro`
- Modify: `src/pages/index.astro` (full landing page)

**Interfaces:**
- Consumes: `work`, `projects`, `skills` from `src/data/*`; `getCollection('blog')` + `publishedPosts` from `src/lib/posts`.
- `Section.astro` — props `{ id: string; label: string }`; renders an anchored `<section>` with a `.section-label` and a `<slot />`, separated by a top rule.

- [ ] **Step 1: Create `src/components/Section.astro`**

```astro
---
interface Props { id: string; label: string; }
const { id, label } = Astro.props;
---
<section id={id} class="section">
  <p class="section-label">{label}</p>
  <slot />
</section>
<style>
  .section { border-top: 0.5px solid var(--rule); padding-top: 24px; margin-top: 36px; scroll-margin-top: 64px; }
</style>
```

- [ ] **Step 2: Create `src/components/WorkItem.astro`**

```astro
---
import type { WorkItem } from '../data/work';
interface Props { item: WorkItem; }
const { item } = Astro.props;
---
<div class="item">
  <span class="mono period">{item.period}</span>
  <div>
    <p class="role">{item.role} · {item.org}</p>
    <p class="summary">{item.summary}</p>
  </div>
</div>
<style>
  .item { display: flex; gap: 16px; margin-bottom: 16px; }
  .period { font-size: 12px; color: var(--text-faint); white-space: nowrap; padding-top: 3px; min-width: 92px; }
  .role { font-size: 15px; font-weight: 500; margin: 0; }
  .summary { font-size: 14px; color: var(--text-muted); margin: 2px 0 0; }
  @media (max-width: 480px) { .item { flex-direction: column; gap: 2px; } .period { padding-top: 0; } }
</style>
```

- [ ] **Step 3: Create `src/components/ProjectCard.astro`**

```astro
---
import type { Project } from '../data/projects';
interface Props { project: Project; }
const { project } = Astro.props;
const Tag = project.href ? 'a' : 'div';
---
<Tag class="card" {...project.href ? { href: project.href } : {}}>
  <p class="name">{project.name}</p>
  <p class="desc">{project.description}</p>
  <span class="mono tech">{project.tech.join(' · ')}</span>
</Tag>
<style>
  .card { display: block; border: 0.5px solid var(--rule); border-radius: 8px; padding: 12px 14px; }
  a.card:hover { border-color: var(--text-faint); }
  .name { font-size: 14px; font-weight: 500; margin: 0 0 4px; }
  .desc { font-size: 13px; color: var(--text-muted); margin: 0 0 8px; line-height: 1.5; }
  .tech { font-size: 11px; color: var(--text-faint); }
</style>
```

- [ ] **Step 4: Create a placeholder profile image `public/profile.svg`**

The hero needs a profile photo. Use an SVG placeholder served from `public/` (referenced by URL string) so the build never depends on a missing binary. See the implementer note for swapping in an optimized raster photo via `astro:assets`.

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 92 92">
  <rect width="92" height="92" rx="46" fill="#e6e6e6"/>
  <text x="46" y="55" font-family="monospace" font-size="14" fill="#8a8a8a" text-anchor="middle">photo</text>
</svg>
```

- [ ] **Step 5: Write the full landing page `src/pages/index.astro`**

```astro
---
import Base from '../layouts/Base.astro';
import Section from '../components/Section.astro';
import WorkItem from '../components/WorkItem.astro';
import ProjectCard from '../components/ProjectCard.astro';
import { getCollection } from 'astro:content';
import { publishedPosts } from '../lib/posts';
import { work } from '../data/work';
import { projects } from '../data/projects';
import { skills } from '../data/skills';

const recentPosts = publishedPosts(await getCollection('blog')).slice(0, 5);
---
<Base title="Uijong" description="Software engineer working on low-level systems and open source.">
  <section id="about" class="hero">
    <div class="hero-text">
      <p class="section-label">// software engineer</p>
      <h1>Hi, I'm Uijong.</h1>
      <p class="tagline">I build low-level systems and contribute to open-source container runtimes like youki. Rust, Linux, and the unglamorous plumbing.</p>
      <div class="socials mono">
        <a href="https://github.com/Scanf-s">GitHub</a>
        <a href="https://www.linkedin.com/">LinkedIn</a>
        <a href="mailto:ssu.uijong@gmail.com">Email</a>
      </div>
    </div>
    <img src="/profile.svg" width="92" height="92" alt="Uijong" class="avatar" />
  </section>

  <Section id="work" label="Work">
    {work.map((item) => <WorkItem item={item} />)}
  </Section>

  <Section id="projects" label="Projects">
    <div class="project-grid">
      {projects.map((p) => <ProjectCard project={p} />)}
    </div>
  </Section>

  <Section id="oss" label="Open source">
    <div class="oss-item">
      <span class="mono oss-tag">PR</span>
      <div>
        <p class="oss-name">youki <span class="oss-role">— contributor</span></p>
        <p class="oss-desc">Container runtime in Rust. <a href="https://github.com/youki-dev/youki/pulls?q=is:pr+author:Scanf-s">Merged PRs →</a></p>
      </div>
    </div>
  </Section>

  <Section id="skills" label="Skills">
    <div class="chips">
      {skills.map((s) => <span class="mono chip">{s}</span>)}
    </div>
  </Section>

  <Section id="writing" label="Writing">
    {recentPosts.map((p) => (
      <a href={`/blog/${p.id}`} class="row">
        <span class="row-title">{p.data.title}</span>
        <span class="mono row-date">{p.data.pubDate.toISOString().slice(0, 10)}</span>
      </a>
    ))}
    <a href="/blog" class="mono more">all posts →</a>
  </Section>
</Base>
<style>
  .hero { display: flex; gap: 24px; align-items: flex-start; justify-content: space-between; padding: 48px 0 8px; }
  .hero-text { flex: 1; }
  .avatar { border-radius: 50%; flex-shrink: 0; }
  .hero h1 { font-size: 32px; font-weight: 500; line-height: 1.2; margin: 0 0 12px; }
  .tagline { font-size: 16px; color: var(--text-muted); margin: 0 0 16px; max-width: 46ch; }
  .socials { display: flex; gap: 16px; font-size: 13px; }
  .socials a { color: var(--text-muted); }
  .project-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  @media (max-width: 480px) { .project-grid { grid-template-columns: 1fr; } }
  .oss-item { display: flex; gap: 14px; align-items: baseline; }
  .oss-tag { font-size: 12px; color: var(--text-faint); }
  .oss-name { font-size: 15px; font-weight: 500; margin: 0; }
  .oss-role { font-weight: 400; color: var(--text-muted); }
  .oss-desc { font-size: 14px; color: var(--text-muted); margin: 2px 0 0; }
  .chips { display: flex; flex-wrap: wrap; gap: 8px; }
  .chip { font-size: 12px; border: 0.5px solid var(--rule); border-radius: 8px; padding: 4px 10px; color: var(--text-muted); }
  .row { display: flex; justify-content: space-between; align-items: baseline; gap: 16px; padding: 8px 0; }
  .row-title { font-size: 14px; }
  .row-date { font-size: 12px; color: var(--text-faint); white-space: nowrap; }
  .more { display: inline-block; margin-top: 12px; font-size: 13px; color: var(--text-muted); }
</style>
```

- [ ] **Step 6: Build and type-check**

Run: `npm run build && npm run check`
Expected: build `Complete!`; `astro check` reports `0 errors`.

- [ ] **Step 7: Visually verify the landing page in dev**

Run: `npm run dev`, open `/`. Confirm: all sections render in order (About, Work, Projects, OSS, Skills, Writing); the profile placeholder shows in the hero; nav anchor links jump to sections; theme toggle still works; recent posts list shows the seed post. Resize to mobile width and confirm the project grid collapses to one column and nav links hide. Stop the server.
Expected: matches the approved mockup direction; responsive behavior correct.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: landing page with all portfolio sections"
```

---

### Task 7: SEO meta, favicon, OG image, 404

**Files:**
- Create: `public/favicon.svg`, `src/pages/404.astro`
- Create: `public/og-image.png` (instructions below), `public/resume.pdf` (placeholder note)
- Modify: `src/layouts/Base.astro` (add Open Graph + canonical meta)

**Interfaces:**
- Consumes: `Astro.site`, `Astro.url` for canonical/OG URLs.

- [ ] **Step 1: Add OG/canonical meta to `Base.astro` `<head>`** (insert after the `<meta name="description">` line)

```astro
    <link rel="canonical" href={new URL(Astro.url.pathname, Astro.site)} />
    <meta property="og:type" content="website" />
    <meta property="og:title" content={title} />
    <meta property="og:description" content={description} />
    <meta property="og:url" content={new URL(Astro.url.pathname, Astro.site)} />
    <meta property="og:image" content={new URL('/og-image.png', Astro.site)} />
    <meta name="twitter:card" content="summary_large_image" />
```

- [ ] **Step 2: Create `public/favicon.svg`**

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="6" fill="#111111"/>
  <text x="16" y="22" font-family="monospace" font-size="16" fill="#ffffff" text-anchor="middle">u</text>
</svg>
```

- [ ] **Step 3: Create `src/pages/404.astro`**

```astro
---
import Base from '../layouts/Base.astro';
---
<Base title="404 — Uijong" description="Page not found.">
  <section style="padding: 80px 0; text-align: center;">
    <p class="section-label">404</p>
    <h1 style="font-size: 24px; font-weight: 500;">Page not found</h1>
    <p style="margin-top: 12px;"><a href="/" class="mono">← home</a></p>
  </section>
</Base>
```

- [ ] **Step 4: Add OG image and résumé placeholders**

The OG image and résumé are binary/user assets, not code. For now create a minimal valid PNG placeholder so the build references resolve, and leave a note for the user to replace them:

Run:
```bash
cd /Users/uijong/Development/Scanf-s.github.io
printf '\x89PNG\r\n\x1a\n' > public/og-image.png   # placeholder; user replaces with a real 1200x630 image
```
Then note in the commit message that `public/og-image.png` and an optional `public/resume.pdf` should be replaced with real assets.

- [ ] **Step 5: Build to verify all references resolve**

Run: `npm run build`
Expected: build `Complete!`; `dist/404.html`, `dist/favicon.svg`, `dist/og-image.png` exist; no broken-reference warnings.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: SEO meta, favicon, 404 page, OG image placeholder"
```

---

### Task 8: GitHub Actions deploy, then promote to main

**Files:**
- Create: `.github/workflows/deploy.yml`
- Delete: any leftover Chirpy workflow in `.github/workflows/` (e.g. `pages-deploy.yml`)

**Interfaces:**
- Produces: a Pages deploy on push to `main`.

- [ ] **Step 1: Inspect and remove the old Chirpy workflow**

Run: `ls .github/workflows/`
Then remove any existing Jekyll/Chirpy deploy workflow:
```bash
git rm .github/workflows/*.yml
```
Expected: old workflow(s) removed.

- [ ] **Step 2: Create `.github/workflows/deploy.yml`**

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: withastro/action@v3
        with:
          node-version: 20
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 3: Commit on the redesign branch**

```bash
git add -A
git commit -m "ci: GitHub Actions Astro Pages deploy"
```

- [ ] **Step 4: Final full verification before promoting**

Run: `npm run build && npm run check && npm test`
Expected: build `Complete!`; `astro check` `0 errors`; all Vitest tests pass.

- [ ] **Step 5: Push the redesign branch and open a PR for review**

```bash
git push -u origin redesign-astro
gh pr create --base main --head redesign-astro \
  --title "Rebuild site as minimal Astro portfolio" \
  --body "Replaces Chirpy/Jekyll with an Astro portfolio + blog. Old site preserved on the legacy branch. See docs/superpowers/specs and docs/superpowers/plans."
```
Expected: PR created. Confirm GitHub Pages source is set to "GitHub Actions" in repo settings (manual step the user does in the GitHub UI — note this in the PR body).

- [ ] **Step 6: Merge after review and confirm deploy**

After the user reviews the PR and sets Pages source to "GitHub Actions", merge it. Watch the Actions run complete, then load `https://scanf-s.github.io` and confirm the new site is live with working theme toggle, sections, and blog.
Expected: live site matches local preview.

---

## Notes for the implementer

- **Placeholder content is intentional.** Work entries, project entries, the tagline, and social URLs (LinkedIn) are placeholders with the final *shape*. The user fills in real content by editing `src/data/*.ts`, the hero copy in `src/pages/index.astro`, and replacing `public/og-image.png` / adding `public/resume.pdf`. Do not block tasks waiting on real content.
- **Profile photo — optimized swap.** The hero uses an SVG placeholder at `public/profile.svg` referenced by URL, which always builds. When the user supplies a real raster photo, switch to Astro's optimized image pipeline: drop `profile.jpg` in `src/assets/`, then in `index.astro` add `import { Image } from 'astro:assets'` and `import profile from '../assets/profile.jpg'`, and replace the `<img>` with `<Image src={profile} width={92} height={92} alt="Uijong" class="avatar" />`. This is the `src/assets` optimization path from the spec (auto resize / WebP / lazy-load). Do not import `.svg` files through `astro:assets` — in Astro 5 an imported SVG resolves to a component, not an object with `.src`.
- **Astro 5 content collections** use the glob loader and `entry.id` as the slug (not `entry.slug`). Rendering uses `render(entry)` imported from `astro:content`, not `entry.render()`.
- **Do not touch `main`** until Task 8. The `legacy` branch (Task 1) is the rollback path.
