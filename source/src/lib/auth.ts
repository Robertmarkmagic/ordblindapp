// Authentication utilities using overskill-sdk
// This file is pre-generated in the template - users rarely need to modify it
//
// IMPORTANT: Auth functions in this file NEVER do window.location.href redirects.
// They return results and let the caller (ProtectedRoute, etc.) handle navigation
// via React Router. This prevents full page reloads that break SPA state.

import React from 'react';
import { useState, useEffect, useCallback } from 'react'
import { createClient } from 'overskill-sdk'

// ============================================================================
// Types for app context (roles and permissions)
// ============================================================================

export interface AppContext {
  app_id: string
  app_user_id: number
  roles: string[]
  permissions: Record<string, boolean | number | string | string[]>
}

export interface OverSkillUser {
  id: string
  email: string
  name?: string
  image?: string
  imageUrl?: string
  app_context?: AppContext
  has_active_subscription?: boolean
}

function toOverSkillUser(user: unknown): OverSkillUser | null {
  if (!user) return null
  const value = user as OverSkillUser
  return {
    ...value,
    id: String(value.id),
    email: String(value.email || ''),
    app_context: value.app_context as AppContext | undefined
  }
}

/**
 * Result from checkAppAccess() - tells the caller whether access is granted
 * and where to redirect if not. The caller handles navigation (not this module).
 */
export interface AccessResult {
  allowed: boolean
  redirect?: string   // Where to redirect if not allowed (e.g. '/login', '/purchase')
  reason?: string     // Human-readable reason for logging
}

/**
 * Resolve the EFFECTIVE user id from a decoded JWT payload.
 *
 * OS-7E39Q8 (Jul 2026): a JWT carries TWO different id spaces, and the Worker
 * and the client MUST agree on which one is "me":
 *   - `app_context.app_user_id` / `app_user_id` -> app_users.id  (e.g. 2397)
 *   - `sub`                                    -> users.id       (e.g. 1271)
 *
 * The Worker resolves identity as `app_context.app_user_id || app_user_id || sub`
 * (see validateJWT in worker_api_template.rb) and stamps every row + participant
 * gate with THAT value. `/api/auth/me` echoes the same value as `user.id`.
 *
 * The local-decode fast paths below (used in the editor preview iframe to avoid
 * a race with the postMessage auth handshake) previously read bare `payload.sub`.
 * On any app where app_users.id !== users.id that made the browser believe it was
 * a different user than the server did, so every client-vs-server identity
 * comparison failed: 403 on participant-gated reads (re-firing on every poll),
 * own records rendering as another user's, and member counts disagreeing.
 *
 * Keep this precedence identical to the Worker's. Never read `sub` alone here.
 */
export function resolveEffectiveUserId(payload: any): string | undefined {
  const id =
    payload?.app_context?.app_user_id ??
    payload?.app_user_id ??
    payload?.sub

  return id == null ? undefined : String(id)
}

// Extract and store OAuth token from URL hash if present
// This happens after server-side token exchange redirects back
// Runs at module import time (before React) to ensure token is available immediately
if (typeof window !== 'undefined' && window.location.hash.includes('access_token=')) {
  const hash = window.location.hash
  const token = hash.match(/access_token=([^&]+)/)?.[1]

  if (token) {
    console.log('[lib/auth] Token extracted from URL hash, storing in localStorage')
    localStorage.setItem('overskill_token', token)

    // Store a flag so callback.tsx knows the token was already extracted
    // This prevents duplicate extraction and race conditions
    sessionStorage.setItem('overskill_token_extracted', 'true')

    // Clean URL by removing hash (prevents token from staying in URL)
    window.location.hash = ''

    console.log('[lib/auth] ✅ Token stored, hash cleared. callback.tsx will handle redirect.')
  }
}

// Initialize OverSkill client
const overskillClient = createClient({
  appId: import.meta.env.VITE_APP_ID,
  debug: import.meta.env.DEV
})

// Export overskill client
export const overskill = overskillClient

/**
 * Require authentication for protected routes.
 * Returns the user if authenticated, or null if not.
 * DOES NOT redirect — the caller should use React Router <Navigate> for that.
 */
