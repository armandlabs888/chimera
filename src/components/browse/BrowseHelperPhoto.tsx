'use client'

/** Square helper photo or blue monogram for browse list / preview. */
export function BrowseHelperPhoto({
  src,
  name,
  size = 88,
  className = '',
}: {
  src?: string | null
  name: string
  size?: number
  className?: string
}) {
  const letter = (name.trim()[0] || '?').toUpperCase()
  const hasPhoto = Boolean(src && src.trim())
  const style = { ['--hc-helper-photo-size' as string]: `${size}px` }

  if (hasPhoto) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src!}
        alt=""
        width={size}
        height={size}
        className={`browse-hc-helper-photo ${className}`.trim()}
        style={style}
      />
    )
  }

  return (
    <span className={`browse-hc-helper-mono ${className}`.trim()} style={style} aria-hidden>
      {letter}
    </span>
  )
}
