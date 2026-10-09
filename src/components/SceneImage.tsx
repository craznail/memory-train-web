import { useState, type CSSProperties } from 'react';

interface Props {
  src: string | null;
  /** Sentence illustration shown when `src` fails to load (e.g. an expired 临时图). */
  fallbackSrc?: string | null;
  className?: string;
  width?: number;
  height?: number;
  style?: CSSProperties;
  testId?: string;
}

/** <img> that never shows a broken image: swaps to the SVG illustration on error. */
export function SceneImage({ src, fallbackSrc, className, width, height, style, testId }: Props) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const useFallback = !!src && failedSrc === src && !!fallbackSrc;
  const shown = useFallback ? fallbackSrc! : src;

  if (!shown) {
    return (
      <span
        className={className}
        data-testid={testId}
        data-state="loading"
        aria-hidden
        style={{ display: 'inline-block', width, height, background: '#F3E6D8', ...style }}
      />
    );
  }

  return (
    <img
      className={className}
      data-testid={testId}
      data-state={useFallback ? 'fallback' : 'image'}
      src={shown}
      alt=""
      width={width}
      height={height}
      draggable={false}
      style={style}
      onError={() => {
        if (src && !useFallback) setFailedSrc(src);
      }}
    />
  );
}
