# 听力记忆训练（V1）

中文听觉记忆训练 Web App：测听力 / 学分组（Chunking）/ 练听力。

## 技术栈

- Vite + React + TypeScript + React Router
- 移动端优先（约 390px）
- Web Speech API（TTS，材料仅播放一次）
- localStorage 保存测评记忆分历史
- 无后端、无登录

## 快速开始

```bash
npm install
npm run dev
```

浏览器打开终端提示的本地地址（默认 http://localhost:5173）。

生产构建：

```bash
npm run build
npm run preview
```

也可用 Bun：`bun install && bun run dev` / `bun run build`。

## 功能说明

| 入口 | 路由 | 说明 |
|------|------|------|
| 测听力 | /test | 听一次 → 可选心算抗干扰 → 回答具体问题 → **写入记忆分** |
| 学分组 | /teach | 盲听 → 讲解 Chunking → 带分组提示再听 → 前后对比（**不计分**） |
| 练听力 | /practice | 同形式自由练习，统计正确/错误/未答（**不计分**） |

记忆分 = 综合分（听觉 70% + 抗干扰 30%）。薄弱点标签：人物 / 时间 / 地点 / 任务 / 数字。

内置 3 套平行试卷（A/B/C），结构与难度一致、内容不同，数据在 `src/data/papers.ts`。

## 目录结构

```
src/
  components/   # ScoreCard、入口卡、播放条、抗干扰、问答、分组提示、薄弱点
  data/         # 固定试卷
  hooks/        # 共享听写状态机
  lib/          # TTS、评分、localStorage
  pages/        # 首页 / 测 / 学 / 练
  styles/       # tokens.css + global.css
```

## 设计说明

设计 token 见 `src/styles/tokens.css`。主按钮全宽圆角，次按钮描边。
