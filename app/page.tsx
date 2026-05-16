'use client';

import { useReducer, useMemo } from 'react';
import { initialState, makeReducer } from '@/lib/reducer';
import { SetupScreen } from '@/components/SetupScreen';
import { GameBoard } from '@/components/GameBoard';
import { EndScreen } from '@/components/EndScreen';

export default function Page() {
  const reducer = useMemo(() => makeReducer(Math.random), []);
  const [state, dispatch] = useReducer(reducer, initialState);

  if (state.phase === 'setup') {
    return <SetupScreen
      initial={state.settings}
      onStart={(settings) => {
        dispatch({ type: 'configure', settings });
        dispatch({ type: 'start', now: Date.now() });
      }}
    />;
  }
  if (state.phase === 'cleared') {
    return <EndScreen state={state} onPlayAgain={() => dispatch({ type: 'reset' })} />;
  }
  return <GameBoard state={state} dispatch={dispatch} />;
}
