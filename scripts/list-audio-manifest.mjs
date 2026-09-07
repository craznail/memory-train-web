/** List required pre-recorded audio paths for papers A/B/C */
const required = [
  'public/audio/papers/A/script.mp3',
  'public/audio/papers/B/script.mp3',
  'public/audio/papers/C/script.mp3',
];
console.log('Required audio files (16kHz mono mp3 recommended):');
for (const p of required) console.log(' -', p);
console.log('\nMap: paper-a→A, paper-b→B, paper-c→C. Place files then rebuild/redeploy.');
