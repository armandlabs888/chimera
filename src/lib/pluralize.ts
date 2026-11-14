/** Simple count + noun helper: 1 helper / 2 helpers. */
export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`
}

export function pluralNoun(count: number, singular: string, plural = `${singular}s`): string {
  return count === 1 ? singular : plural
}
