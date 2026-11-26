import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import type { PeriodMode, PeriodInfo } from "../utils/datePeriod";
import {
  calculatePeriod,
  canStepNext as checkCanStepNext,
  getNairobiDateString,
  getNairobiParts,
  DEFAULT_PERIOD,
} from "../utils/datePeriod";

export { DEFAULT_PERIOD };

export interface PeriodContextType {
  mode: PeriodMode;
  offset: number;
  customFrom: string;
  customTo: string;
  periodInfo: PeriodInfo;
  todayStr: string;
  canStepNext: boolean;
  setMode: (mode: PeriodMode) => void;
  setOffset: (updater: number | ((prev: number) => number)) => void;
  setCustomRange: (from: string, to: string) => void;
  resetPeriod: () => void;
  stepPrevious: () => void;
  stepNext: () => void;
}

const PeriodContext = createContext<PeriodContextType | null>(null);

export interface PeriodProviderProps {
  children: ReactNode;
  activeView?: string;
}

export function PeriodProvider({ children, activeView }: PeriodProviderProps) {
  // Always default to "today" with 0 offset. No localStorage or sessionStorage persistence.
  const [mode, setMode] = useState<PeriodMode>(DEFAULT_PERIOD);
  const [offset, setOffset] = useState<number>(0);
  const [customFrom, setCustomFrom] = useState<string>("");
  const [customTo, setCustomTo] = useState<string>("");
  const [todayStr, setTodayStr] = useState<string>(() => getNairobiDateString());

  const prevViewRef = useRef<string | undefined>(activeView);

  // Reset to DEFAULT_PERIOD = 'today' whenever activeView changes
  useEffect(() => {
    if (activeView !== undefined && prevViewRef.current !== undefined && prevViewRef.current !== activeView) {
      setMode(DEFAULT_PERIOD);
      setOffset(0);
      setCustomFrom("");
      setCustomTo("");
    }
    prevViewRef.current = activeView;
  }, [activeView]);

  // Midnight rollover in Africa/Nairobi timezone
  useEffect(() => {
    let timerId: ReturnType<typeof setTimeout> | null = null;

    function scheduleMidnight() {
      const parts = getNairobiParts();
      const msToday = ((parts.hour * 60 + parts.minute) * 60 + parts.second) * 1000;
      const msUntilMidnight = Math.max(1000, 86_400_000 - msToday + 1000); // 1s buffer past midnight

      timerId = setTimeout(() => {
        const nextToday = getNairobiDateString();
        setTodayStr(nextToday);
        scheduleMidnight();
      }, msUntilMidnight);
    }

    scheduleMidnight();

    // Secondary fallback poll every 60s for OS sleep/wake
    const intervalId = setInterval(() => {
      const currentToday = getNairobiDateString();
      setTodayStr((prev) => (prev !== currentToday ? currentToday : prev));
    }, 60_000);

    return () => {
      if (timerId) clearTimeout(timerId);
      clearInterval(intervalId);
    };
  }, []);

  const resetPeriod = useCallback(() => {
    setMode(DEFAULT_PERIOD);
    setOffset(0);
    setCustomFrom("");
    setCustomTo("");
  }, []);

  const setCustomRange = useCallback((from: string, to: string) => {
    setCustomFrom(from);
    setCustomTo(to);
    setMode("custom");
    setOffset(0);
  }, []);

  const periodInfo = useMemo<PeriodInfo>(() => {
    return calculatePeriod(mode, offset, customFrom, customTo, todayStr);
  }, [mode, offset, customFrom, customTo, todayStr]);

  const canStepNext = useMemo<boolean>(() => {
    return checkCanStepNext(mode, offset);
  }, [mode, offset]);

  const stepPrevious = useCallback(() => {
    setOffset((prev) => prev - 1);
  }, []);

  const stepNext = useCallback(() => {
    setOffset((prev) => {
      if (checkCanStepNext(mode, prev)) {
        return prev + 1;
      }
      return prev;
    });
  }, [mode]);

  const value = useMemo<PeriodContextType>(() => ({
    mode,
    offset,
    customFrom,
    customTo,
    periodInfo,
    todayStr,
    canStepNext,
    setMode,
    setOffset,
    setCustomRange,
    resetPeriod,
    stepPrevious,
    stepNext,
  }), [
    mode,
    offset,
    customFrom,
    customTo,
    periodInfo,
    todayStr,
    canStepNext,
    setMode,
    setOffset,
    setCustomRange,
    resetPeriod,
    stepPrevious,
    stepNext,
  ]);

  return <PeriodContext.Provider value={value}>{children}</PeriodContext.Provider>;
}

export function usePeriod(): PeriodContextType {
  const ctx = useContext(PeriodContext);
  if (!ctx) {
    throw new Error("usePeriod must be used within a PeriodProvider");
  }
  return ctx;
}
