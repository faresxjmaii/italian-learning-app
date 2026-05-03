import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';

const ITALIAN_VOICE_FALLBACK =
  'Prova Chrome o Edge, oppure installa una voce italiana sul tuo sistema.';

const isItalianVoice = (voice) => voice.lang?.toLowerCase().startsWith('it');
const isFemaleVoice = (voice) => {
  const name = voice.name.toLowerCase();
  return name.includes('female') || name.includes('woman') || name.includes('elsa') || name.includes('zira') || name.includes('morante');
};

export const useTTS = () => {
  const [voices, setVoices] = useState([]);
  const [italianVoices, setItalianVoices] = useState([]);
  const [voicesLoaded, setVoicesLoaded] = useState(false);
  const [isSupported, setIsSupported] = useState(true);

  const readVoices = useCallback(() => {
    if (!('speechSynthesis' in window)) {
      setIsSupported(false);
      setVoicesLoaded(true);
      return [];
    }

    const availableVoices = window.speechSynthesis.getVoices();
    const itVoices = availableVoices.filter(isItalianVoice);

    setVoices(availableVoices);
    setItalianVoices(itVoices);
    setVoicesLoaded(true);

    return availableVoices;
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(readVoices, 0);

    if ('speechSynthesis' in window) {
      const synth = window.speechSynthesis;
      synth.onvoiceschanged = readVoices;
      return () => {
        window.clearTimeout(timeout);
        synth.onvoiceschanged = null;
      };
    }

    return () => window.clearTimeout(timeout);
  }, [readVoices]);

  const waitForVoices = useCallback(() => {
    if (!('speechSynthesis' in window)) return Promise.resolve([]);
    
    const immediateVoices = window.speechSynthesis.getVoices();
    if (immediateVoices.length > 0) return Promise.resolve(readVoices());

    return new Promise((resolve) => {
      const handler = () => resolve(readVoices());
      window.speechSynthesis.addEventListener('voiceschanged', handler, { once: true });
      setTimeout(() => {
        window.speechSynthesis.removeEventListener('voiceschanged', handler);
        resolve(readVoices());
      }, 1500);
    });
  }, [readVoices]);

  const notifyMissingItalianVoice = useCallback(() => {
    toast(
      (t) => (
        <div className="flex flex-col gap-2">
          <span className="font-bold text-amber-800 text-sm">
            Il browser attuale non fornisce una voce italiana.
          </span>
          <span className="text-xs text-amber-700/90 leading-tight">
            {ITALIAN_VOICE_FALLBACK}
          </span>
          <button
            onClick={() => toast.dismiss(t.id)}
            className="mt-1 text-xs underline text-amber-700 self-start"
          >
            Chiudi
          </button>
        </div>
      ),
      {
        duration: 7000,
        style: { background: '#FFFBEB', border: '1px solid #FCD34D' }
      }
    );
  }, []);

  const refreshVoices = useCallback(() => readVoices(), [readVoices]);

  const speak = useCallback(async (text) => {
    if (!text?.trim()) return;

    if (!('speechSynthesis' in window)) {
      notifyMissingItalianVoice();
      return;
    }

    const availableVoices = await waitForVoices();
    const itVoices = availableVoices.filter(isItalianVoice);
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'it-IT';

    if (itVoices.length > 0) {
      let chosenVoice = itVoices.find(isFemaleVoice);
      if (!chosenVoice) chosenVoice = itVoices[0];
      
      utterance.voice = chosenVoice;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    } else {
      notifyMissingItalianVoice();
    }
  }, [notifyMissingItalianVoice, waitForVoices]);

  return {
    speak,
    voices,
    italianVoices,
    voicesLoaded,
    isSupported,
    refreshVoices,
    fallbackMessage: ITALIAN_VOICE_FALLBACK
  };
};
