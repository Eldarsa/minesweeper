'use client';

import { useState } from 'react';
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

  function submit() {
    const result = parseCoord(input, state.settings.rows, state.settings.cols);
    if ('error' in result) {
      dispatch({ type: 'inputError', kind: result.error });
      return;
    }
    if (result.kind === 'reveal') {
      dispatch({ type: 'reveal', row: result.row, col: result.col, now: Date.now() });
    } else {
      dispatch({ type: 'flag', row: result.row, col: result.col });
    }
    setInput('');
  }

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
      />
      <Board
        grid={state.grid}
        lastReveal={state.lastReveal}
        onReveal={(r, c) => dispatch({ type: 'reveal', row: r, col: c, now: Date.now() })}
        onFlag={(r, c) => dispatch({ type: 'flag', row: r, col: c })}
      />
      <MineRevealOverlay
        lastMine={state.lastMine}
        overlayDismissAt={state.overlayDismissAt}
        totalMines={totalMines}
        triggered={state.triggered}
        wildcardText={state.settings.wildcardText}
        onDismiss={() => dispatch({ type: 'dismissOverlay' })}
      />
    </div>
  );
}
