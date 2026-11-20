# 黑伤 / 黑魔伤战斗倍率试验版 0.4.3

原版黑伤太弱了, 自己加强了数值, 并把大招时间延长至30秒, 原本的10秒根本不够打一套完整输出

## 游戏内调整（0.4.3）

0.4.3 移除有问题的“保存设置”按钮及其菜单适配，恢复用户确认可用的 0.4.1 自动保存和自动热重载逻辑。停止调整滑条后会自动保存，无需点击按钮。本次升级保留游戏现有倍率和时长；重启一次游戏以清除旧菜单改动。42 项模拟检查通过，核心脚本除版本号外与添加按钮前的备份一致。

进入游戏的 **设置 → 模组菜单（Mods Menu）→ 黑伤 / 黑魔伤**，也可以使用模组菜单当前的快捷键（默认 F9）。提供启用开关，以及伤害倍率、削韧倍率、绝技持续时间三个滑条；菜单自带恢复默认设置。

| 设置 | 默认 | 范围 / 步进 |
| --- | --- | --- |
| 伤害倍率 | 1.25 倍 | 1–10 倍 / 0.05 |
| 削韧倍率 | 1.25 倍 | 1–10 倍 / 0.05 |
| 绝技持续时间 | 30 秒 | 0–120 秒 / 1 秒，0 恢复原始时长 |

菜单通常在停止调整约 0.25 秒后保存。0.4.1 增加备用路径：每 0.25 秒读取菜单当前值，选择稳定 0.75 秒后由 Mod 自行写入并核对配置字段；独立检测磁盘配置变化，不再仅依赖 onChange 回调。日志已确认上一版出现“settings not saved”，但写入返回值异常和读回文本差异尚未在实机中区分，不能把这次备用路径视为已实测修复。

配置改变后优先调用随包加载器的 `reloadMod("PBZTangCombat")`，先停止旧实例，再用新的模块缓存路径重新加载这一个 Mod，其他 Mod 不受影响。加载器未提供接口、正忙或达到每会话 64 次上限时，退回清理旧效果并重建控制器。菜单保持打开，倍率不会重复叠加；绝技新时长从下一次施放生效，不刷新正在持续的绝技。安装 0.4.1 后需重启一次游戏以载入更新的 manager.js；此后调参数无需手动重载。

首次成功接入菜单时，自动从已有 JSON 配置迁移生成 `ProjectPBZ/Content/Paks/~mods/PBZTangCombat.ini`，保留用户当前数值；之后以 INI 为准，原 JSON 保留。安装包不预置 INI，以免升级覆盖游戏内保存的设置。

游戏内界面使用 **PBZModsMenu 0.7.0 的注册接口**，当前实际游戏安装具备该组件。两种加载路径均使用相同的 Mod 源码，但单独的 PBZModLoader 不自带这个界面：若没有提供 `globalThis.PBZModsMenu` 的菜单组件，战斗功能继续读取配置，待菜单接口出现后再接入。单独使用 PBZModLoader 的用户可手动编辑配置；不要为获取界面重复安装本 Mod 或叠加两个原生加载入口。

0.4.1 已通过 42 项模拟测试（含保存失败后的备用写入、单 Mod 重载、清理失败保护），新版仍需实机确认。菜单和写入诊断位于 `Saved/PBZTangUI-report.json`；重载请求及备用方式位于 `Saved/PBZTangReload-report.json`，请求成功不等于加载完成，还需核对加载器日志与战斗报告。

## 项目目录

| 路径 | 用途 |
| --- | --- |
| `PBZTangCombat.json` | 当前默认配置：伤害与削韧各 1.25 倍，绝技强化 30 秒 |
| `mod/PBZTangCombat/` | 当前 Mod 源码 |
| `Content/` | 本地 PBZModsMenu 脚本目录，0.3.0 安装包完整收录 |
| `tests/` | 战斗倍率、绝技时长与菜单配置模拟测试 |
| `package/` | 两种加载器的安装文件，打包时分别选取对应目录 |
| `release/` | 本地 ZIP 安装包，已加入 Git 忽略规则 |
| `archive/experiments/` | 已停用的配置表修改实验 |

支持 PBZModLoader 和 PBZModsMenu 两种加载方式。选择与你使用的加载器对应的安装包，同一游戏中只安装一份 PBZTangCombat。

## 安装包与安装方法

