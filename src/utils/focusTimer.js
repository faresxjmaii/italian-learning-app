export const FOCUS_TIMER_STORAGE_KEY = 'italian-learning-app:focus-timer';

export const FOCUS_TIMER_MODES = {
  pomodoro: { label: 'Pomodoro', minutes: 25 },
  shortBreak: { label: 'Short Break', minutes: 5 },
  longBreak: { label: 'Long Break', minutes: 15 },
};

export const TIMER_STATUS = {
  START: 'start',
  PAUSE: 'pause',
  FINISHED: 'finished',
};

export const getModeDuration = (mode) => FOCUS_TIMER_MODES[mode].minutes * 60;

export const getRemainingFromEndTime = (endTime) => {
  if (!endTime) return 0;

  return Math.max(Math.ceil((endTime - Date.now()) / 1000), 0);
};

export const playFocusTimerAlarm = () => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;

    const ctx = new AudioContext();
    const playBeep = (time) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, ctx.currentTime + time);
      gain.gain.setValueAtTime(0, ctx.currentTime + time);
      gain.gain.linearRampToValueAtTime(1, ctx.currentTime + time + 0.05);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + time + 0.5);
      osc.start(ctx.currentTime + time);
      osc.stop(ctx.currentTime + time + 0.5);
    };

    playBeep(0);
    playBeep(0.6);
    playBeep(1.2);
  } catch {
    // Browsers can block audio until the user interacts with the page.
  }
};
