import { useState, useEffect, useCallback } from 'react';

// FIX: Removed local WakeLockSentinel interface definition.
// The error "Two different types with this name exist" indicates that a global
// WakeLockSentinel type is available, and our local definition was conflicting with it.

// A type definition for the Navigator object with the wakeLock property.
// This will now use the globally available WakeLockSentinel type.
// FIX: Omit 'wakeLock' from the base Navigator type to redefine it as optional,
// resolving a conflict with newer DOM typings where it's a required property.
interface NavigatorWithWakeLock extends Omit<Navigator, 'wakeLock'> {
  wakeLock?: {
    request: (type: 'screen') => Promise<WakeLockSentinel>;
  };
}

// FIX: Add an extended interface for ScreenOrientation.
// This is to include the `lock` method, which might be missing from the default
// TypeScript DOM library typings, causing a property access error.
interface ScreenOrientationWithLock extends ScreenOrientation {
  lock(orientation: 'landscape'): Promise<void>;
}


export const useScreenControls = () => {
    const [isFullscreen, setIsFullscreen] = useState(!!document.fullscreenElement);
    const [wakeLock, setWakeLock] = useState<WakeLockSentinel | null>(null);
    const [isWakeLockSupported, setIsWakeLockSupported] = useState(false);
    
    useEffect(() => {
        setIsWakeLockSupported('wakeLock' in navigator);
    }, []);

    const handleFullscreenChange = useCallback(() => {
        setIsFullscreen(!!document.fullscreenElement);
    }, []);

    useEffect(() => {
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, [handleFullscreenChange]);

    const toggleFullscreen = useCallback(async () => {
        if (!document.fullscreenElement) {
            try {
                await document.documentElement.requestFullscreen();
            } catch (err: any) {
                console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
            }
        } else {
            if (document.exitFullscreen) {
                await document.exitFullscreen();
            }
        }
    }, []);
    
    const requestWakeLock = useCallback(async () => {
        const nav = navigator as NavigatorWithWakeLock;
        if (nav.wakeLock) {
            try {
                const lock = await nav.wakeLock.request('screen');
                setWakeLock(lock);
                lock.addEventListener('release', () => {
                    // This event is fired when the lock is released by the system.
                    setWakeLock(null);
                });
            } catch (err: any) {
                console.error(`Screen Wake Lock request failed: ${err.name}, ${err.message}`);
            }
        }
    }, []);

    const releaseWakeLock = useCallback(async () => {
        if (wakeLock && !wakeLock.released) {
            await wakeLock.release();
            setWakeLock(null);
        }
    }, [wakeLock]);

    const lockOrientation = useCallback(async () => {
        try {
            // Check if the screen.orientation object and its lock method are available.
            // FIX: Cast screen.orientation to our extended interface to access the .lock() method.
            const orientation = screen.orientation as ScreenOrientationWithLock;
            if (orientation && typeof orientation.lock === 'function') {
                await orientation.lock('landscape');
            }
        } catch (err: any) {
            console.error(`Error attempting to lock orientation: ${err.name}, ${err.message}`);
        }
    }, []);

    const unlockOrientation = useCallback(() => {
        // Check if the screen.orientation object and its unlock method are available.
        if (screen.orientation && typeof screen.orientation.unlock === 'function') {
            screen.orientation.unlock();
        }
    }, []);
    
    // Re-acquire wake lock if document becomes visible again
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (wakeLock && document.visibilityState === 'visible') {
                requestWakeLock();
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [wakeLock, requestWakeLock]);
    
    return { 
        isFullscreen, 
        toggleFullscreen,
        isWakeLockActive: !!wakeLock,
        isWakeLockSupported,
        requestWakeLock,
        releaseWakeLock,
        lockOrientation,
        unlockOrientation,
    };
};
