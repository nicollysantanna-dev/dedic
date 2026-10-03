import { cn } from '@/lib/utils'

/** Ícone do Dedic (o mesmo do PWA), com cantos arredondados como no celular. */
export function AppLogo({ label, className }: { label?: string; className?: string }) {
  return (
    <span
      className={cn('inline-block shrink-0 overflow-hidden rounded-[24%]', className)}
    >
      <img
        alt={label ?? ''}
        className="size-full object-cover"
        decoding="async"
        height={192}
        src="/pwa-192x192.png"
        width={192}
      />
    </span>
  )
}
