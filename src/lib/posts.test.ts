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
