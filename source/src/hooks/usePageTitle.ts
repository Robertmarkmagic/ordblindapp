import { useEffect } from "react";

/**
 * Sets `document.title` to "<title> · ReliefRead" while a view is mounted and
 * restores the previous title on unmount. Pass an empty string (or nothing) for
 * the bare brand title. Keeps per-view titles correct in a single-page app.
 */
export function usePageTitle(title?: string) {
  useEffect(() => {
    const previous = document.title;
    document.title = title && title.trim() ? `${title.trim()} · ReliefRead` : "ReliefRead";
    return () => {
      document.title = previous;
    };
  }, [title]);
}

export default usePageTitle;