export async function requireAuth() {
  // Screenshot mode bypass: URLbox is capturing with valid X-Preview-Auth header
  // The Worker validated the token and injected SCREENSHOT_MODE=true
  // Return a mock user to bypass auth so URLbox can capture actual app content
  if (typeof window !== 'undefined' && (window as any).APP_CONFIG?.SCREENSHOT_MODE) {
    console.log('[OverSkill Auth] Screenshot mode detected in requireAuth(), returning mock user')
    return { id: 'screenshot-user', email: 'screenshot@overskill.app' }
  }

  try {
    const user = await overskill.auth.checkSession()

    if (!user) {
      console.warn(
        '🔒 [OverSkill Auth] requireAuth(): User not authenticated',
        {
          currentPath: window.location.pathname,
          timestamp: new Date().toISOString(),
          suggestion: 'Caller should redirect to /login via React Router.'
        }
      )
      return null
    }

    return user
  } catch (error) {
    console.error(
      '❌ [OverSkill Auth] requireAuth() error:',
      error instanceof Error ? error.message : String(error),
      {
        currentPath: window.location.pathname,
        suggestion: 'Check authentication configuration and API availability.'
      }
    )
    return null
  }
}

/**
 * Check app access based on visibility settings.
 * Returns an AccessResult telling the caller whether access is granted
 * and where to redirect if not.
 *
 * IMPORTANT: This function NEVER does window.location.href redirects.
 * The caller (ProtectedRoute) handles navigation via React Router <Navigate>.
 * This keeps everything within the SPA and prevents full page reload loops.
 *
 * Handles: public, login_required, purchase_required, domain_restricted
 */
