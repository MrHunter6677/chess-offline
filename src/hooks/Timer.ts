import { useEffect, useRef, useState } from "react";

type Time = {
    hours: number;
    minutes: number;
    seconds?: number;
};

type useTimerReturnType = {
    timeRemaining: Time;
    startTimer: () => void;
    pauseTimer: () => void;
    resetTimer: () => void;
    isRunning: boolean;
};

function timeToSeconds(time: Time): number {
    return time.hours * 3600 + time.minutes * 60 + (time.seconds ?? 0);
}

function secondsToTime(seconds: number): Time {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return { hours: hrs, minutes: mins, seconds: secs };
}

interface UseTimerOptions {
    autoStart?: boolean;
    onComplete?: () => void;
}

export function useTimer(
    initialTime: Time,
    rate: number = 1000,
    options: UseTimerOptions = {}
): useTimerReturnType {
    const [remainingSeconds, setRemainingSeconds] = useState(() => timeToSeconds(initialTime));
    const [isRunning, setIsRunning] = useState(options.autoStart ?? false);
    const intervalRef = useRef<number | null>(null);
    const initialSecondsRef = useRef(timeToSeconds(initialTime));

    const startTimer = () => {
        if (intervalRef.current !== null) return;
        setIsRunning(true);
        intervalRef.current = window.setInterval(() => {
            setRemainingSeconds((prev) => {
                if (prev <= 1) {
                    clearInterval(intervalRef.current!);
                    intervalRef.current = null;
                    setIsRunning(false);
                    options.onComplete?.();
                    return 0;
                }
                return prev - 1;
            });
        }, rate);
    };

    const pauseTimer = () => {
        if (intervalRef.current !== null) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
            setIsRunning(false);
        }
    };

    const resetTimer = () => {
        pauseTimer();
        const seconds = initialSecondsRef.current;
        setRemainingSeconds(seconds);
    };

    useEffect(() => {
        return () => {
            if (intervalRef.current !== null) {
                clearInterval(intervalRef.current);
            }
        };
    }, []);

    useEffect(() => {
        if (options.autoStart) {
            startTimer();
        }
    }, []);

    return {
        timeRemaining: secondsToTime(remainingSeconds),
        startTimer,
        pauseTimer,
        resetTimer,
        isRunning
    };
}
