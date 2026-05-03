import { useCallback, useEffect, useMemo, useState } from 'react';
import { FocusTimerContext } from '../context/FocusTimerContext';
import {
  FOCUS_TIMER_MODES,
  FOCUS_TIMER_STORAGE_KEY,
  TIMER_STATUS,
  getModeDuration,
  getRemainingFromEndTime,
  playFocusTimerAlarm,
} from '../utils/focusTimer';

const getDefaultState = () => ({
  mode: 'pomodoro',
  duration: getModeDuration('pomodoro'),
  timeLeft: getModeDuration('pomodoro'),
  endTime: null,
  status: TIMER_STATUS.PAUSE,
  completedEndTime: null,
  alarmedEndTime: null,
});

const loadSavedState = () => {
  try {
    const savedTimer = JSON.parse(localStorage.getItem(FOCUS_TIMER_STORAGE_KEY));
    if (!savedTimer || !FOCUS_TIMER_MODES[savedTimer.mode]) return getDefaultState();

    const mode = savedTimer.mode;
    const duration = Number(savedTimer.duration) || getModeDuration(mode);

    if (savedTimer.status === TIMER_STATUS.START && savedTimer.endTime) {
      const timeLeft = getRemainingFromEndTime(savedTimer.endTime);

      return {
        mode,
        duration,
        timeLeft,
        endTime: timeLeft > 0 ? savedTimer.endTime : null,
        status: timeLeft > 0 ? TIMER_STATUS.START : TIMER_STATUS.FINISHED,
        completedEndTime: timeLeft > 0 ? null : savedTimer.endTime,
        alarmedEndTime: savedTimer.alarmedEndTime || null,
      };
    }

    return {
      mode,
      duration,
      timeLeft: Math.min(Number(savedTimer.timeLeft) || duration, duration),
      endTime: null,
      status: savedTimer.status === TIMER_STATUS.FINISHED ? TIMER_STATUS.FINISHED : TIMER_STATUS.PAUSE,
      completedEndTime: savedTimer.completedEndTime || null,
      alarmedEndTime: savedTimer.alarmedEndTime || null,
    };
  } catch {
    return getDefaultState();
  }
};

const FocusTimerProvider = ({ children }) => {
  const [timer, setTimer] = useState(loadSavedState);

  useEffect(() => {
    try {
      localStorage.setItem(FOCUS_TIMER_STORAGE_KEY, JSON.stringify(timer));
    } catch {
      // Storage can be unavailable in private mode or restricted browsers.
    }
  }, [timer]);

  useEffect(() => {
    if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    if (timer.status !== TIMER_STATUS.START || !timer.endTime) return undefined;

    const updateTimeLeft = () => {
      setTimer((currentTimer) => {
        if (currentTimer.status !== TIMER_STATUS.START || !currentTimer.endTime) return currentTimer;

        const timeLeft = getRemainingFromEndTime(currentTimer.endTime);
        if (timeLeft > 0) return { ...currentTimer, timeLeft };

        return {
          ...currentTimer,
          timeLeft: 0,
          endTime: null,
          status: TIMER_STATUS.FINISHED,
          completedEndTime: currentTimer.endTime,
        };
      });
    };

    updateTimeLeft();
    const interval = window.setInterval(updateTimeLeft, 1000);
    return () => window.clearInterval(interval);
  }, [timer.status, timer.endTime]);

  useEffect(() => {
    if (
      timer.status !== TIMER_STATUS.FINISHED ||
      !timer.completedEndTime ||
      timer.alarmedEndTime === timer.completedEndTime
    ) {
      return;
    }

    playFocusTimerAlarm();

    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Il tempo è scaduto!', {
        body: `La tua sessione ${FOCUS_TIMER_MODES[timer.mode].label} è terminata.`,
        icon: '/favicon.svg',
      });
    }

    const alarmedUpdate = window.setTimeout(() => {
      setTimer((currentTimer) => ({
        ...currentTimer,
        alarmedEndTime: currentTimer.completedEndTime,
      }));
    }, 0);

    return () => window.clearTimeout(alarmedUpdate);
  }, [timer.status, timer.completedEndTime, timer.alarmedEndTime, timer.mode]);

  const changeMode = useCallback((mode) => {
    const duration = getModeDuration(mode);
    setTimer({
      mode,
      duration,
      timeLeft: duration,
      endTime: null,
      status: TIMER_STATUS.PAUSE,
      completedEndTime: null,
      alarmedEndTime: null,
    });
  }, []);

  const resetTimer = useCallback(() => {
    setTimer((currentTimer) => ({
      ...currentTimer,
      duration: getModeDuration(currentTimer.mode),
      timeLeft: getModeDuration(currentTimer.mode),
      endTime: null,
      status: TIMER_STATUS.PAUSE,
      completedEndTime: null,
      alarmedEndTime: null,
    }));
  }, []);

  const toggleTimer = useCallback(() => {
    setTimer((currentTimer) => {
      if (currentTimer.status === TIMER_STATUS.START) {
        return {
          ...currentTimer,
          timeLeft: getRemainingFromEndTime(currentTimer.endTime),
          endTime: null,
          status: TIMER_STATUS.PAUSE,
        };
      }

      const timeLeft = currentTimer.status === TIMER_STATUS.FINISHED
        ? currentTimer.duration
        : Math.max(currentTimer.timeLeft, 1);

      return {
        ...currentTimer,
        timeLeft,
        endTime: Date.now() + timeLeft * 1000,
        status: TIMER_STATUS.START,
        completedEndTime: null,
        alarmedEndTime: null,
      };
    });
  }, []);

  const value = useMemo(() => ({
    ...timer,
    isActive: timer.status === TIMER_STATUS.START,
    isFinished: timer.status === TIMER_STATUS.FINISHED,
    modes: FOCUS_TIMER_MODES,
    changeMode,
    resetTimer,
    toggleTimer,
  }), [timer, changeMode, resetTimer, toggleTimer]);

  return (
    <FocusTimerContext.Provider value={value}>
      {children}
    </FocusTimerContext.Provider>
  );
};

export default FocusTimerProvider;
