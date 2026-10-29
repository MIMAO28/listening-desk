# 听写练习台

个人使用的英语、日语精听工具，支持导入文字/TXT、自动断句、逐句朗读、听写、中文多义查词和整句参考翻译。

[在线使用](https://mimao28.github.io/listening-desk/) · [更新日志](CHANGELOG.md) · [GitHub版本说明](https://github.com/MIMAO28/listening-desk/releases)

## 当前功能

- 播放从当前句连续到末尾；开启三遍后，每句三遍再推进。鼠标和快捷键选句行为一致。
- 英语仅保留8个Kokoro自然音色，支持试听和变速；日语保留浏览器对应语言声音。
- Kokoro 8个自然英语音色；本机准备整篇音频后，切句直接播放。首次下载模型约100MB。
- 邮箱账号、个人学习面板、30天日历、前台有效练习时长与积分等级；每句听写可检查，重复提交不重复加分。
- 左侧原文、右侧听写、专注练习、阅读字号与栏宽调整。
- 中文多义释义、变形词原形补充、整句翻译；桌面固定查询输入、手机浮窗。
- 17套Happy Hues配色、独立日夜模式、随主题换色的Yippee角色。
- 材料、听写和设置只保留在当前页面会话，刷新重新开始。
- 登录后的标题和学习统计保存至Supabase，用户只能读取自己的记录；原文与听写不上传。

## GitHub分支与版本

- `main`：构建后的静态网站、更新日志和README，供GitHub Pages发布。
- [`source`](https://github.com/MIMAO28/listening-desk/tree/source)：当前可开发的React/TypeScript源码、公开资源和依赖锁文件。
- [`source-v0.6.4`](https://github.com/MIMAO28/listening-desk/tree/source-v0.6.4)：当前源码的固定快照。
- `v0.1.0` 起：对应网站部署的静态文件标签，每版都有中文Release说明。

早于首次GitHub Pages发布的界面迭代没有单独GitHub快照；早期源码也未逐版保存，不将最新源码伪称为历史源码。网址中的`?v=8`等参数是缓存刷新标记，不是固定历史版本链接。

## 本地开发

克隆`source`分支，在该目录运行（已使用Node.js v24.21.0验证）：

```powershell
npm ci
npm run dev
```

浏览器打开终端显示的本地网址。不要直接双击`index.html`。Windows也可在安装依赖后运行`启动练习.cmd`。

```powershell
npm test
npm run test:database
$env:SITE_BASE_PATH='/listening-desk/'
npm run build
```

构建产物在`dist`。发布流程见[GitHub Pages发布说明](docs/GitHub-Pages发布.md)，主题说明见[主题配色](docs/主题配色.md)。
账号部署、SMTP与语音资源说明见[账号与自然语音](docs/账号与自然语音.md)。模型已随公开资源分发；需重新获取时运行`npm run prepare:voices`。

## 来源

角色[Yippee](https://rive.app/marketplace/27915-52755-yippee/)，作者[gianluigi.ranauro](https://rive.app/@gianluigi.ranauro)，CC BY 4.0；裁取耳机角色并映射主题颜色，详细说明见`public/characters/yippee/CREDITS.txt`。ECDICT英汉词库和Rive运行库使用各自MIT许可，文件随公开资源保留。配色基础色值来自[Happy Hues](https://www.happyhues.co/)，由本站适配阅读界面和明暗模式。
