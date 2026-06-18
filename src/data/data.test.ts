import { describe, it, expect } from 'vitest';
import { work } from './work';
import { projects } from './projects';
import { skills } from './skills';

describe('portfolio data integrity', () => {
  it('every work item has all required fields', () => {
    for (const w of work) {
      expect(w.period).toBeTruthy();
      expect(w.role).toBeTruthy();
      expect(w.org).toBeTruthy();
      expect(w.summary).toBeTruthy();
    }
  });
  it('every project has a name, description, and at least one tech tag', () => {
    for (const p of projects) {
      expect(p.name).toBeTruthy();
      expect(p.description).toBeTruthy();
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
