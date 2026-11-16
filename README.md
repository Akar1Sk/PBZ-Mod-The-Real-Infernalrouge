# 黑伤 / 黑魔伤战斗倍率试验版 0.2.0

原版黑伤太弱了, 自己加强了数值, 并把大招时间延长至30秒, 原本的10秒根本不够打一套完整输出

## 项目目录

| 路径 | 用途 |
| --- | --- |
| `PBZTangCombat.json` | 当前默认配置：伤害与削韧各 1.75 倍，绝技强化 30 秒 |
| `tests/` | 战斗倍率与绝技时长模拟测试 |
| `package/` | 按游戏目录结构整理的 PBZModLoader 安装内容 |
| `archive/experiments/` | 已停用的配置表修改实验及其备份 |
| `archive/backup-before-ultimate/` | 添加绝技时长功能前的代码与配置备份 |

使用PBZmodloader作为前置

## 配置

将 PBZTangCombat.json 放到游戏目录 ProjectPBZ/Content/Paks/~mods/ 下。

- enabled: true 开启，false 移除本 Mod 拥有的 Buff。
- attackMultiplier: 物理伤害通道倍率，当前值 1.75。
- angerMultiplier: AngerDamage 倍率，当前值 1.75。
- 两个倍率仅接受 1 至 10。

配置约每 0.25 秒读取一次。原实验 PBZTangBalance.json 必须保持 enabled=false；否则本 Mod 拒绝启用，避免混合实验。

## 开发资料

SDK 接口声明来自 zoneoflkf/PBZModLoader。

- https://github.com/zoneoflkf/PBZModLoader/blob/main/sdk/types/generated/SGameCombatSystem.d.ts
- https://github.com/zoneoflkf/PBZModLoader/blob/main/sdk/types/generated/ProjectPBZ.d.ts
- https://github.com/zoneoflkf/PBZModLoader/blob/main/sdk/types/ue.d.ts
- https://github.com/zoneoflkf/PBZModLoader/blob/main/sdk/types/puerts.d.ts


