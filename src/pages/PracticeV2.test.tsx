import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import React, { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';

(globalThis as unknown as { React: typeof React }).React = React;

const card = async (props: Record<string, unknown>) => {
  const { PlayCard } = await import('../components/v2/V2');
  return renderToStaticMarkup(
    createElement(PlayCard, { phase: 'ready', playedOnce: false, onPlay: () => {}, img1x: 'a.webp', img2x: 'b.webp', ...props }),
  );
};

describe('练听力 v2 play card', () => {
  it('practice card has no 仅播放一次 tag', async () => {
    const html = await card({ onReplay: () => {} });
    assert.doesNotMatch(html, /仅播放一次/);
    assert.match(html, /data-testid="play-card"/);
  });
  it('after playback shows 再听一遍; while replaying it is hidden and card is playing', async () => {
    assert.match(await card({ onReplay: () => {}, phase: 'answering', playedOnce: true }), /再听一遍/);
    const replaying = await card({ onReplay: () => {}, phase: 'answering', playedOnce: true, replaying: true });
    assert.doesNotMatch(replaying, /再听一遍/);
    assert.match(replaying, /data-state="playing"/);
  });
  it('formal test card is unchanged: 仅播放一次 and no replay', async () => {
    assert.match(await card({}), /仅播放一次/);
    assert.doesNotMatch(await card({ phase: 'answering', playedOnce: true }), /再听一遍/);
  });
  it('practice page: difficulty switch sits above the v2 play card, unlocked before playback', async () => {
    const { PracticeSession } = await import('./PracticeSession');
    const html = renderToStaticMarkup(
      createElement(MemoryRouter, { initialEntries: ['/practice?level=easy'] }, createElement(PracticeSession)),
    );
    const sw = html.indexOf('data-testid="level-switch"');
    const pc = html.indexOf('data-testid="play-card"');
    assert.ok(sw > 0 && pc > sw, 'switch before play card');
    assert.doesNotMatch(html, /is-locked/);
    assert.doesNotMatch(html, /仅播放一次/);
    assert.match(html, /aria-checked="true"[^>]*>初级/);
  });
});