export async function checkAppAccess(): Promise<AccessResult> {
  // Access-control single source of truth (access-control-visibility-sot, Jul 2026).
  //
  // BUG 2 (stale visibility bake): VITE_APP_VISIBILITY is a Vite BUILD-TIME env
  // var inlined into this bundle at build time. When a creator changes
  // app.visibility in the DB (e.g. domain_restricted -> public), this deployed
  // bundle keeps enforcing the OLD baked value until a rebuild — which stranded
  // a now-public app on /access-denied (the Mindflow / NbOBZj incident).
  //
  // Fix: PREFER the RUNTIME value the Worker injects into window.APP_CONFIG
  // (APP_CONFIG.appVisibility) over the stale build-time bake. The Worker only
  // injects APP_CONFIG.appVisibility when the :runtime_app_visibility flag is ON
  // for the app's team (WFP#generate_computed_environment_variables ->
  // injectAppConfig), so:
  //   - flag ON  : the DB value wins on the very next request, no rebuild
  //   - flag OFF : APP_CONFIG.appVisibility is undefined and we fall back to the
  //                baked import.meta.env.VITE_APP_VISIBILITY exactly as before
  //                (byte-identical behavior). Also the fallback for any bundle
  //                deployed before the Worker started injecting the runtime value.
  const runtimeVisibility =
    typeof window !== 'undefined' ? (window as any).APP_CONFIG?.appVisibility : undefined
  const appVisibility = runtimeVisibility || import.meta.env.VITE_APP_VISIBILITY || 'public'

  // Allow logged-out page without authentication (shows logout confirmation)
  if (window.location.pathname === '/logged-out') {
    return { allowed: true }
  }

  // Screenshot mode: URLbox is capturing the app with valid X-Preview-Auth header
  // The Cloudflare Worker validated the token and injected SCREENSHOT_MODE=true
  // This bypasses all auth checks so URLbox can capture actual app content
  // See: docs/ultrathink/urlbox-login-screenshot-issue-jan-2026/ROOT_CAUSE_ANALYSIS.md
  if (typeof window !== 'undefined' && (window as any).APP_CONFIG?.SCREENSHOT_MODE) {
    console.log('[OverSkill Auth] Screenshot mode detected, bypassing auth check')
    return { allowed: true }
  }

  // HMR preview bypass: in an iframe on a recognized preview host with a
  // valid token, trust the localStorage token without API verification.
  // This is safe because:
  // 1. The token was validated by the platform when generated via preview_token endpoint
  // 2. The token was securely passed via postMessage challenge/response
  // 3. We're in a preview context where API routes aren't available (Vite dev server)
  // See: Feb 2026 preview auth debugging
  if (typeof window !== 'undefined') {
    const isInIframe = window.self !== window.top
    const hostname = window.location.hostname
    // E2B hosts are current. The sprites.app/overskillprojects.com entries
    // remain only so already-published generated clients do not lose auth
    // compatibility during the database-contract rollout.
    // *.overskillprojects.dev is the multi-zone proxy domain that fronts E2B
    // sandboxes (added with the multi-zone proxy worker). Without this, the
    // parent editor delivers the token correctly (preview_auth_controller
    // accepts these origins) but this child-side check rejects it and the
    // user sees the production login gate inside the dev preview.
    const isHmrPreview = hostname.includes('sprites.app') ||
                         hostname.includes('overskillprojects.com') ||
                         hostname.includes('e2b.app') ||
                         hostname.includes('overskillprojects.dev')
    const hasPreviewToken = !!localStorage.getItem('overskill_token')

    if (isInIframe && isHmrPreview && hasPreviewToken) {
      console.log('[OverSkill Auth] HMR preview mode detected with valid token, bypassing API auth check')
      return { allowed: true }
    }
  }

  switch (appVisibility) {
    case 'public':
      // No restrictions - anyone can access
      return { allowed: true }

    case 'login_required':
      // Must be logged in to access
      try {
        const user = await overskill.auth.checkSession()
        if (!user) {
          console.warn(
            '🔒 [OverSkill Auth] Access denied: User not logged in (login_required)',
            {
              visibility: 'login_required',
              currentPath: window.location.pathname,
              timestamp: new Date().toISOString()
            }
          )
          return { allowed: false, redirect: '/login', reason: 'not_authenticated' }
        }
        return { allowed: true }
      } catch (error) {
        console.error(
          '❌ [OverSkill Auth] Authentication check failed:',
          error instanceof Error ? error.message : String(error),
          {
            visibility: 'login_required',
            currentPath: window.location.pathname,
            suggestion: 'Check if authentication API is accessible or token is valid.'
          }
        )
        return { allowed: false, redirect: '/login', reason: 'auth_check_failed' }
      }

    case 'purchase_required':
      // Must have active subscription
      try {
        const paidUser = await overskill.auth.checkSession()
        if (!paidUser) {
          return { allowed: false, redirect: '/login', reason: 'not_authenticated' }
        }
        if (!(paidUser as OverSkillUser).has_active_subscription) {
          return { allowed: false, redirect: '/purchase', reason: 'no_subscription' }
        }
        return { allowed: true }
      } catch (error) {
        return { allowed: false, redirect: '/login', reason: 'auth_check_failed' }
      }

    case 'domain_restricted':
      // Must login with allowed email domain
      try {
        const domainUser = await overskill.auth.checkSession()
        if (!domainUser) {
          return { allowed: false, redirect: '/login', reason: 'not_authenticated' }
        }
        // Prefer the RUNTIME email allow-list (APP_CONFIG.allowedEmailDomains,
        // injected by the Worker when :runtime_app_visibility is ON) over the
        // stale build-time bake (VITE_ALLOWED_DOMAINS). Same SoT logic as
        // appVisibility above. Fall back to the baked value when the runtime
        // value is absent (flag OFF / older bundle).
        const runtimeAllowed =
          typeof window !== 'undefined' ? (window as any).APP_CONFIG?.allowedEmailDomains : undefined
        const allowedDomainsRaw =
          runtimeAllowed !== undefined && runtimeAllowed !== null
            ? runtimeAllowed
            : (import.meta.env.VITE_ALLOWED_DOMAINS || '')
        const allowedDomains = allowedDomainsRaw.split(',').filter((d: string) => d)

        // BUG 1 (empty-allowlist-blocks-everyone, ungated correctness fix):
        // An EMPTY allow-list means "no domain restriction configured yet", NOT
        // "block everyone". Previously [].includes(anything) === false blocked
        // EVERY authenticated user (the empty-allowlist strand). Treat an empty
        // list as no-restriction and ALLOW any authenticated user — never
        // redirect to /access-denied on an empty list. Allowing on empty is
        // strictly safer and matches the intended "restrict to these domains"
        // semantics (with zero domains, there is nothing to restrict to).
        if (allowedDomains.length === 0) {
          return { allowed: true }
        }

        const userDomain = domainUser.email.split('@')[1]

        if (!allowedDomains.includes(userDomain)) {
          return { allowed: false, redirect: '/access-denied', reason: 'domain_not_allowed' }
        }
        return { allowed: true }
      } catch (error) {
        return { allowed: false, redirect: '/login', reason: 'auth_check_failed' }
      }

    default:
      return { allowed: true }
  }
}

