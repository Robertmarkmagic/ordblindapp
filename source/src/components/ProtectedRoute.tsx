// Protected Route Component
// Wraps content that requires authentication based on app visibility settings
//
// ARCHITECTURE: This component is the ONLY place that handles auth redirects.
// lib/auth.ts checkAppAccess() returns { allowed, redirect } but NEVER navigates.
// This component uses React Router <Navigate> for all redirects, keeping
// everything within the SPA (no full page reloads, no redirect loops).
//
// CRITICAL: In iframe preview mode, waits for overskill:preview-auth-ready event
// before checking authentication to avoid race conditions with async token delivery.
// See: docs/ultrathink/preview-auth-loop-jan-2026/ROOT_CAUSE_ANALYSIS.md
// Preview auth is supplied by the editor iframe handshake on E2B hosts.

import React from 'react';
import { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { checkAppAccess } from '@/lib/auth'
import type { AccessResult } from '@/lib/auth'

interface ProtectedRouteProps {
  children: React.ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const [isChecking, setIsChecking] = useState(true)
  const [accessResult, setAccessResult] = useState<AccessResult | null>(null)
  const [previewAuthReady, setPreviewAuthReady] = useState(false)
  const location = useLocation()

  // In iframe: Wait for preview-auth-ready event before checking access
  // This prevents race condition where we check auth before token arrives via postMessage
  useEffect(() => {
    const isInIframe = window.self !== window.top

    if (isInIframe) {
      console.log('[ProtectedRoute] In iframe - waiting for preview auth...')

      const handlePreviewAuthReady = () => {
        console.log('[ProtectedRoute] Preview auth ready event received')
        setPreviewAuthReady(true)
      }

      // Listen for both event names for compatibility
      // SDK dispatches 'overskill:preview-auth-ready', older code may dispatch 'preview-auth-ready'
      window.addEventListener('overskill:preview-auth-ready', handlePreviewAuthReady)
      window.addEventListener('preview-auth-ready', handlePreviewAuthReady)

      // Check if token already exists (preview auth may have completed before mount)
      if (localStorage.getItem('overskill_token')) {
        console.log('[ProtectedRoute] Token already exists in localStorage')
        setPreviewAuthReady(true)
      }

      // 2-second timeout fallback - don't wait forever
      const timeout = setTimeout(() => {
        console.log('[ProtectedRoute] Preview auth timeout - proceeding with check')
        setPreviewAuthReady(true)
      }, 2000)

      return () => {
        window.removeEventListener('overskill:preview-auth-ready', handlePreviewAuthReady)
        window.removeEventListener('preview-auth-ready', handlePreviewAuthReady)
        clearTimeout(timeout)
      }
    } else {
      // Not in iframe: proceed immediately (production mode)
      setPreviewAuthReady(true)
    }
  }, [])

  // Check access only after preview auth is ready
  useEffect(() => {
    if (!previewAuthReady) return

    console.log('[ProtectedRoute] Checking app access...')
    checkAppAccess().then(result => {
      console.log('[ProtectedRoute] Access check result:', result)
      setAccessResult(result)
      setIsChecking(false)
    }).catch((error) => {
      console.error('[ProtectedRoute] Access check error:', error)
      setAccessResult({ allowed: false, redirect: '/login', reason: 'unexpected_error' })
      setIsChecking(false)
    })
  }, [previewAuthReady])

  // Show loading state while checking access
  if (isChecking) {
    const isInIframe = typeof window !== 'undefined' && window.self !== window.top
    const message = isInIframe && !previewAuthReady
      ? 'Waiting for preview authentication...'
      : 'Checking access...'

    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="text-muted-foreground">{message}</p>
        </div>
      </div>
    )
  }

  // Access denied — redirect via React Router (SPA navigation, no page reload)
  if (accessResult && !accessResult.allowed && accessResult.redirect) {
    const redirectTarget = accessResult.redirect

    // For login redirects, preserve the current path so user returns here after login
    if (redirectTarget === '/login') {
      const returnPath = location.pathname + location.search
      console.log(`[ProtectedRoute] Redirecting to /login with return path: ${returnPath}`)
      return <Navigate to={`/login?redirect=${encodeURIComponent(returnPath)}`} replace />
    }

    // For other redirects (/purchase, /access-denied), redirect directly
    console.log(`[ProtectedRoute] Redirecting to ${redirectTarget} (reason: ${accessResult.reason})`)
    return <Navigate to={redirectTarget} replace />
  }

  // Access denied but no redirect specified (shouldn't happen, but be safe)
  if (accessResult && !accessResult.allowed) {
    return <Navigate to="/login" replace />
  }

  // Render protected content
  return <>{children}</>
}
