# PBZTangCombat 0.3.0 安装目录

本包使用 PBZModsMenu 加载，由当前 Mod 源码与配置生成，不包含加载器 DLL。需要先安装并配置好PBZModloader 和 BZModsMenu 前置。

不知道为什么我自己电脑上面使用modloader有bug

## 安装

1. 退出游戏，备份已有的 `ProjectPBZ/Content/JavaScript/PBZModsMenu/` 和自定义配置。
2. 若旧版 Mod 位于 `ProjectPBZ/PBZModLoader/mods/PBZTangCombat/`，先移除该 Mod 文件夹，避免重复加载。保留公共加载器及其他 Mod。
3. 将包内的 `ProjectPBZ/` 复制到游戏根目录并合并同名目录，允许覆盖本包的同名文件。
4. 启动游戏，载入存档并手持黑伤／黑魔伤；重新施放黑魔伤绝技后验证强化时长。

本版完整收录工作目录中的 `Content/`，放在 `ProjectPBZ/Content/` 下，包含 PBZModsMenu、PBZMapMarkers、PBZWeaponProbe、PBZTangCombat 和现有发现清单。Mod 脚本安装位置为 `ProjectPBZ/Content/JavaScript/PBZModsMenu/Mods/PBZTangCombat/`；默认配置为伤害与 AngerDamage 各 1.75 倍，绝技强化时长定义为 30 秒。

## 配置

- `enabled`：true 开启，false 关闭。
- `attackMultiplier`：物理伤害倍率，默认 1.75，支持 1 至 10。
- `angerMultiplier`：AngerDamage 倍率，默认 1.75，支持 1 至 10。
- `ultimateSeconds`：黑魔伤绝技强化秒数，默认 30，设为 0 关闭时长修改。

配置约每 0.25 秒读取一次。若曾安装旧实验，须保持游戏目录的 `PBZTangBalance.json` 中 enabled=false。

## 卸载

退出游戏后，删除 `ProjectPBZ/Content/JavaScript/PBZModsMenu/Mods/PBZTangCombat/` 和 `ProjectPBZ/Content/Paks/~mods/PBZTangCombat.json`，并从 `discovered.txt` 的 mods 数组中移除 id 为 PBZTangCombat 的条目（若加载器自动重新生成发现清单则无需手动修改）。保留公共加载器及其他 Mod；如需撤销本包对共享脚本的覆盖，请恢复安装前的备份。

## 调试报告

报告位于 `%LOCALAPPDATA%/ProjectPBZ/Saved/`：`PBZTangCombat-report.json` 和 `PBZTangUltimate-report.json`。时长定义读回成功不代表实际强化必定持续满 30 秒，需施放绝技实测。
