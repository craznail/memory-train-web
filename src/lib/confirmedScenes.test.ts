import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import React, { createElement } from 'react';

// tsx compiles component JSX to React.createElement; provide the runtime for node:test.
(globalThis as unknown as { React: typeof React }).React = React;

import { renderToStaticMarkup } from 'react-dom/server';
import { PegPicture } from '../components/PegPicture.tsx';
import { PalaceRouteCard } from '../components/PalaceRouteCard.tsx';
import { SceneTray } from '../components/SceneTray.tsx';
import { generateAssociationScene, type StorageLike } from './imageGen.ts';
import {
  EMPTY_TRAY_TEXT,
  REVEAL_FADE_MS,
  THUMB_PX,
  THUMB_RADIUS_PX,
  TRAY_TITLE,
  acceptScene,
  imageUrlForPeg,
  loadConfirmedScenes,
  palaceWithoutImages,
  pegVisual,
  placeConfirmedImage,
  sceneIdFromDrop,
  trayView,
  type ConfirmedScene,
} from './confirmedScenes.ts';

function memStorage(init: Record<string, string> = {}): StorageLike {
  const map = new Map<string, string>(Object.entries(init));
  return {
    getItem: (k) => (map.has(k) ? map.get(k)! : null),
    setItem: (k, v) => {
      map.set(k, v);
    },
    removeItem: (k) => {
      map.delete(k);
    },
  };
}

const scene = (partial: Partial<ConfirmedScene> & Pick<ConfirmedScene, 'id' | 'url'>): ConfirmedScene => ({
  sentence: '句子',
  confirmedAt: '2026-10-01T00:00:00.000Z',
  ...partial,
});