0.4.3 两个安装包已生成并核对脚本一致性：[PBZModsMenu 版](release/PBZTangCombat-0.4.3-PBZModsMenu.zip)、[PBZModLoader 版](release/PBZTangCombat-0.4.3-PBZModLoader.zip)。当前游戏使用 PBZModsMenu，应选择前者。两包二选一；后者不捆绑菜单组件。

历史本地安装包：[PBZTangCombat-0.3.0.zip](release/PBZTangCombat-0.3.0.zip)，为此前生成的 PBZModsMenu 版，不包含新增 UI。包含当时的 Mod、根目录的完整 `Content/` 内容、默认配置、安装说明及仓库的 `LICENSE`。

0.3.0 将 `Content/` 合并到包内的 `ProjectPBZ/Content/`，与游戏目录层级对应。随附 PBZModsMenu、PBZMapMarkers、PBZWeaponProbe 及发现清单，均保留现有内容；其中 PBZTangCombat 脚本与当前 `mod/` 源码同步。

后续发布同一版本时，将同步生成以下两个独立安装包，由用户二选一：

| 安装包命名 | 所需加载器 | Mod 脚本的游戏内位置 |
| --- | --- | --- |
| `PBZTangCombat-<版本号>-PBZModLoader.zip` | PBZModLoader | `ProjectPBZ/PBZModLoader/mods/PBZTangCombat/` |
| `PBZTangCombat-<版本号>-PBZModsMenu.zip` | PBZModsMenu | `ProjectPBZ/Content/JavaScript/PBZModsMenu/Mods/PBZTangCombat/` |

两个版本使用相同的 Mod 源码、版本号和默认配置，配置均安装到 `ProjectPBZ/Content/Paks/~mods/PBZTangCombat.json`。游戏内界面的组件要求见上文。

1. 安装并配置好所选版本对应的加载器，然后退出游戏。安装包不包含原生加载入口 DLL。
2. 切换加载方式时，先移除另一加载路径下的 PBZTangCombat 文件夹。若从 PBZModsMenu 切换出去，还需移除其发现清单中 id 为 PBZTangCombat 的条目，或通过加载器重新生成清单。保留公共加载器及其他 Mod。
3. 解压所选的单个安装包，将其中的 `ProjectPBZ/` 文件夹复制到游戏根目录，与原目录合并。升级前备份自定义配置；PBZModsMenu 版还会覆盖随附的同名脚本和发现清单，需先备份原有 PBZModsMenu 目录。
4. 启动游戏，载入存档并手持黑伤／黑魔伤。黑魔伤绝技时长修改需重新施放绝技后验证。

安装包不包含加载器 DLL、第三方 SDK、`接口参考/`、`archive/` 或测试文件。默认伤害与 AngerDamage 各 1.25 倍，绝技强化时长定义为 30 秒；原生取消规则仍可能提前结束强化。

`release/` 不随 Git 提交。后续公开发布时，将两个安装包作为同一 GitHub Release 的附件上传。`package/` 同时保留两套文件供维护，不能整体复制安装或整体压缩为一个默认安装包，具体选择方法见 [打包目录说明](package/README.md)。已有压缩包不会因说明更新自动重建。

## 配置

将 PBZTangCombat.json 放到游戏目录 ProjectPBZ/Content/Paks/~mods/ 下。首次接入菜单后改用自动生成的 PBZTangCombat.ini；INI 存在时不再读取 JSON。INI 的开关写作 On/Off，JSON 的开关写作 true/false，其他键名一致。

- enabled: true 开启，false 移除本 Mod 拥有的 Buff。
- attackMultiplier: 物理伤害通道倍率，当前值 1.25。
- angerMultiplier: AngerDamage 倍率，当前值 1.25。
- ultimateSeconds: 黑魔伤绝技强化秒数，当前值 30；设为 0 关闭时长修改。
- 两个倍率仅接受 1 至 10。

配置约每 0.25 秒读取一次。原实验 PBZTangBalance.json 必须保持 enabled=false；否则本 Mod 拒绝启用，避免混合实验。

## 开发资料

SDK 接口声明来自 zoneoflkf/PBZModLoader。

- https://github.com/zoneoflkf/PBZModLoader/blob/main/sdk/types/generated/SGameCombatSystem.d.ts
- https://github.com/zoneoflkf/PBZModLoader/blob/main/sdk/types/generated/ProjectPBZ.d.ts
- https://github.com/zoneoflkf/PBZModLoader/blob/main/sdk/types/ue.d.ts
- https://github.com/zoneoflkf/PBZModLoader/blob/main/sdk/types/puerts.d.ts


