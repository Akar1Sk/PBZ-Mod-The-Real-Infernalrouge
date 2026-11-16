# PBZTangCombat 0.2.0 安装目录

本目录按游戏目录结构保存当前安装文件，不包含加载器 DLL。需要先安装并配置好 PBZModLoader 或 PBZModsMenu，只选择一种加载方式。

## PBZModLoader

将本目录中的 `ProjectPBZ/` 复制到游戏根目录并合并同名目录。脚本应位于 `ProjectPBZ/PBZModLoader/mods/PBZTangCombat/`，配置应位于 `ProjectPBZ/Content/Paks/~mods/PBZTangCombat.json`。

## PBZModsMenu

将本目录的 `ProjectPBZ/PBZModLoader/mods/PBZTangCombat/` 文件夹复制到游戏的 `ProjectPBZ/Content/JavaScript/PBZModsMenu/Mods/`。配置仍复制到 `ProjectPBZ/Content/Paks/~mods/PBZTangCombat.json`。不要同时安装到两个加载器。

默认物理伤害与 AngerDamage 各 1.75 倍，黑魔伤绝技强化时长定义为 30 秒。新增脚本后重启游戏，重新施放绝技验证时长；原生取消规则可能提前结束效果。

完整使用说明、验证状态和开发目录结构见仓库根目录的 [README](../README.md)。
