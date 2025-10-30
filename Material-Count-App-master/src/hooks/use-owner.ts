"use client";

import { usePathname } from 'next/navigation';

/**
 * A custom hook that determines if the user is in "owner" (admin) mode.
 * Admin mode is enabled if the current URL path contains '/admin'.
 * @returns {boolean} - True if the user is in owner mode, false otherwise.
 */
export function useOwner() {
  const pathname = usePathname();
  const isOwner = pathname.includes('/admin');
  return isOwner;
}