/**
 * Get current user or null (doesn't throw)
 */
export async function getCurrentUser() {
  return await overskill.auth.checkSession()
}

/**
 * Check if user is authenticated (synchronous)
 */
export function isAuthenticated() {
  return overskill.auth.isAuthenticated()
}

/**
 * Get the current authentication token (synchronous)
 * Use this for making authenticated API calls to backend endpoints
 *
 * @returns The JWT token string or null if not authenticated
 *
 * @example
 * ```typescript
 * import { getAuthToken } from '@/lib/auth'
 *
 * const response = await fetch('/api/backend/send-gmail-email', {
 *   method: 'POST',
 *   headers: {
 *     'Authorization': `Bearer ${getAuthToken()}`,
 *     'Content-Type': 'application/json'
 *   },
 *   body: JSON.stringify({ to: 'user@example.com', subject: 'Hello', body: 'Hi!' })
 * })
 * ```
 */
export function getAuthToken(): string | null {
  return overskill.auth.getToken()
}

// ============================================================================
// Role and Permission Helpers
// ============================================================================

// #2374: silently re-mint the JWT once per page load when a role/permission
// check comes back negative — covers the case where a role was granted
// server-side AFTER the 24h token was issued (the live token has stale claims).
// Guarded so it runs at most once and is a no-op on SDK builds that predate
// overskill.auth.refresh(). Returns true only when it actually refreshed this
// call, so the caller knows to re-check.
let attemptedSilentRoleRefresh = false
async function refreshRolesOnce(): Promise<boolean> {
  if (attemptedSilentRoleRefresh) return false
  attemptedSilentRoleRefresh = true

  const refreshFn = (overskill.auth as any)?.refresh
  if (typeof refreshFn !== 'function') return false

  try {
    const refreshedUser = await refreshFn.call(overskill.auth)
    return refreshedUser !== null
  } catch {
    // Best-effort — keep the current token.
    return false
  }
}

/**
 * Check if the current user has a specific role
 * @param roleKey - The role key to check (e.g., 'admin', 'premium')
 * @returns Promise<boolean>
 */
export async function hasRole(roleKey: string): Promise<boolean> {
  const user = await overskill.auth.checkSession()
  if (user?.app_context?.roles?.includes(roleKey)) return true

  // Negative result — try one silent refresh and re-check (issue #2374).
  if (await refreshRolesOnce()) {
    const refreshed = await overskill.auth.checkSession()
    return refreshed?.app_context?.roles?.includes(roleKey) ?? false
  }
  return false
}

/**
 * Check if the current user has any of the specified roles
 * @param roleKeys - Array of role keys to check
 * @returns Promise<boolean>
 */
export async function hasAnyRole(roleKeys: string[]): Promise<boolean> {
  const user = await overskill.auth.checkSession()
  if (roleKeys.some(key => (user?.app_context?.roles ?? []).includes(key))) return true

  if (await refreshRolesOnce()) {
    const refreshed = await overskill.auth.checkSession()
    const userRoles = refreshed?.app_context?.roles ?? []
    return roleKeys.some(key => userRoles.includes(key))
  }
  return false
}

/**
 * Check if the current user has all of the specified roles
 * @param roleKeys - Array of role keys to check
 * @returns Promise<boolean>
 */
