export function Icon({ name, className = '' }: { name: string; className?: string }) {
  return <img className={`icon ${className}`} src={`${import.meta.env.BASE_URL}figma/${name}.svg`} alt="" aria-hidden="true" width="20" height="20" />
}
