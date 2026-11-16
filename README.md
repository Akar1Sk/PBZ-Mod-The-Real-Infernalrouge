# 黑伤 / 黑魔伤战斗倍率试验版 0.3.0

原版黑伤太弱了, 自己加强了数值, 并把大招时间延长至30秒, 原本的10秒根本不够打一套完整输出

## 项目目录

| 路径 | 用途 |
| --- | --- |
| `PBZTangCombat.json` | 当前默认配置：伤害与削韧各 1.75 倍，绝技强化 30 秒 |
| `mod/PBZTangCombat/` | 当前 Mod 源码 |
| `Content/` | 本地 PBZModsMenu 脚本目录，0.3.0 安装包完整收录 |
| `tests/` | 战斗倍率与绝技时长模拟测试 |
| `package/` | 按游戏目录结构整理的 PBZModsMenu 安装内容 |
| `release/` | 本地 ZIP 安装包，已加入 Git 忽略规则 |
| `archive/experiments/` | 已停用的配置表修改实验及其备份 |
| `archive/backup-before-ultimate/` | 添加绝技时长功能前的代码与配置备份 |

使用 PBZModsMenu 作为前置，后续版本统一按 PBZModsMenu 目录结构打包。

## 安装包与安装方法

当前本地安装包：[PBZTangCombat-0.3.0.zip](release/PBZTangCombat-0.3.0.zip)。包含当前 Mod、根目录的完整 `Content/` 内容、默认配置、安装说明及仓库的 `LICENSE`。

0.3.0 将 `Content/` 合并到包内的 `ProjectPBZ/Content/`，与游戏目录层级对应。随附 PBZModsMenu、PBZMapMarkers、PBZWeaponProbe 及发现清单，均保留现有内容；其中 PBZTangCombat 脚本与当前 `mod/` 源码同步。

```text
ProjectPBZ/
└─ Content/
   ├─ JavaScript/PBZModsMenu/
   │  ├─ bootstrap.js、manager.js、manifest.js、discovered.txt
   │  └─ Mods/
   │     ├─ PBZModsMenu/
   │     ├─ PBZMapMarkers/
   │     ├─ PBZWeaponProbe/
   │     └─ PBZTangCombat/
   │        ├─ main.js
   │        ├─ controller.js
   │        └─ ultimate.js
   └─ Paks/~mods/PBZTangCombat.json
```

1. 先安装并配置好Modloader 和 PBZModsMenu 前置，然后退出游戏。本包不包含原生加载入口 DLL。
2. 如果曾将本 Mod 安装到 `ProjectPBZ/PBZModLoader/mods/PBZTangCombat/`，先移除该旧 Mod 文件夹，保留加载器及其他 Mod，避免同一 Mod 重复加载。
3. 解压安装包，将其中的 `ProjectPBZ/` 文件夹复制到游戏根目录，与原目录合并。升级时会覆盖同名脚本、发现清单和配置；请先备份现有 PBZModsMenu 目录及自定义配置。
4. 启动游戏，载入存档并手持黑伤／黑魔伤。黑魔伤绝技时长修改需重新施放绝技后验证。

安装包不包含加载器 DLL、第三方 SDK、`接口参考/`、`archive/` 或测试文件。默认伤害与 AngerDamage 各 1.75 倍，绝技强化时长定义为 30 秒；原生取消规则仍可能提前结束强化。

`release/` 不随 Git 提交。公开发布时，可将该 ZIP 作为 GitHub Releases 附件上传，仓库源码本身不会包含安装包。

## 配置

将 PBZTangCombat.json 放到游戏目录 ProjectPBZ/Content/Paks/~mods/ 下。

- enabled: true 开启，false 移除本 Mod 拥有的 Buff。
- attackMultiplier: 物理伤害通道倍率，当前值 1.75。
- angerMultiplier: AngerDamage 倍率，当前值 1.75。
- ultimateSeconds: 黑魔伤绝技强化秒数，当前值 30；设为 0 关闭时长修改。
- 两个倍率仅接受 1 至 10。

配置约每 0.25 秒读取一次。原实验 PBZTangBalance.json 必须保持 enabled=false；否则本 Mod 拒绝启用，避免混合实验。

## 开发资料

SDK 接口声明来自 zoneoflkf/PBZModLoader。

- https://github.com/zoneoflkf/PBZModLoader/blob/main/sdk/types/generated/SGameCombatSystem.d.ts
- https://github.com/zoneoflkf/PBZModLoader/blob/main/sdk/types/generated/ProjectPBZ.d.ts
- https://github.com/zoneoflkf/PBZModLoader/blob/main/sdk/types/ue.d.ts
- https://github.com/zoneoflkf/PBZModLoader/blob/main/sdk/types/puerts.d.ts


