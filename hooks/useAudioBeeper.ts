
import { useRef, useEffect, useCallback } from 'react';
import { MIN_BEEP_DISTANCE_IN, MAX_BEEP_DISTANCE_IN, GUIDELINE_DISTANCES } from '../constants';

export const useAudioBeeper = (distance: number | null, isMuted: boolean) => {
    const audioContextRef = useRef<AudioContext | null>(null);
    const oscillatorRef = useRef<OscillatorNode | null>(null);
    const gainNodeRef = useRef<GainNode | null>(null);
    // FIX: Changed NodeJS.Timeout to ReturnType<typeof setTimeout> for browser compatibility.
    const beepTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const initializeAudio = useCallback(() => {
        if (!audioContextRef.current) {
            try {
                const context = new (window.AudioContext || (window as any).webkitAudioContext)();
                const gainNode = context.createGain();
                gainNode.connect(context.destination);
                gainNode.gain.setValueAtTime(0, context.currentTime);

                audioContextRef.current = context;
                gainNodeRef.current = gainNode;
                
                if (context.state === 'suspended') {
                    context.resume();
                }
            } catch (e) {
                console.error("Web Audio API is not supported in this browser", e);
            }
        }
    }, []);

    const stopSound = useCallback(() => {
        if (beepTimeoutRef.current) {
            clearTimeout(beepTimeoutRef.current);
            beepTimeoutRef.current = null;
        }
        if (oscillatorRef.current) {
            try {
                oscillatorRef.current.stop();
            } catch (e) {
                // Oscillator may have already been stopped.
            }
            oscillatorRef.current.disconnect();
            oscillatorRef.current = null;
        }
    }, []);

    const playSound = useCallback((dist: number) => {
        const audioContext = audioContextRef.current;
        const gainNode = gainNodeRef.current;

        if (!audioContext || !gainNode) return;

        stopSound();

        const isInBeepingRange = dist >= MIN_BEEP_DISTANCE_IN && dist <= MAX_BEEP_DISTANCE_IN;

        if (!isInBeepingRange) {
            return;
        }

        const maxFreq = 1200;
        const minFreq = 300;
        const maxVolume = 0.5;

        // Invert distance for frequency (closer = higher pitch)
        const effectiveRange = MAX_BEEP_DISTANCE_IN - MIN_BEEP_DISTANCE_IN;
        const normalizedDist = Math.max(0, Math.min(1, (dist - MIN_BEEP_DISTANCE_IN) / effectiveRange));
        const invertedNormalizedDist = 1 - normalizedDist;

        const freq = minFreq + (maxFreq - minFreq) * invertedNormalizedDist;
        const volume = maxVolume * invertedNormalizedDist;

        // Solid tone when very close
        if (dist <= GUIDELINE_DISTANCES.red) {
            const oscillator = audioContext.createOscillator();
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(freq, audioContext.currentTime);
            oscillator.connect(gainNode);
            oscillator.start(0);
            gainNode.gain.linearRampToValueAtTime(maxVolume, audioContext.currentTime + 0.01);
            oscillatorRef.current = oscillator;
        } else { // Intermittent beeps
            const beepDuration = 0.06; // 60ms
            const beepInterval = 0.1 + normalizedDist * 0.7; // Interval gets shorter as you get closer

            const beep = () => {
                const osc = audioContext.createOscillator();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, audioContext.currentTime);
                osc.connect(gainNode);
                osc.start(audioContext.currentTime);
                osc.stop(audioContext.currentTime + beepDuration);

                gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + beepDuration);

                beepTimeoutRef.current = setTimeout(beep, (beepInterval + beepDuration) * 1000);
            };
            beep();
        }

    }, [stopSound]);

    useEffect(() => {
        if (isMuted) {
            stopSound();
            return;
        }

        if (distance !== null && audioContextRef.current && audioContextRef.current.state === 'running') {
            playSound(distance);
        } else {
            stopSound();
        }

        return () => {
            stopSound();
        };
    }, [distance, playSound, isMuted, stopSound]);

    return { initializeAudio };
};