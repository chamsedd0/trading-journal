'use client';

import { useState, useEffect } from 'react';

/**
 * Custom hook for responsive design - checks if a media query matches
 * @param query The media query to check
 * @returns Boolean indicating if the media query matches
 */
export function useMediaQuery(query: string): boolean {
  // Check if we're in a browser environment
  const isClient = typeof window !== 'undefined';
  
  // Initialize state with the current match state (or false if SSR)
  const [matches, setMatches] = useState<boolean>(() => {
    if (!isClient) return false;
    return window.matchMedia(query).matches;
  });

  // Update matches state when the media query changes
  useEffect(() => {
    if (!isClient) return;
    
    const mediaQuery = window.matchMedia(query);
    
    // Function to update state
    const updateMatches = (e: MediaQueryListEvent) => {
      setMatches(e.matches);
    };
    
    // Initial check
    setMatches(mediaQuery.matches);
    
    // Add event listener
    // Use the modern approach for Chrome/Firefox/Safari/Edge
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', updateMatches);
      return () => mediaQuery.removeEventListener('change', updateMatches);
    } 
    // Fallback for older browsers
    else {
      // @ts-ignore - addListener is deprecated but needed for IE/old Edge
      mediaQuery.addListener(updateMatches);
      return () => {
        // @ts-ignore
        mediaQuery.removeListener(updateMatches);
      };
    }
  }, [query, isClient]);

  return matches;
}

/**
 * Convenience hooks for common breakpoints
 */
export const useIsMobile = () => useMediaQuery('(max-width: 767px)');
export const useIsTablet = () => useMediaQuery('(min-width: 768px) and (max-width: 1023px)');
export const useIsDesktop = () => useMediaQuery('(min-width: 1024px)');
export const useIsLargeDesktop = () => useMediaQuery('(min-width: 1280px)');

export default useMediaQuery; 