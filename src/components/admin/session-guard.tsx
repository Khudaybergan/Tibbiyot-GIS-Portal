'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ShieldAlert } from 'lucide-react';

const WARN_AFTER_MS = 25 * 60 * 1000;
const LOGOUT_AFTER_MS = 30 * 60 * 1000;
const CHECK_INTERVAL = 10_000;
const PING_THROTTLE = 60_000;

function formatSeconds(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function SessionGuard() {
  const pathname = usePathname();
  const lastActivityRef = useRef<number>(Date.now());
  const lastPingRef = useRef<number>(0);
  const [showWarning, setShowWarning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);

  const pingServer = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/activity', { method: 'POST' });
      if (res.status === 401) {
        window.location.replace('/api/auth/logout?reason=expired');
      }
    } catch {
      // network errors are silently ignored
    }
  }, []);

  const onActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    setShowWarning(false);

    const now = Date.now();
    if (now - lastPingRef.current >= PING_THROTTLE) {
      lastPingRef.current = now;
      pingServer();
    }
  }, [pingServer]);

  // Track route changes as activity
  useEffect(() => {
    onActivity();
  }, [pathname, onActivity]);

  // Register DOM event listeners
  useEffect(() => {
    const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'pointerdown'] as const;
    events.forEach((event) => {
      window.addEventListener(event, onActivity, { passive: true });
    });
    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, onActivity);
      });
    };
  }, [onActivity]);

  // Main inactivity check interval
  useEffect(() => {
    const interval = setInterval(() => {
      // Cross-tab sync: read session_last_activity from document.cookie
      const match = document.cookie.match(/(?:^|;\s*)session_last_activity=([^;]+)/);
      if (match) {
        const cookieTime = parseInt(match[1], 10);
        if (!isNaN(cookieTime) && cookieTime > lastActivityRef.current) {
          lastActivityRef.current = cookieTime;
        }
      }

      const inactive = Date.now() - lastActivityRef.current;

      if (inactive >= LOGOUT_AFTER_MS) {
        window.location.replace('/api/auth/logout?reason=inactivity');
        return;
      }

      if (inactive >= WARN_AFTER_MS) {
        const remaining = Math.max(0, Math.ceil((LOGOUT_AFTER_MS - inactive) / 1000));
        setSecondsLeft(remaining);
        setShowWarning(true);
      } else {
        setShowWarning(false);
      }
    }, CHECK_INTERVAL);

    return () => clearInterval(interval);
  }, []);

  // Countdown interval — only active when warning is shown
  useEffect(() => {
    if (!showWarning) return;

    const interval = setInterval(() => {
      const inactive = Date.now() - lastActivityRef.current;
      const remaining = Math.max(0, Math.ceil((LOGOUT_AFTER_MS - inactive) / 1000));
      setSecondsLeft(remaining);

      if (remaining === 0) {
        window.location.replace('/api/auth/logout?reason=inactivity');
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [showWarning]);

  const handleStayActive = useCallback(() => {
    setShowWarning(false);
    onActivity();
    pingServer();
  }, [onActivity, pingServer]);

  return (
    <Dialog open={showWarning} onOpenChange={(open) => { if (!open) handleStayActive(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-amber-500" />
            Faollik kuzatilmadi
          </DialogTitle>
          <DialogDescription>
            Xavfsizlik sababli{' '}
            <span className="font-semibold tabular-nums">{formatSeconds(secondsLeft)}</span>{' '}
            dan keyin tizimdan chiqasiz.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex flex-row justify-end gap-2 sm:justify-end">
          <Button
            variant="outline"
            onClick={() => window.location.replace('/api/auth/logout?reason=manual')}
          >
            Chiqish
          </Button>
          <Button onClick={handleStayActive}>Davom etish</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
