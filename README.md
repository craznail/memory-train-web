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

## 生图服务（可选，自带 Key）

练习台「生图联想」可以接自己的生图服务，在「设置 → 生图服务（可选）」里填。不填也能练，会显示示意图。

| 服务商 | 默认模型 | 默认接口地址 | 调用方式 |
|---|---|---|---|
| OpenAI 兼容 | `gpt-image-1` | `https://api.openai.com/v1` | `POST {接口地址}/images/generations` |
| 通义（阿里云百炼 DashScope） | `qwen-image-3.0` | `https://dashscope.aliyuncs.com/api/v1`（华北 2 北京） | 异步：`POST /services/aigc/image-generation/generation`（`X-DashScope-Async: enable`）→ 轮询 `GET /tasks/{task_id}` |

- 切换服务商会带出该服务商的官方接口地址和默认模型，之后可以手动改。
- 旧版本只存了「接口地址 + Key」的设置，会自动当作「OpenAI 兼容 / gpt-image-1」继续用。
- 每次生成（提交 + 轮询）总超时 20 秒；401、500、超时、任务失败都会回落到示意图。每天 20 次、每句最多换 3 次。
- Key 只存在本机浏览器 localStorage，只在生成时发给你填的接口地址，不经过任何中转服务器。
- 2026-10-09 用真实 Key 在本地浏览器跑通过一次（北京地域、异步提交 + 轮询，约 7 秒出图），返回格式和适配层一致。
- 文档：[千问-图像生成与编辑 API 参考](https://help.aliyun.com/zh/model-studio/qwen-image-generation-and-editing-api-reference)、[qwen-image-3.0 模型信息](https://help.aliyun.com/zh/model-studio/qwen-image-3-0)。

### 通义的跨域（CORS）情况（2026-10-09 实测）

- 北京地域 `https://dashscope.aliyuncs.com`：提交任务、轮询任务、同步接口的预检都返回 `Access-Control-Allow-Origin: <你的页面域名>`，并允许 `authorization, content-type, x-dashscope-async`，**浏览器可以直连**，不需要代理。
- 新加坡地域 `https://dashscope-intl.aliyuncs.com`：提交接口允许跨域，但 `GET /tasks/{id}` 的预检返回 403。所以填国际站地址时，应用会自动改用同步接口 `POST /services/aigc/multimodal-generation/generation`（一次请求直接返回图片，同样允许跨域）。
- OpenAI 兼容模式 `/compatible-mode/v1/images/generations` 只在业务空间专属域名（`https://{WorkspaceId}.cn-beijing.maas.aliyuncs.com`）上提供，未做跨域实测，不作为默认。
- 如果以后阿里云收紧跨域，可选方案（都由用户自己部署，Key 不经过我们）：本机跑一个转发脚本；用户自己部署的 Cloudflare Worker 转发；或改用允许跨域的接口。本仓库不提供也不部署任何代理。
- 通义返回的图片是 OSS 签名链接，**24 小时后失效**。实测（2026-10-09，真实 Key）OSS 对带 Origin 的 GET 返回 `Access-Control-Allow-Origin: *`，浏览器 `fetch()` 能读到图片，所以可以在本机留一份副本（见下）。

### 「就用这张」的图片本地副本

- 点「就用这张」后，应用会下载这张图，缩到最长边 ≤ 512，转成 WebP，存进本机 IndexedDB（库名 `mt-scene-images`）。宫殿待放区和桩位读的是这份本地副本，远程链接过期也不影响。
- 如果下载失败（比如服务商不允许跨域读取），这条记录会标成「临时图」：先照常显示远程图片，等链接失效、加载不出来时，改为显示带句子的示意图，不会出现裂图。
- 以前存下的记录（`mt-confirmed-scenes` 里只有远程链接）会在第一次打开宫殿时自动补存；补存不了就按「临时图」处理。
- 如果以后遇到不允许跨域的服务商，想长期保留图片，可以由用户自己部署一个转发（本机脚本或自己的 Cloudflare Worker）给图片加上跨域头。本仓库不提供代理。

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
