/* eslint-disable @next/next/no-img-element */
export function BrandMark({ size = 24 }: { size?: number }) {
  const width = Math.round(size * (630 / 116))
  return (
    <img
      src="/images/logo.svg"
      alt="badbuddhas"
      width={width}
      height={size}
      style={{ display: 'block' }}
    />
  )
}
