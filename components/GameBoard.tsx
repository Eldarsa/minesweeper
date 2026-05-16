'use client';

import { useCallback, useState } from 'react';
import type { GameState, Action } from '@/lib/types';
import { parseCoord } from '@/lib/coords';
import { Hud } from './Hud';
import { Board } from './Board';
import { MineRevealOverlay } from './MineRevealOverlay';

type Props = {
  state: GameState;
  dispatch: (action: Action) => void;
};

export function GameBoard({ state, dispatch }: Props) {
  const [input, setInput] = useState('');
  const totalMines = state.settings.mix.shot + state.settings.mix.ice + state.settings.mix.wild;
  const isRandomPlayer = state.settings.mode === 'random-player';
  const overlayUp = state.overlayDismissAt !== null;
  const inputDisabled = isRandomPlayer && overlayUp;

  function submit() {
    if (inputDisabled) return;
    const result = parseCoord(input, state.settings.rows, state.settings.cols);
    if ('error' in result) {
      dispatch({ type: 'inputError', kind: result.error });
      return;
    }
    if (result.kind === 'flag') {
      if (isRandomPlayer) {
        dispatch({ type: 'inputError', kind: 'flagsDisabled' });
        return;
      }
      dispatch({ type: 'flag', row: result.row, col: result.col });
    } else {
      dispatch({ type: 'reveal', row: result.row, col: result.col, now: Date.now() });
    }
    setInput('');
  }

  const onTurnExpire = useCallback(() => {
    dispatch({ type: 'turnTimeout', now: Date.now() });
  }, [dispatch]);

  return (
    <div style={{
      height: '100vh', width: '100vw',
      display: 'flex', flexDirection: 'column',
      padding: '14px 18px 18px',
    }}>
      <Hud
        totalMines={totalMines}
        triggered={state.triggered}
        inputValue={input}
        inputError={state.inputError}
        onInputChange={(v) => { setInput(v); if (state.inputError) dispatch({ type: 'clearInputError' }); }}
        onSubmit={submit}
        onExit={() => dispatch({ type: 'reset' })}
        mode={state.settings.mode}
        players={state.settings.players}
        currentPlayerIdx={state.currentPlayerIdx}
        turnExpiresAt={state.turnExpiresAt}
        turnSeconds={state.settings.turnSeconds}
        onTurnExpire={onTurnExpire}
        inputDisabled={inputDisabled}
      />
      <Board
        grid={state.grid}
        lastReveal={state.lastReveal}
        onReveal={(r, c) => dispatch({ type: 'reveal', row: r, col: c, now: Date.now() })}
        onFlag={(r, c) => {
          if (isRandomPlayer) {
            dispatch({ type: 'inputError', kind: 'flagsDisabled' });
            return;
          }
          dispatch({ type: 'flag', row: r, col: c });
        }}
      />
      <MineRevealOverlay
        mode={state.settings.mode}
        lastMine={state.lastMine}
        overlayDismissAt={state.overlayDismissAt}
        totalMines={totalMines}
        triggered={state.triggered}
        wildcardText={state.settings.wildcardText}
        currentPlayerName={state.currentPlayerIdx !== null
          ? state.settings.players[state.currentPlayerIdx]?.name ?? null
          : null}
        onDismiss={() => dispatch({ type: 'dismissOverlay', now: Date.now() })}
      />
    </div>
  );
}
