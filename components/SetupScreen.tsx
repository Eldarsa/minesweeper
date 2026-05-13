'use client';

import { useState } from 'react';
import type { Settings } from '@/lib/types';

const PRESETS: Record<string, { rows: number; cols: number; total: number; suggestedMix: { shot: number; ice: number; wild: number } }> = {
  Lett:        { rows: 9,  cols: 9,  total: 10, suggestedMix: { shot: 5,  ice: 4,  wild: 1 } },
  Middels:     { rows: 12, cols: 14, total: 22, suggestedMix: { shot: 10, ice: 8,  wild: 4 } },
  Vanskelig:   { rows: 16, cols: 24, total: 60, suggestedMix: { shot: 28, ice: 22, wild: 10 } },
};

type Props = {
  initial: Settings;
  onStart: (settings: Settings) => void;
};

export function SetupScreen({ initial, onStart }: Props) {
  const [rows, setRows] = useState(initial.rows);
  const [cols, setCols] = useState(initial.cols);
  const [mix, setMix] = useState(initial.mix);
  const [wildcardText, setWildcardText] = useState(initial.wildcardText);
  const [presetName, setPresetName] = useState<keyof typeof PRESETS | 'Tilpasset'>('Middels');

  const total = mix.shot + mix.ice + mix.wild;
  const cap = rows * cols - 9; // first-click safety zone
  const isValid =
    rows >= 5 && rows <= 16 &&
    cols >= 5 && cols <= 26 &&
    total >= 1 && total <= cap &&
    wildcardText.trim().length > 0;

  function applyPreset(name: keyof typeof PRESETS) {
    const p = PRESETS[name];
    setPresetName(name);
    setRows(p.rows);
    setCols(p.cols);
    setMix(p.suggestedMix);
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100vh', width: '100vw', padding: 24,
    }}>
      <div style={{
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.14)',
        borderRadius: 24, padding: 32,
        width: 'min(560px, 100%)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
      }}>
        <h1 style={{
          fontSize: 36, margin: 0, fontWeight: 900,
          background: 'linear-gradient(90deg, #ff5c8a, #ff9a3c, #ffd23f, #2ec4b6, #b85cff)',
          WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
        }}>🎉 Festminesveiper</h1>
        <p style={{ color: 'var(--muted-on-dark)', marginTop: 4 }}>Velg vanskelighetsgrad og hvilke straffer som ligger i minene.</p>

        <div style={{ display: 'flex', gap: 8, marginTop: 20, flexWrap: 'wrap' }}>
          {Object.keys(PRESETS).map(name => (
            <button key={name} onClick={() => applyPreset(name as keyof typeof PRESETS)}
              style={presetButton(presetName === name)}>{name}</button>
          ))}
          <button onClick={() => setPresetName('Tilpasset')}
            style={presetButton(presetName === 'Tilpasset')}>Tilpasset</button>
        </div>

        {presetName === 'Tilpasset' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 16 }}>
            <NumField label="Rader (5–16)" value={rows} onChange={setRows} min={5} max={16} />
            <NumField label="Kolonner (5–26)" value={cols} onChange={setCols} min={5} max={26} />
          </div>
        )}

        <h3 style={{ marginTop: 22, marginBottom: 8, fontSize: 14, color: 'var(--muted-on-dark)', textTransform: 'uppercase', letterSpacing: '.08em' }}>
          Mineblanding ({total} / cap {cap})
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          <NumField label="🥃 Shots" value={mix.shot} onChange={v => setMix({ ...mix, shot: v })} min={0} max={cap} />
          <NumField label="❄ Iser"   value={mix.ice}  onChange={v => setMix({ ...mix, ice: v })}  min={0} max={cap} />
          <NumField label="🎲 Jokere" value={mix.wild} onChange={v => setMix({ ...mix, wild: v })} min={0} max={cap} />
        </div>

        <h3 style={{ marginTop: 22, marginBottom: 8, fontSize: 14, color: 'var(--muted-on-dark)', textTransform: 'uppercase', letterSpacing: '.08em' }}>
          Joker-tekst
        </h3>
        <input
          value={wildcardText}
          onChange={e => setWildcardText(e.target.value)}
          placeholder="Bunns!"
          style={{
            width: '100%', padding: '10px 14px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.18)',
            background: 'rgba(255,255,255,0.06)', color: 'var(--text-on-dark)', fontSize: 16,
          }}
        />

        <button
          disabled={!isValid}
          onClick={() => onStart({ rows, cols, mix, wildcardText: wildcardText.trim() })}
          style={{
            marginTop: 24, width: '100%', padding: '14px 20px', borderRadius: 14,
            border: 'none', cursor: isValid ? 'pointer' : 'not-allowed',
            background: isValid ? 'linear-gradient(90deg, #ff5c8a, #b85cff)' : 'rgba(255,255,255,0.08)',
            color: '#fff', fontWeight: 900, fontSize: 18,
            boxShadow: isValid ? '0 10px 30px rgba(184,92,255,0.35)' : 'none',
          }}
        >
          Start spillet
        </button>
        {!isValid && (
          <p style={{ marginTop: 10, color: '#ffb3c0', fontSize: 13 }}>
            Sjekk at brettstørrelsen er innenfor grensene og at total mineantall er minst 1 og høyst {cap}.
          </p>
        )}
      </div>
    </div>
  );
}

function presetButton(active: boolean): React.CSSProperties {
  return {
    padding: '10px 16px', borderRadius: 999,
    border: active ? '2px solid #ffd23f' : '1px solid rgba(255,255,255,0.18)',
    background: active ? 'rgba(255,210,63,0.15)' : 'rgba(255,255,255,0.06)',
    color: 'var(--text-on-dark)', cursor: 'pointer', fontWeight: 700,
  };
}

function NumField({ label, value, onChange, min, max }: { label: string; value: number; onChange: (v: number) => void; min: number; max: number }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: 12, color: 'var(--muted-on-dark)', fontWeight: 700 }}>{label}</span>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={e => onChange(Math.max(min, Math.min(max, Number(e.target.value) || 0)))}
        style={{
          padding: '10px 12px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.18)',
          background: 'rgba(255,255,255,0.06)', color: 'var(--text-on-dark)', fontSize: 16, fontWeight: 700,
        }}
      />
    </label>
  );
}
