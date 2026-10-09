import { useEffect, useState } from 'react';
import type { ConfirmedScene } from '../lib/confirmedScenes';
import {
  resolveDisplayScene,
  sceneFallbackUrl,
  type DisplayScene,
} from '../lib/sceneImageCache';

function pending(scene: ConfirmedScene): DisplayScene {
  return {
    ...scene,
    url: '',
    remoteUrl: scene.url,
    fallbackUrl: sceneFallbackUrl(scene.sentence),
    isTemporary: false,
  };
}

/**
 * Confirmed scenes with `url` swapped for a local IndexedDB copy (object URL) when we have one.
 * `url` is '' while resolving (a few ms); records without a local copy are 临时图.
 */
export function useDisplayScenes(scenes: readonly ConfirmedScene[]): DisplayScene[] {
  const [display, setDisplay] = useState<DisplayScene[]>(() => scenes.map(pending));

  useEffect(() => {
    let alive = true;
    const urls: string[] = [];
    void Promise.all(
      scenes.map(async (s) => {
        const { display: d, objectUrl } = await resolveDisplayScene(s);
        if (objectUrl) urls.push(objectUrl);
        return d;
      }),
    ).then((resolved) => {
      if (alive) setDisplay(resolved);
      else urls.forEach((u) => URL.revokeObjectURL(u));
    });
    return () => {
      alive = false;
      urls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [scenes]);

  return display;
}
