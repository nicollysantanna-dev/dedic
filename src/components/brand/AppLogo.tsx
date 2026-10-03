import { cn } from '@/lib/utils'

/**
 * Ícone do Dedic (o mesmo do PWA). O recorte arredondado esconde os cantos claros da
 * arte, para que ela funcione sobre fundos escuros.
 */
export function AppLogo({ label, className }: { label?: string; className?: string }) {
  return (
    <span
      className={cn('inline-block shrink-0 overflow-hidden rounded-[24%]', className)}
    >
      <img
        alt={label ?? ''}
        className="size-full scale-[1.06] object-cover"
        decoding="async"
        height={192}
        src="/pwa-192x192.png"
        width={192}
      />
    </span>
  )
}
