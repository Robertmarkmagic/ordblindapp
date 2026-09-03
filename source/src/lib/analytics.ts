/**
 * OverSkill Analytics - Lightweight page view and event tracking
 *
 * Sends analytics data to the Worker's /__analytics endpoint, which writes
 * to Cloudflare Analytics Engine for infinite scalability.
 *
 * Features:
 * - Page view tracking (automatic on load + SPA navigation)
 * - Session tracking with duration
 * - Core Web Vitals (LCP, FID, CLS)
 * - Error tracking
 * - Custom event tracking
 *
 * Size: ~2KB minified
 */

interface PageViewEvent {
  type: 'pageview';
  path: string;
  referrer: string;
  title: string;
  sessionId: string;
  loadTime?: number;
}

interface ErrorEvent {
  type: 'error';
  path: string;
  errorType: string;
  errorMessage: string;
  sessionId: string;
}

interface WebVitalsEvent {
  type: 'cwv';
  path: string;
  sessionId: string;
  lcp?: number;
  fid?: number;
  cls?: number;
  ttfb?: number;
}

interface SessionEvent {
  type: 'session';
  path: string;
  sessionId: string;
  duration: number;
  scrollDepth: number;
}

interface CustomEvent {
  type: 'custom';
  path: string;
  sessionId: string;
  eventName: string;
  properties?: Record<string, string | number | boolean>;
}

type AnalyticsEvent = PageViewEvent | ErrorEvent | WebVitalsEvent | SessionEvent | CustomEvent;

class OverSkillAnalytics {
  private sessionId: string;
  private sessionStart: number;
  private maxScrollDepth: number = 0;
  private lastPath: string = '';
  private endpoint = '/__analytics';
  private enabled: boolean = true;

  constructor() {
    // Generate or retrieve session ID
    this.sessionId = this.getOrCreateSessionId();
    this.sessionStart = Date.now();

    // Only run in browser context
    if (typeof window === 'undefined') {
      this.enabled = false;
      return;
    }

    // CRITICAL: Disable analytics for preview environments
    // Preview URLs have format: preview-{app_id}.overskill.app
    // This prevents editor preview reloads from inflating page view counts
    const hostname = window.location.hostname;
    if (hostname.startsWith('preview-') || hostname.includes('.preview-')) {
      console.debug('[Analytics] Disabled for preview environment');
      this.enabled = false;
      return;
    }

    // Also disable if running in an iframe (editor preview)
    // Production apps should NOT be loaded in iframes from overskill.com
    try {
      if (window.self !== window.top) {
        const parentHostname = window.top?.location?.hostname || '';
        if (parentHostname.includes('overskill.com') || parentHostname.includes('overskill.app')) {
          console.debug('[Analytics] Disabled for iframe preview');
          this.enabled = false;
          return;
        }
      }
    } catch {
      // Cross-origin iframe - can't access parent, allow tracking (might be embedded elsewhere)
    }

    // Initialize tracking
    this.init();
  }

  private init() {
    // Track initial page view
    this.trackPageView();

    // Track scroll depth
    this.setupScrollTracking();

    // Track session end on page unload
    this.setupSessionTracking();

    // Track JS errors
    this.setupErrorTracking();

    // Track Core Web Vitals (async)
    this.setupWebVitals();

    // Track SPA navigation (for React Router)
    this.setupSPATracking();
  }

  /**
   * Get or create a session ID (stored in sessionStorage)
   */
  private getOrCreateSessionId(): string {
    if (typeof window === 'undefined') return 'ssr';

    const key = '__overskill_session';
    let sessionId = sessionStorage.getItem(key);

    if (!sessionId) {
      sessionId = this.generateId();
      sessionStorage.setItem(key, sessionId);
    }

    return sessionId;
  }

  /**
   * Generate a random ID
   */
  private generateId(): string {
    return Math.random().toString(36).substring(2, 15) +
           Math.random().toString(36).substring(2, 15);
  }

  /**
   * Send analytics event to the Worker
   */
  private send(event: AnalyticsEvent) {
    if (!this.enabled) return;

    try {
      // Use sendBeacon for session end events (reliable on page unload)
      const useBeacon = event.type === 'session';
      const data = JSON.stringify(event);

      if (useBeacon && navigator.sendBeacon) {
        navigator.sendBeacon(this.endpoint, data);
      } else {
        // Use fetch with keepalive for other events
        fetch(this.endpoint, {
          method: 'POST',
          body: data,
          headers: { 'Content-Type': 'application/json' },
          keepalive: true,
        }).catch(() => {
          // Fail silently - analytics should never break the app
        });
      }
    } catch {
      // Fail silently
    }
  }

  /**
   * Track a page view
   */
  trackPageView() {
    if (!this.enabled) return;

    const path = window.location.pathname;

    // Don't track duplicate page views
    if (path === this.lastPath) return;
    this.lastPath = path;

    // Calculate load time if available
    let loadTime: number | undefined;
    if (window.performance?.timing) {
      const timing = window.performance.timing;
      loadTime = timing.loadEventEnd - timing.navigationStart;
      if (loadTime < 0) loadTime = undefined; // Not ready yet
    }

    this.send({
      type: 'pageview',
      path,
      referrer: document.referrer || 'direct',
      title: document.title,
      sessionId: this.sessionId,
      loadTime,
    });
  }