export async function hasAllRoles(roleKeys: string[]): Promise<boolean> {
  const user = await overskill.auth.checkSession()
  if (roleKeys.every(key => (user?.app_context?.roles ?? []).includes(key))) return true

  if (await refreshRolesOnce()) {
    const refreshed = await overskill.auth.checkSession()
    const userRoles = refreshed?.app_context?.roles ?? []
    return roleKeys.every(key => userRoles.includes(key))
  }
  return false
}

/**
 * Check if the current user has a specific permission
 * @param permissionKey - The permission key to check
 * @returns Promise<boolean>
 */
export async function hasPermission(permissionKey: string): Promise<boolean> {
  const user = await overskill.auth.checkSession()
  if (Boolean(user?.app_context?.permissions?.[permissionKey])) return true

  if (await refreshRolesOnce()) {
    const refreshed = await overskill.auth.checkSession()
    return Boolean(refreshed?.app_context?.permissions?.[permissionKey])
  }
  return false
}

/**
 * Get a permission value for the current user
 * @param permissionKey - The permission key to get
 * @param defaultValue - Default value if permission is not set
 * @returns Promise<T>
 */
export async function getPermission<T = boolean | number | string>(
  permissionKey: string,
  defaultValue?: T
): Promise<T> {
  const user = await overskill.auth.checkSession()
  const value = user?.app_context?.permissions?.[permissionKey]
  if (value === undefined) {
    return defaultValue as T
  }
  return value as T
}

/**
 * Get all roles for the current user
 * @returns Promise<string[]>
 */
export async function getUserRoles(): Promise<string[]> {
  const user = await overskill.auth.checkSession()
  return user?.app_context?.roles ?? []
}

/**
 * Get all permissions for the current user
 * @returns Promise<Record<string, any>>
 */
export async function getUserPermissions(): Promise<Record<string, boolean | number | string | string[]>> {
  const user = await overskill.auth.checkSession()
  return user?.app_context?.permissions ?? {}
}

// ============================================================================
// React Hook for Authentication
// ============================================================================

/**
 * React hook for authentication state management
 * Use this in components that need to react to auth state changes
 *
 * @example
 * ```tsx
 * function ProfilePage() {
 *   const { user, loading, logout } = useAuth()
 *
 *   if (loading) return <Spinner />
 *   if (!user) return <Navigate to="/login" />
 *
 *   return (
 *     <div>
 *       <p>Welcome, {user.email}!</p>
 *       <button onClick={logout}>Logout</button>
 *     </div>
 *   )
 * }
 * ```
 */
