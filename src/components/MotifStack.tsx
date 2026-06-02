import type { CSSProperties } from 'react';

export const palette = [
  '#f5c800',
  '#e8a41c',
  '#f4821f',
  '#d94f2b',
  '#b5446a',
  '#8c4f8b',
  '#5b4fa0',
  '#2b9fd4',
  '#2aa8a0',
  '#3fad5c',
  '#9b9490',
];

type MotifStackProps = {
  size?: number;
  layers?: number;
  seed?: number;
  jitter?: number;
  baseRot?: number;
  className?: string;
  style?: CSSProperties;
};

function rng(seed: number) {
  let state = seed >>> 0 || 1;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function pick(rand: () => number, exclude: string | null) {
  let color = palette[Math.floor(rand() * palette.length)];
  while (color === exclude && palette.length > 1) {
    color = palette[Math.floor(rand() * palette.length)];
  }
  return color;
}

export function MotifStack({
  size = 120,
  layers,
  seed = 1,
  jitter = 7,
  baseRot,
  className = '',
  style,
}: MotifStackProps) {
  const rand = rng(seed);
  const layerCount = layers ?? 4 + Math.floor(rand() * 2);
  const rotation = baseRot ?? rand() * 18 - 9;
  let previousColor: string | null = null;

  const squares = Array.from({ length: layerCount }, (_, index) => {
    const t = index / layerCount;
    const dim = size * (1 - t * 0.82);
    const color = pick(rand, previousColor);
    const squareRot = (rand() * 2 - 1) * jitter;
    previousColor = color;

    return (
      <span
        key={`${seed}-${index}`}
        className="stack__square"
        style={{
          width: `${dim.toFixed(1)}px`,
          height: `${dim.toFixed(1)}px`,
          background: color,
          transform: `translate(-50%, -50%) rotate(${squareRot.toFixed(2)}deg)`,
        }}
      />
    );
  });

  return (
    <span
      className={`stack ${className}`.trim()}
      aria-hidden="true"
      style={{
        width: `${size}px`,
        height: `${size}px`,
        transform: `rotate(${rotation.toFixed(2)}deg)`,
        '--rot': `${rotation.toFixed(2)}deg`,
        ...style,
      } as CSSProperties}
    >
      {squares}
    </span>
  );
}
