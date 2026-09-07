# 预录音频资源

## 目录约定

```
audio/
  papers/
    A/script.mp3
    B/script.mp3
    C/script.mp3
  practice/
    p01.mp3
    p02.mp3
```

- 试卷：`papers/{卷字母}/script.mp3`，对应 `paper-a` → `A`，`paper-b` → `B`，`paper-c` → `C`
- 练习：`practice/{题ID}.mp3`
- 建议规格：统一音色 TTS 批量导出，**16 kHz mono mp3**
- 播放策略：本地文件优先；404/失败则兜底浏览器 Web Speech TTS

## 导出

1. 用统一音色 TTS 按 `src/data/papers.ts` 里各卷 `passage` 导出 mp3
2. 放入上表路径
3. 或运行 `node scripts/list-audio-manifest.mjs` 查看应生成的路径清单

未放入真实 mp3 前，应用仍可用 TTS 兜底正常跑通。