  /**
   * Track a custom event
   */
  trackEvent(name: string, properties?: Record<string, string | number | boolean>) {
    if (!this.enabled) return;

    this.send({
      type: 'custom',
      path: window.location.pathname,
      sessionId: this.sessionId,
      eventName: name,
      properties,
    });
  }

  /**
   * Track an error
   */
  trackError(errorType: string, errorMessage: string) {
    if (!this.enabled) return;

    this.send({
      type: 'error',
      path: window.location.pathname,
      errorType,
      errorMessage: errorMessage.substring(0, 500), // Truncate
      sessionId: this.sessionId,
    });
  }

  /**
   * Setup scroll depth tracking
   */
  private setupScrollTracking() {
    const updateScroll = () => {
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrolled = scrollHeight > 0
        ? Math.round((window.scrollY / scrollHeight) * 100)
        : 0;
      this.maxScrollDepth = Math.max(this.maxScrollDepth, scrolled);
    };

    window.addEventListener('scroll', updateScroll, { passive: true });
  }

  /**
   * Setup session tracking (send duration on page unload)
   */
  private setupSessionTracking() {
    const sendSession = () => {
      const duration = Math.round((Date.now() - this.sessionStart) / 1000);

      this.send({
        type: 'session',
        path: window.location.pathname,
        sessionId: this.sessionId,
        duration,
        scrollDepth: this.maxScrollDepth,
      });
    };

    // Use visibilitychange for more reliable tracking
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        sendSession();
      }
    });

    // Fallback for older browsers
    window.addEventListener('beforeunload', sendSession);
  }

  /**
   * Setup error tracking
   */
  private setupErrorTracking() {
    // Track JS errors
    window.addEventListener('error', (event) => {
      this.trackError(
        'javascript',
        event.message || 'Unknown error'
      );
    });

    // Track unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.trackError(
        'promise',
        event.reason?.message || String(event.reason) || 'Unhandled rejection'
      );
    });
  }

  /**
   * Setup Core Web Vitals tracking
   */
  private setupWebVitals() {
    // Use PerformanceObserver for modern browsers
    if (typeof PerformanceObserver === 'undefined') return;

    let lcp: number | undefined;
    let fid: number | undefined;
    let cls: number | undefined;
    let sent = false;

    const sendVitals = () => {
      if (sent || (!lcp && !fid && !cls)) return;
      sent = true;

      // Get TTFB from navigation timing
      let ttfb: number | undefined;
      const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (navEntry) {
        ttfb = navEntry.responseStart - navEntry.requestStart;
      }

      this.send({
        type: 'cwv',
        path: window.location.pathname,
        sessionId: this.sessionId,
        lcp,
        fid,
        cls: cls ? Math.round(cls * 1000) : undefined, // Store as integer * 1000
        ttfb: ttfb ? Math.round(ttfb) : undefined,
      });
    };

    // LCP (Largest Contentful Paint)
    try {
      const lcpObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        const lastEntry = entries[entries.length - 1] as PerformancePaintTiming;
        lcp = Math.round(lastEntry.startTime);
      });
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
    } catch { /* Browser doesn't support LCP */ }

    // FID (First Input Delay)
    try {
      const fidObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        const firstEntry = entries[0] as PerformanceEventTiming;
        fid = Math.round(firstEntry.processingStart - firstEntry.startTime);
      });
      fidObserver.observe({ type: 'first-input', buffered: true });
    } catch { /* Browser doesn't support FID */ }

    // CLS (Cumulative Layout Shift)
    try {
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries()) {
          if (!(entry as any).hadRecentInput) {
            clsValue += (entry as any).value;
          }
        }
        cls = clsValue;
      });
      clsObserver.observe({ type: 'layout-shift', buffered: true });
    } catch { /* Browser doesn't support CLS */ }

    // Send vitals after page load or on visibility change
    if (document.readyState === 'complete') {
      setTimeout(sendVitals, 1000);
    } else {
      window.addEventListener('load', () => setTimeout(sendVitals, 1000));
    }

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        sendVitals();
      }
    });
  }

  /**
   * Setup SPA navigation tracking (React Router compatible)
   */
  private setupSPATracking() {
    // Track history changes (pushState, replaceState)
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = (...args) => {
      originalPushState.apply(history, args);
      setTimeout(() => this.trackPageView(), 0);
    };

    history.replaceState = (...args) => {
      originalReplaceState.apply(history, args);
      setTimeout(() => this.trackPageView(), 0);
    };

    // Track popstate (back/forward)
    window.addEventListener('popstate', () => {
      setTimeout(() => this.trackPageView(), 0);
    });
  }
}

// Create singleton instance
const analytics = new OverSkillAnalytics();

// Export for use in app code
export { analytics };

// Make available globally for non-module contexts
if (typeof window !== 'undefined') {
  (window as any).__overskill_analytics = analytics;
}
