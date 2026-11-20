# PBZModsMenu 加载器适配

manager.js 基于工作区现有 PBZModsMenu manager.js，保留其原有加载、缓存路径轮换、stop 等待、64 次会话上限和 Ctrl+F5 行为。增加 `state.reloadMod(id)`：只允许重载当前 loaded 且未 blocked 的非菜单 Mod，仅过滤该 Mod 的停止和重新导入队列。菜单组件和其他 Mod 不参与此次重载。

同步至 Content/JavaScript/PBZModsMenu/manager.js 和 package/ProjectPBZ/Content/JavaScript/PBZModsMenu/manager.js，仅随 PBZModsMenu 版发布。由于 Content 被 Git 忽略，这里保存可追踪的适配源码。升级加载器时应先核对上游差异再合并，勿直接覆盖新版上游文件。

测试：node tests/loader.cjs。安装更新后须重启游戏，已运行的 manager 模块不会被自身热重载。
