import { useContext } from 'react';
import { FocusTimerContext } from '../context/FocusTimerContext';

const useFocusTimer = () => {
  const timer = useContext(FocusTimerContext);

  if (!timer) {
    throw new Error('useFocusTimer must be used inside FocusTimerProvider');
  }

  return timer;
};

export default useFocusTimer;