describe('confirmed scenes tray', () => {
  it('stores only the image confirmed with 就用这张, not swapped-away or failed shots', () => {
    const s = memStorage();
    const swapped = acceptScene(
      { url: 'https://cdn.example/swapped.png', sentence: '被换掉', kind: 'api', confirmed: false },
      s,
    );
    const failed = acceptScene(
      { url: 'data:image/svg+xml,fail', sentence: '失败句', kind: 'fallback', confirmed: true },
      s,
    );
    const daily = acceptScene(
      { url: 'data:image/svg+xml,limit', sentence: '超额', kind: 'fallback', confirmed: true },
      s,
    );
    const kept = acceptScene(
      {
        url: 'https://cdn.example/kept.png',
        sentence: '小李把图书馆顶在头上',
        kind: 'api',
        confirmed: true,
      },
      s,
    );

    assert.equal(swapped.stored, false);
    assert.equal(failed.stored, false);
    assert.equal(daily.stored, false);
    assert.equal(kept.stored, true);
    const loaded = loadConfirmedScenes(s);
    assert.deepEqual(
      loaded.map((item) => item.url),
      ['https://cdn.example/kept.png'],
    );
    assert.equal(loaded[0]?.sentence, '小李把图书馆顶在头上');
    assert.equal(trayView(loaded).emptyText, null);
    assert.equal(trayView(loaded).items.length, 1);
  });

  it('empty tray copy when nothing has been confirmed', () => {
    const view = trayView(loadConfirmedScenes(memStorage()));
    assert.equal(view.title, TRAY_TITLE);
    assert.equal(view.emptyText, EMPTY_TRAY_TEXT);
    assert.equal(view.items.length, 0);
    const html = renderToStaticMarkup(
      createElement(SceneTray, { scenes: [], selectedId: null, onSelect: () => {} }),
    );
    assert.match(html, new RegExp(TRAY_TITLE));
    assert.match(html, new RegExp(EMPTY_TRAY_TEXT));
    assert.match(html, /#94A3B8/);
    assert.match(html, /font-size:13px/);
    assert.doesNotMatch(html, /<img/i);
  });

  it('tray thumbs are 64px with radius 12 and a primary ring when selected', () => {
    const items = [scene({ id: 'a', url: 'https://cdn.example/a.png', sentence: '甲' })];
    const html = renderToStaticMarkup(
      createElement(SceneTray, { scenes: items, selectedId: 'a', onSelect: () => {} }),
    );
    assert.match(html, /scene-thumb selected/);
    assert.match(html, new RegExp(`width:${THUMB_PX}px`));
    assert.match(html, new RegExp(`height:${THUMB_PX}px`));
    assert.match(html, new RegExp(`border-radius:${THUMB_RADIUS_PX}px`));
    assert.match(html, /var\(--color-primary\)/);
    assert.match(html, /https:\/\/cdn\.example\/a\.png/);
  });

  it('second place on the same peg replaces the previous image', () => {
    const allowed = ['img-1', 'img-2'];
    const once = placeConfirmedImage({}, 'door', 'img-1', allowed);
    const twice = placeConfirmedImage(once, 'door', 'img-2', allowed);
    assert.equal(twice.door, 'img-2');
    assert.equal(Object.keys(twice).length, 1);
    const scenes = [
      scene({ id: 'img-1', url: 'https://cdn.example/1.png' }),
      scene({ id: 'img-2', url: 'https://cdn.example/2.png' }),
    ];
    assert.equal(imageUrlForPeg(twice, 'door', scenes), 'https://cdn.example/2.png');
  });

  it('refuses to place an image that was never confirmed', () => {
    const placed = placeConfirmedImage({ sofa: 'img-1' }, 'door', 'swapped-away', ['img-1']);
    assert.deepEqual(placed, { sofa: 'img-1' });
    assert.equal(
      sceneIdFromDrop(
        {
          getData: (type: string) => (type === 'text/plain' ? 'failed-id' : ''),
        },
        ['img-1'],
      ),
      null,
    );
  });

  it('recall hides the picture and its text until reveal, then fades it in', () => {
    const hidden = pegVisual({
      phase: 'recall',
      revealed: false,
      imageUrl: 'https://cdn.example/secret.png',
      text: '周六上午九点',
    });
    assert.equal(hidden.type, 'hidden');
    assert.equal('imageUrl' in hidden, false);
    assert.equal('text' in hidden, false);

    const hiddenHtml = renderToStaticMarkup(
      createElement(PegPicture, {
        phase: 'recall',
        revealed: false,
        imageUrl: 'https://cdn.example/secret.png',
        text: '周六上午九点',
      }),
    );
    assert.match(hiddenHtml, /peg-hidden/);
    assert.match(hiddenHtml, /\?/);
    assert.doesNotMatch(hiddenHtml, /<img/i);
    assert.doesNotMatch(hiddenHtml, /secret\.png/);
    assert.doesNotMatch(hiddenHtml, /周六上午九点/);

    const shown = pegVisual({
      phase: 'recall',
      revealed: true,
      imageUrl: 'https://cdn.example/secret.png',
      text: '周六上午九点',
    });
    assert.equal(shown.type, 'revealed');
    if (shown.type === 'revealed') {
      assert.equal(shown.fadeMs, REVEAL_FADE_MS);
      assert.equal(shown.text, '周六上午九点');
    }
    const shownHtml = renderToStaticMarkup(
      createElement(PegPicture, {
        phase: 'recall',
        revealed: true,
        imageUrl: 'https://cdn.example/secret.png',
        text: '周六上午九点',
      }),
    );
    assert.match(shownHtml, /<img/i);
    assert.match(shownHtml, /secret\.png/);
    assert.match(shownHtml, /周六上午九点/);
    assert.match(shownHtml, /240ms/);
    assert.match(shownHtml, /width:48px/);
  });

  it('pegs without an image stay text slips in placement and recall', () => {
    const place = pegVisual({
      phase: 'place',
      revealed: false,
      imageUrl: null,
      text: '门口',
    });
    const recall = pegVisual({
      phase: 'recall',
      revealed: false,
      imageUrl: null,
      text: '门口',
    });
    assert.deepEqual(place, { type: 'text-slip', text: '门口' });
    assert.deepEqual(recall, { type: 'text-slip', text: '门口' });
    const html = renderToStaticMarkup(
      createElement(PalaceRouteCard, {
        pegs: [{ id: 'door', slip: '门口' }],
        scenes: [],
        placements: {},
        selectedId: null,
        onSelect: () => {},
        onPlace: () => {},
        mode: 'recall',
        revealed: false,
      }),
    );
    assert.match(html, /门口/);
    assert.doesNotMatch(html, /peg-hidden/);
    assert.doesNotMatch(html, /<img/i);
    assert.doesNotMatch(html, new RegExp(EMPTY_TRAY_TEXT));
  });

  it('placed recall peg hides the picture until reveal on the route card', () => {
    const scenes = [
      scene({
        id: 'a',
        url: 'https://cdn.example/secret.png',
        sentence: '图书馆帽子',
      }),
    ];
    const hidden = renderToStaticMarkup(
      createElement(PalaceRouteCard, {
        pegs: [{ id: 'door', slip: '门口' }],
        scenes,
        placements: { door: 'a' },
        selectedId: null,
        onSelect: () => {},
        onPlace: () => {},
        mode: 'recall',
        revealed: false,
      }),
    );
    assert.match(hidden, /peg-hidden/);
    assert.doesNotMatch(hidden, /secret\.png/);
    assert.doesNotMatch(hidden, /图书馆帽子/);
    assert.doesNotMatch(hidden, /门口/);

    const revealed = renderToStaticMarkup(
      createElement(PalaceRouteCard, {
        pegs: [{ id: 'door', slip: '门口' }],
        scenes,
        placements: { door: 'a' },
        selectedId: null,
        onSelect: () => {},
        onPlace: () => {},
        mode: 'recall',
        revealed: true,
      }),
    );
    assert.match(revealed, /secret\.png/);
    assert.match(revealed, /门口 · 图书馆帽子/);
    assert.match(revealed, /240ms/);
  });

  it('no API key: nothing enters the tray and the palace still shows text slips', async () => {
    const s = memStorage();
    const out = await generateAssociationScene({
      sentence: '小李把图书馆顶在头上',
      prefs: { baseUrl: 'https://api.openai.com/v1', apiKey: '' },
      storage: s,
      fetchFn: async () => {
        throw new Error('should not fetch');
      },
    });
    assert.equal(out.kind, 'fallback');
    const accepted = acceptScene(
      {
        url: out.url,
        sentence: '小李把图书馆顶在头上',
        kind: out.kind,
        confirmed: true,
      },
      s,
    );
    assert.equal(accepted.stored, false);
    assert.equal(loadConfirmedScenes(s).length, 0);

    const board = palaceWithoutImages([
      { id: 'door', text: '门口' },
      { id: 'sofa', text: '沙发' },
    ]);
    assert.equal(board.needsApiKey, false);
    assert.equal(board.tray.emptyText, EMPTY_TRAY_TEXT);
    assert.deepEqual(
      board.pegs.map((p) => p.visual),
      [
        { type: 'text-slip', text: '门口' },
        { type: 'text-slip', text: '沙发' },
      ],
    );
  });

  it('association confirm and palace practice are wired to the same rules', () => {
    const assoc = readFileSync(
      new URL('../pages/studio/AssociationStudio.tsx', import.meta.url),
      'utf8',
    );
    const palace = readFileSync(new URL('../pages/studio/PalaceStudio.tsx', import.meta.url), 'utf8');
    const teach = readFileSync(new URL('../pages/TeachSession.tsx', import.meta.url), 'utf8');
    assert.match(assoc, /就用这张/);
    assert.match(assoc, /acceptScene\(/);
    assert.match(assoc, /kind: sceneKind/);
    assert.match(assoc, /confirmed: true/);
    assert.match(palace, /<SceneTray/);
    assert.match(palace, /phase="recall"/);
    assert.match(palace, /phase="place"/);
    assert.match(teach, /\/teach\/:methodId|method\.id === 'palace'/);
    assert.match(teach, /mode="place"/);
    assert.match(teach, /mode="recall"/);
    assert.match(teach, /revealed=\{false\}/);
    assert.match(teach, /revealed/);
  });
});
