import { ReactNode } from 'react'

/**
 * Public Layout
 * 
 * This layout is used for public-facing routes.
 * Theme resolution is handled by the root layout, but this layout
 * can be extended to provide route-specific theme overrides if needed.
 * 
 * For now, it simply passes through children since theme is resolved
 * at the root layout level.
 */
export default function PublicLayout({
  children,
}: {
  children: ReactNode
}) {
  // Theme is already resolved and provided by root layout
  // This layout can be extended for route-specific theme overrides
  return <>{children}</>
}
