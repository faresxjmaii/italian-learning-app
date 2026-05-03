import { Play, Pause, RotateCcw, Timer } from 'lucide-react';
import useFocusTimer from '../hooks/useFocusTimer';

const formatTime = (seconds) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
};

const FocusTimer = () => {
  const {
    mode,
    modes,
    timeLeft,
    isActive,
    isFinished,
    changeMode,
    resetTimer,
    toggleTimer,
  } = useFocusTimer();

  return (
    <section className="card p-5 border-t border-primary-800/60">
      <div className="flex flex-col items-center justify-center">
        <div className="w-full flex items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-100 flex items-center gap-2">
              <Timer className="text-primary-400" /> Time to Focus
            </h2>
            <p className="text-sm text-gray-500 mt-1">Sessioni brevi per studiare con calma.</p>
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-2 mb-5 bg-[#11191d] p-1.5 rounded-lg border border-white/10">
          {Object.entries(modes).map(([key, { label }]) => (
            <button
              type="button"
              key={key}
              onClick={() => changeMode(key)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                mode === key
                  ? 'bg-primary-900/35 text-primary-300 shadow-sm border border-primary-800/60'
                  : 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.04]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className={`text-5xl md:text-6xl font-black mb-1 font-mono select-none transition-colors ${
          isFinished ? 'text-red-500 animate-pulse' : 'text-gray-100'
        }`}>
          {formatTime(timeLeft)}
        </div>

        <div className={`h-7 mb-4 text-base font-bold text-primary-400 transition-opacity ${isFinished ? 'opacity-100' : 'opacity-0'}`}>
          Il tempo è scaduto!
        </div>

        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={toggleTimer}
            className={`btn-primary px-7 py-2.5 text-base font-bold min-w-[130px] ${
              isActive ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-900/30 shadow-lg' : 'shadow-primary-900/30 shadow-lg'
            }`}
          >
            {isActive ? <Pause size={24} /> : <Play size={24} className="ml-1" />}
            <span>{isActive ? 'Pause' : 'Start'}</span>
          </button>

          <button
            type="button"
            onClick={resetTimer}
            className="p-3 text-gray-400 hover:text-gray-200 hover:bg-white/[0.04] rounded-lg transition-colors bg-[#11191d] border border-white/10 shadow-sm"
            title="Reset Timer"
          >
            <RotateCcw size={24} />
          </button>
        </div>
      </div>
    </section>
  );
};

export default FocusTimer;