export function useAuth() {
  const [user, setUser] = useState<OverSkillUser | null>(null)
  const [loading, setLoading] = useState(true)

  // Check session on mount + listen for preview auth token arrival
  useEffect(() => {
    let mounted = true

    // Detect HMR preview mode (iframe on sprites.app, overskillprojects.com,
    // e2b.app, or overskillprojects.dev — the proxy zone for E2B).
    // May 2026: e2b.app + overskillprojects.dev added so login-required apps
    // in E2B sandboxes use the JWT-local-decode fast path;
    // otherwise the API call race makes auth flicker through
    // "loading → unauthenticated" before the token is parsed.
    const isInIframe = typeof window !== 'undefined' && window.self !== window.top
    const hostname = typeof window !== 'undefined' ? window.location.hostname : ''
    const isHmrPreview = isInIframe && (
      hostname.includes('sprites.app') ||
      hostname.includes('overskillprojects.com') ||
      hostname.includes('e2b.app') ||
      hostname.includes('overskillprojects.dev')
    )
    async function checkAuth() {
      try {
        // In HMR preview mode, try to decode JWT locally first
        // to avoid API call race condition with preview auth postMessage flow
        if (isHmrPreview) {
          const token = localStorage.getItem('overskill_token')
          if (token) {
            try {
              const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
              // Check if token is not expired
              if (payload.exp && payload.exp > Date.now() / 1000) {
                const localUser: OverSkillUser = {
                  // OS-7E39Q8: must match the Worker's identity precedence,
                  // NOT bare `sub` — see resolveEffectiveUserId().
                  id: resolveEffectiveUserId(payload) as string,
                  email: payload.email,
                  name: payload.name,
                  app_context: payload.app_context
                }
                if (mounted) {
                  setUser(localUser)
                  setLoading(false)
                }
                console.log('[useAuth] HMR preview: decoded user from JWT locally')
                return
              }
            } catch {
              // Token decode failed, fall through to normal check
            }
          }
          // No valid token yet in preview mode — stay in loading state
          // and wait for preview-auth-ready event
          console.log('[useAuth] HMR preview: no valid token yet, waiting for preview auth...')
          return
        }

        const currentUser = await overskill.auth.checkSession()
        if (mounted) {
          setUser(toOverSkillUser(currentUser))
          setLoading(false)
        }
      } catch (error) {
        console.error('[useAuth] Failed to check session:', error)
        if (mounted) {
          setUser(null)
          setLoading(false)
        }
      }
    }

    checkAuth()

    // In HMR preview mode, listen for preview-auth-ready event.
    // This fires after preview-auth.ts receives the token from the parent editor
    function handlePreviewAuthReady() {
      if (!mounted) return
      console.log('[useAuth] Preview auth ready — re-checking session')
      setLoading(true)

      // Token was just set by preview-auth.ts via overskill.auth.setToken()
      // Decode locally to avoid API race condition
      const token = localStorage.getItem('overskill_token')
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
          if (payload.exp && payload.exp > Date.now() / 1000) {
            const localUser: OverSkillUser = {
              // OS-7E39Q8: must match the Worker's identity precedence,
              // NOT bare `sub` — see resolveEffectiveUserId().
              id: resolveEffectiveUserId(payload) as string,
              email: payload.email,
              name: payload.name,
              app_context: payload.app_context
            }
            if (mounted) {
              setUser(localUser)
              setLoading(false)
            }
            console.log('[useAuth] Preview auth: user set from JWT')
            return
          }
        } catch {
          // Fall through
        }
      }

      // Fallback: try API call (token should be valid now)
      overskill.auth.checkSession().then(currentUser => {
        if (mounted) {
          setUser(toOverSkillUser(currentUser))
          setLoading(false)
        }
      }).catch(() => {
        if (mounted) {
          setUser(null)
          setLoading(false)
        }
      })
    }

    if (isHmrPreview) {
      window.addEventListener('preview-auth-ready', handlePreviewAuthReady)
    }

    // Apr 2026: when the SDK clears the stored token after a 401 (stale,
    // expired, partial-OAuth-callback, etc.), re-render this component
    // as logged-out. Without this, the local-decode optimization above
    // would keep showing the cached user from the JWT payload forever
    // even though every API call is failing — that's the bug Todd hit
    // where the sidebar showed "Todd User" but APIs returned 401.
    function handleAuthCleared() {
      if (!mounted) return
      console.warn('[useAuth] Auth cleared by SDK (401 received) — clearing user state')
      setUser(null)
      setLoading(false)
    }
    window.addEventListener('overskill:auth-cleared', handleAuthCleared)

    return () => {
      mounted = false
      if (isHmrPreview) {
        window.removeEventListener('preview-auth-ready', handlePreviewAuthReady)
      }
      window.removeEventListener('overskill:auth-cleared', handleAuthCleared)
    }
  }, [])

  // Login function
  const login = useCallback(() => {
    overskill.auth.login()
  }, [])

  // Logout function
  const logout = useCallback(() => {
    overskill.auth.logout()
    setUser(null)
  }, [])

  // Refresh user data
  const refreshUser = useCallback(async () => {
    try {
      const currentUser = await overskill.auth.checkSession()
      const nextUser = toOverSkillUser(currentUser)
      setUser(nextUser)
      return nextUser
    } catch (error) {
      console.error('[useAuth] Failed to refresh user:', error)
      setUser(null)
      return null
    }
  }, [])

  return {
    user,
    loading,
    isAuthenticated: !!user,
    login,
    logout,
    refreshUser
  }
}
