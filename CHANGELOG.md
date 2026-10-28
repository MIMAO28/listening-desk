# 更新日志

记录GitHub Pages网站的版本变更。v0.1.0–v0.5.1共9个历史部署的中文说明与标签于2026-10-28补录，原提交历史未改写；之后的版本随发布记录。

历史标签保存可部署的静态文件；当前React/TypeScript开发源码另见 [source分支](https://github.com/MIMAO28/listening-desk/tree/source)。早于首次GitHub Pages发布的界面迭代，没有单独的GitHub快照；早期源码未追溯补造。

网址里的 ?v=9 等参数用于刷新缓存，不是固定历史版本地址；请用下面的标签和Release查看历史。

## v0.6.2 · 清晰中文邮件与站内验证码

2026-10-28 · [更新说明](https://github.com/MIMAO28/listening-desk/releases/tag/v0.6.2) · [原提交 bccb1ae](https://github.com/MIMAO28/listening-desk/commit/bccb1aea6a0fbe0b9a11f8fdb1780da1cb8aaaa0)

- 注册邮箱验证和找回密码改为站内输入数字验证码，无需访问外部确认链接。
- 提供大号数字、中文说明和返回网站按钮的注册/找回邮件模板，需要站点所有者在Supabase保存。
- 增加验证码错误/过期中文提示、重新发送和60秒冷却；保留邮箱密码登录。
- 用户已确认新加坡账号服务在手机5G关闭VPN后能登录；不据此承诺所有网络可达。

## v0.6.1 · 学习面板与登录窗口快捷键隔离

2026-10-28 · [更新说明](https://github.com/MIMAO28/listening-desk/releases/tag/v0.6.1) · [原提交 f42dcbd](https://github.com/MIMAO28/listening-desk/commit/f42dcbd5c67cad7edb5d786851ec862ff45836f9)

- 学习面板和账号弹窗不响应播放快捷键，避免误触后台音频准备。
- 保留v0.6.0的8个自然音色、邮箱账号、个人学习面板及全部精听功能。

## v0.6.0 · Kokoro自然语音、邮箱账号与个人学习面板

2026-10-28 · [更新说明](https://github.com/MIMAO28/listening-desk/releases/tag/v0.6.0) · [原提交 054b804](https://github.com/MIMAO28/listening-desk/commit/054b804124a9d3a01292fd6e7752b2a25edd1bb5)

- 新增Heart、Bella、Michael、Fenrir等8个自然英语音色；约100MB模型资源同站托管，浏览器本机合成。
- 先准备整篇各句音频，再直接从内存播放；保留快捷键、三遍循环与自动下一句。首次下载与本机合成需要等待。
- 接入新加坡Supabase邮箱账号，支持注册确认、登录、退出和找回密码；发信由站点所有者的SMTP服务处理。
- 新增学习时长、已检查句数、词语命中率、连续天数、30天日历与个人记录；RLS按账号隔离。
- 新增本句听写检查和逐句输入保留；每正确词1分，同一轮同一句重复提交只补新增分数。日语按字符计分。
- 等级规则按参考站公开公式round(200×level^1.5)实现，不把积分等级当成CEFR水平。
- 原文和听写不上传，游客不保存统计；仅登录状态、标题与个人学习统计按说明保存。

## v0.5.1 · 角色主题颜色最终校正

2026-10-28 · [更新说明](https://github.com/MIMAO28/listening-desk/releases/tag/v0.5.1) · [原提交 a7a3266](https://github.com/MIMAO28/listening-desk/commit/a7a32668e80babbc1d2b50de90cb8612d217567c)

- 奶油主题的小角色跟随粉色强调色，避免误用浅背景色导致发灰。
- 深色按钮主题为角色选择更清晰的原色卡强调色。
- 保留17套配色、独立明暗模式与全部精听功能。

## v0.5.0 · 17套 Happy Hues 主题与首页调整

2026-10-28 · [更新说明](https://github.com/MIMAO28/listening-desk/releases/tag/v0.5.0) · [原提交 452ec79](https://github.com/MIMAO28/listening-desk/commit/452ec79f417f8017f5a4cb1f4f032ebd5a593b70)

- 收录Happy Hues公开的全部17套基础配色及来源编号。
- 配色与日夜模式独立，共34种适配组合，增加文字对比度检查。
- 角色动画与首屏图片随主题换色，保留原始动作和署名。
- 首页增加精听练习流程，仍保留下滑语言分区。
- 主题切换不重启播放或清空听写。

## v0.4.0 · 统一选句播放与查词译句升级

2026-10-27 · [更新说明](https://github.com/MIMAO28/listening-desk/releases/tag/v0.4.0) · [原提交 b8d8065](https://github.com/MIMAO28/listening-desk/commit/b8d806593c4e20c71ba10d2d56a0f5663da25c3a)

- 鼠标点原文与快捷键统一启动连续队列，保留每句三遍。
- 预取按最新位置调度，已解码音频同步启动。
- 补充58123个变形词到原形的索引，完整显示多义释义。
- 支持最长1000字符整句中文参考翻译。
- 桌面查词输入固定，手机增加浮窗。

## v0.3.1 · 在线音频缓存与相邻句预取

2026-10-27 · [更新说明](https://github.com/MIMAO28/listening-desk/releases/tag/v0.3.1) · [原提交 d355ceb](https://github.com/MIMAO28/listening-desk/commit/d355cebb8424fd5589386cd5482d33e9d3862515)

- Microsoft在线声音使用真实音频内存缓存，相邻句后台准备。
- 重复、返回缓存句子及变速可复用音频。
- 暂停下载后不自动出声，过期请求不串音；连接失败回到同一所选声音。
- 首次未准备好的音频仍需联网，不保证所有场景零等待。

## v0.3.0 · 恢复在线多音色与试听

2026-10-27 · [更新说明](https://github.com/MIMAO28/listening-desk/releases/tag/v0.3.0) · [原提交 8a76c97](https://github.com/MIMAO28/listening-desk/commit/8a76c9786c7335e3c69dbf37274c57ec29c87cea)

- 恢复浏览器实际提供的多个在线和本地英语音色。
- 自然美式声优先排序，保留手动选择。
- 增加统一样句试听与停止试听，中文昵称保留真实声音名称。

## v0.2.1 · 默认连播与返回句子保留三遍

2026-10-27 · [更新说明](https://github.com/MIMAO28/listening-desk/releases/tag/v0.2.1) · [原提交 1750f90](https://github.com/MIMAO28/listening-desk/commit/1750f90c31f0c04f8034bbd4d3a17f16a7f77665)

- 移除独立全文连播按钮，点击播放即连续到材料末尾。
- 自动进入下一句后，快捷键返回仍会三遍再继续。
- 该历史版曾仅保留一个本地英语声；下一版恢复多个在线音色。

## v0.2.0 · 每句三遍与快捷键切句

2026-10-27 · [更新说明](https://github.com/MIMAO28/listening-desk/releases/tag/v0.2.0) · [原提交 2265d0a](https://github.com/MIMAO28/listening-desk/commit/2265d0a41a96533cc1f1668d4b9290faac678cd5)

- 重复三次改为持续开关，每句三遍后自动下一句。
- 上下句切换重新计数，保留听写内容。
- 移除重复取消与不必要的切句等待。

## v0.1.1 · 角色首屏与弱网加载修复

2026-10-27 · [更新说明](https://github.com/MIMAO28/listening-desk/releases/tag/v0.1.1) · [原提交 28061f9](https://github.com/MIMAO28/listening-desk/commit/28061f986e942851885e165aa5c63ad0a6789605)

- 角色图片内嵌首屏，消除只显示Yippee字母的占位。
- 动画、运行库与WASM并行加载，渲染后平滑交接。
- 加载失败或超时保留角色图片。

## v0.1.0 · 首次 GitHub Pages 发布

2026-10-27 · [更新说明](https://github.com/MIMAO28/listening-desk/releases/tag/v0.1.0) · [原提交 8335932](https://github.com/MIMAO28/listening-desk/commit/833593273f909ca0c668b3b090bd78625d672f01)

- 免费公开网址上线，支持电脑和手机通过链接访问。
- 包含文字/TXT导入、自动断句、英日精听、听写、中文查词、专注和日夜模式。
- 适配 /listening-desk/ 子路径资源，仅发布静态网站文件。
