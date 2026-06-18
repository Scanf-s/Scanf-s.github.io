type DatedEntry = { data: { pubDate: Date; draft?: boolean } };

export function sortByDateDesc<T extends DatedEntry>(posts: T[]): T[] {
  return [...posts].sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());
}

export function publishedPosts<T extends DatedEntry>(posts: T[]): T[] {
  return sortByDateDesc(posts.filter((p) => !p.data.draft));
}
