/* eslint-disable @next/next/no-img-element */
export function BrandMark({ size = 24 }: { size?: number }) {
  const width = Math.round(size * (1006 / 194))
  return (
    <img
      src="/images/plohie_buddy_rus.png"
      alt="badbuddhas"
      width={width}
      height={size}
      style={{ display: 'block' }}
    />
  )
}
