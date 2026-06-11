/** Navigate to a URL inside the in-app frame instead of opening a new tab. */
export function frameUrl(url: string, title?: string): string {
  const params = new URLSearchParams({ url });
  if (title) params.set("title", title);
  return `/frame?${params.toString()}`;
}
