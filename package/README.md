# PBZTangCombat 0.4.3 安装目录

0.4.3 移除“保存设置”按钮及对应菜单适配，恢复原来的自动保存与自动热重载。保留现有 INI / JSON 中的自选数值；升级后重启一次游戏以清除已载入的旧菜单改动。

此目录保留 PBZModLoader 和 PBZModsMenu 两种安装布局，用于同步维护和分别打包。两种方式使用相同的 Mod 源码和默认配置，发布后由用户选择其中一个安装包。游戏内设置界面依赖 PBZModsMenu 0.7.0 注册接口；单独 PBZModLoader 缺少此菜单组件时仍可通过配置文件调整数值。

## 分别打包

不要直接打包整个 ProjectPBZ 目录：这里同时保留两套 Mod 副本。后续每次发布生成两个独立压缩包，输出到根目录的 release/：

| 输出文件 | 从本目录选取的游戏文件 |
| --- | --- |
| `PBZTangCombat-<版本号>-PBZModLoader.zip` | `ProjectPBZ/PBZModLoader/mods/PBZTangCombat/` 和 `ProjectPBZ/Content/Paks/~mods/PBZTangCombat.json` |
| `PBZTangCombat-<版本号>-PBZModsMenu.zip` | `ProjectPBZ/Content/`，包括 PBZModsMenu 脚本、发现清单和配置 |

打包前从根目录 mod/PBZTangCombat/ 同步全部 Mod 脚本到两种布局，核对版本号及功能一致；从根目录 PBZTangCombat.json 同步配置。若某个加载器需要专门适配，保留并记录差异后再同步，避免覆盖修复。

每个压缩包应附带 LICENSE 和只针对该加载器的安装说明，且只包含一份 PBZTangCombat。PBZModsMenu 版按当前要求完整收录本地 Content/，包括 PBZMapMarkers、PBZWeaponProbe 等随附文件；PBZModLoader 版不加入这些 PBZModsMenu 文件。

## 安装

1. 安装好所选版本对应的加载器，退出游戏并备份自定义配置。PBZModsMenu 版还需备份已有的 `ProjectPBZ/Content/JavaScript/PBZModsMenu/`。
2. 若另一加载路径下已安装 PBZTangCombat，先移除那一份；从 PBZModsMenu 切换出去时同时清理其发现清单中的 PBZTangCombat 条目，或让加载器重新生成清单。保留公共加载器及其他 Mod。
3. 使用单个安装包时，将其中的 `ProjectPBZ/` 复制到游戏根目录并合并同名目录。若直接从本打包目录安装，只复制上表中所选加载器对应的文件，不能复制整个 ProjectPBZ/。
4. 启动游戏，载入存档并手持黑伤／黑魔伤；重新施放黑魔伤绝技后验证强化时长。

PBZModLoader 脚本安装位置为 `ProjectPBZ/PBZModLoader/mods/PBZTangCombat/`；PBZModsMenu 脚本安装位置为 `ProjectPBZ/Content/JavaScript/PBZModsMenu/Mods/PBZTangCombat/`。两者均包含 main.js、controller.js、ultimate.js、settings.js，默认配置均为伤害与 AngerDamage 各 1.25 倍，绝技强化时长定义为 30 秒。

安装新版后首次启动游戏，进入设置 → 模组菜单 → 黑伤 / 黑魔伤，或按菜单默认快捷键 F9。停止拖动滑条后自动保存，并重载本 Mod 的效果控制器；绝技时长从下一次施放生效。修改脚本文件仍需加载器热重载或重启游戏。

0.4.1 的 PBZModsMenu 包带有更新的 manager.js，安装后需重启一次以启用单 Mod 重载接口。之后菜单保存失败时，Mod 会读取菜单选择，在稳定约 0.75 秒后自行写入并核对字段，再请求加载器只重载 PBZTangCombat。另有磁盘配置变更检测。接口不可用、加载器忙或达到 64 次会话上限时退回效果刷新。PBZModLoader 版使用效果刷新备用路径。新版通过 42 项模拟检查，尚待实机确认。

## 配置

- `enabled`：true 开启，false 关闭。
- `attackMultiplier`：物理伤害倍率，默认 1.25，支持 1 至 10。
- `angerMultiplier`：AngerDamage 倍率，默认 1.25，支持 1 至 10。
- `ultimateSeconds`：黑魔伤绝技强化秒数，默认 30，设为 0 关闭时长修改。

配置约每 0.25 秒读取一次。接入菜单时从 JSON 迁移生成同目录 `PBZTangCombat.ini`，此后 INI 优先（enabled=On/Off），JSON 仅作旧配置保留。安装包不包含 INI，避免覆盖已保存设置。若曾安装旧实验，须保持游戏目录的 `PBZTangBalance.json` 中 enabled=false。

## 卸载

退出游戏后，删除所选加载路径下的 PBZTangCombat 文件夹及 `ProjectPBZ/Content/Paks/~mods/` 下的 PBZTangCombat.json、PBZTangCombat.ini。PBZModsMenu 版还需从 `discovered.txt` 的 mods 数组中移除 id 为 PBZTangCombat 的条目（若加载器自动重新生成发现清单则无需手动修改）。保留公共加载器及其他 Mod；如需撤销 PBZModsMenu 包对共享脚本的覆盖，请恢复安装前的备份。

## 调试报告

报告位于 `%LOCALAPPDATA%/ProjectPBZ/Saved/`：`PBZTangCombat-report.json` 和 `PBZTangUltimate-report.json`。时长定义读回成功不代表实际强化必定持续满 30 秒，需施放绝技实测。
