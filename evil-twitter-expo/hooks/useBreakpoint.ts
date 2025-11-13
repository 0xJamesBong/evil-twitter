import { useWindowDimensions } from 'react-native';
import { breakpoints } from '@/theme';

export type Breakpoint = 'sm' | 'md' | 'lg' | 'xl' | '2xl';

/**
 * Hook to get current breakpoint based on window width
 * 
 * @returns Current breakpoint name
 * 
 * @example
 * const breakpoint = useBreakpoint();
 * if (breakpoint >= 'lg') {
 *   // Desktop layout
 * }
 */
export function useBreakpoint(): Breakpoint {
  const { width } = useWindowDimensions();

  if (width >= breakpoints['2xl']) return '2xl';
  if (width >= breakpoints.xl) return 'xl';
  if (width >= breakpoints.lg) return 'lg';
  if (width >= breakpoints.md) return 'md';
  return 'sm';
}

/**
 * Hook to check if current breakpoint is at least a certain size
 * 
 * @param minBreakpoint - Minimum breakpoint to check
 * @returns True if current breakpoint is >= minBreakpoint
 * 
 * @example
 * const isDesktop = useBreakpointAtLeast('lg');
 */
export function useBreakpointAtLeast(minBreakpoint: Breakpoint): boolean {
  const current = useBreakpoint();
  const order: Breakpoint[] = ['sm', 'md', 'lg', 'xl', '2xl'];
  return order.indexOf(current) >= order.indexOf(minBreakpoint);
}

