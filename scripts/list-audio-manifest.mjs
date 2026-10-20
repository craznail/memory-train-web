/** List required pre-recorded audio paths for all papers (core A/B/C + bank #11) */
const dirs = ['A', 'B', 'C', 'E1', 'E2', 'E3', 'M1', 'M2', 'M3', 'H1', 'H2', 'H3'];
console.log('Required audio files (24kHz mono mp3, 48kbps):');
for (const d of dirs) console.log(' -', `public/audio/papers/${d}/script.mp3`);
console.log('\nMap: paper-a→A … paper-e1→E1, paper-m1→M1, paper-h1→H1. All papers: DashScope qwen3-tts-flash (Cherry), key from env only.');
