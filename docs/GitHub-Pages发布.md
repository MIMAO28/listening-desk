# GitHub Pages 发布

GitHub Pages 免费方案使用公开仓库。该项目将构建后的静态文件单独发布，不把本机的计划、进度、临时文件或账号资料上传。

仓库为 `MIMAO28/listening-desk`，GitHub Pages 地址为 https://mimao28.github.io/listening-desk/ 。已完成首次发布，电脑端首页、词库返回200；发布记录位于 `.openai/github-pages.json`。

本地构建（PowerShell）：

```powershell
$env:SITE_BASE_PATH='/listening-desk/'
npm.cmd run build
Remove-Item Env:SITE_BASE_PATH
```

角色、WASM、词库和许可链接都使用 Vite 的 BASE_URL，适配项目子目录。首页和练习页使用 hash 路由，不依赖服务器重写。

发布目录为 `.publish/github-pages`，内容为 dist 文件及 `.nojekyll`。GitHub Pages 使用 main 分支根目录发布，不需要付费托管，也不需要把 GitHub 密钥放到网站里。

## 每次更新的保存要求

从v0.5.1起同时维护两部分：`source`分支保存当前开发源码，`main`分支保存网站构建产物。当前源码本地发布检出位于`.publish/github-source`。

1. 更新功能、版本号（package.json和package-lock.json）与`docs/releases.json`；运行`node scripts/build-release-notes.mjs`生成更新日志。
2. 源码只同步白名单：src、public、package.json、package-lock.json、index.html、tsconfig.json、vite.config.ts、.gitignore、.gitattributes、启动脚本及公开说明。禁止同步.env、输出日志、账号配置、本机上下文、规划记录或练习材料。
3. 测试与构建通过后提交并推送`source`，给当前源码提交加`source-vX.Y.Z`固定标签。
4. 以`/listening-desk/`为基路径构建网站，更新main静态文件、README、CHANGELOG；推送并等待Pages成功。
5. 用当前网站构建提交创建`vX.Y.Z`标签和中文Release，说明变更、对应源码标签、验证与实际限制。不得重写旧标签或将最新源码当成早期源码。
6. 核实线上、远端源码/标签和Release都存在，再更新本地发布记录。私密配置不上传。

历史9次部署的中文Release和版本标签为2026-10-28补录，保留原提交日期；之前的独立开发源码快照无法从压缩部署文件完整恢复，已在更新日志如实标注。

手机直连情况需在真实的 5G 网络测试。电脑请求成功、官方部署成功均不能代替手机实测。
