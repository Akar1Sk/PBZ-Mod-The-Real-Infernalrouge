# 黑伤 / 黑魔伤战斗倍率试验版 0.2.0

目的：玩家当前手持 Tang（黑伤及铸魂黑魔伤）时，物理攻击伤害通道与 AngerDamage 通道各乘 1.75，可配置 1 至 10 倍。不是修改背包面板攻击力。

## 与参考 Mod 的关系

参考用户提供的 HeiMoShang_1.0.0_Offline_Full 中 Scripts/exit_damage.lua：它通过 UE4SS 的原生回调，对验证过归属及资源名称的大招攻击模块调用 AddModifier，Multiply=1。该参考仅修改特定大招攻击，不代表已经验证所有招式。

本实现是新写的 PBZModLoader / PuerTS JavaScript 试验，并非 Lua 脚本的直接移植。它使用 SDK 中另一条攻击修正路径：CharacterWeaponsComponent.GetCurrentWeapon → RuntimeWeaponSingleData.WeaponActors → WeaponActor.AddWeaponBuffWithNiagaraComponents。每个 Buff 都有单独的移除句柄。参考包原文件保持原样，不安装它的 UE4SS DLL、动作修改或其他功能。

AngerDamage 在参考包说明中对应对敌人的杀气伤害。是否完全对应你所说的“削韧”、以及哪些攻击实际使用 WeaponActor 修正，必须实战核实。飞行物或特殊招式可能绕过此路径。

## 配置

将 PBZTangCombat.json 放到游戏目录 ProjectPBZ/Content/Paks/~mods/ 下。

- enabled: true 开启，false 移除本 Mod 拥有的 Buff。
- attackMultiplier: 物理伤害通道倍率，当前值 1.75。
- angerMultiplier: AngerDamage 倍率，当前值 1.75。
- 两个倍率仅接受 1 至 10。

配置约每 0.25 秒读取一次。原实验 PBZTangBalance.json 必须保持 enabled=false；否则本 Mod 拒绝启用，避免混合实验。

## 安装（二选一，只装一份）

PBZModLoader：把 mod/PBZTangCombat 整个文件夹复制到游戏 ProjectPBZ/PBZModLoader/mods/PBZTangCombat，入口 main.js 和 controller.js 应在同一层。已有 PBZModLoader 可用 Alt+F5 重载，或重启游戏。

PBZModsMenu 内置加载器：把同一文件夹放到 ProjectPBZ/Content/JavaScript/PBZModsMenu/Mods/PBZTangCombat。新增 Mod 后重启游戏；已启用开发热重载时，修改已有脚本可按左 Ctrl+F5。

不要同时在两个目录安装。本包不包括或替换任何加载器 DLL。

## 验证步骤

1. 启动游戏并载入存档，切到黑伤或黑魔伤为当前手持武器。
2. 等待几秒，读取 %LOCALAPPDATA%/ProjectPBZ/Saved/PBZTangCombat-report.json。
3. waiting-for-Tang：尚未取得当前目标武器；loaded-awaiting-local-Tang：已载入，等待首次检查。
4. weapon-calculation-verified-combat-unverified：在武器实例上，GetModifiedAttackData 对相同合成输入的输出已验证为预期倍率；这不是命中敌人的实战证明。
5. error-paused：记录错误、尝试移除已有 Buff，并停止继续施加。不要把这个状态误认为启用成功。
6. 固定敌人、相同招式和相同战斗状态，分别在 enabled=false / true 下比较生命与杀气变化。可各记录三次，避免暴击、连段、Buff 和敌人防御变化干扰。

## 清理与局限

切到其他武器时，约下一次轮询移除本 Mod Buff。每个 Buff 最多持续 30 游戏秒，20 秒后先移除再刷新；不会把旧倍率再乘一次。stop() 会取消定时器并移除本 Mod 句柄。关闭配置、切图或退出游戏会停止本次运行的影响；伤害模块不修改存档或共享武器配置表。若退出脚本时移除失败，报告会保留错误，有限时长作为兜底。

如果游戏中已启用：先设置 enabled=false，确认报告 disabled，再移除本 Mod 文件夹。游戏已退出时可直接移除文件夹。保留公共加载器及其他 Mod。

SDK 声明标注 reflection-generated, not individually call-tested。本版已通过 11 项模拟测试和 JS 语法检查；真实 PuerTS 绑定与实战效果尚未验证，可能需要根据首份报告修正。

## 开发资料

reference/ 为从 zoneoflkf/PBZModLoader 下载的接口声明，仅供开发参考，不随游戏 Mod 安装。

- https://github.com/zoneoflkf/PBZModLoader/blob/main/sdk/types/generated/SGameCombatSystem.d.ts
- https://github.com/zoneoflkf/PBZModLoader/blob/main/sdk/types/generated/ProjectPBZ.d.ts
- https://github.com/zoneoflkf/PBZModLoader/blob/main/sdk/types/ue.d.ts
- https://github.com/zoneoflkf/PBZModLoader/blob/main/sdk/types/puerts.d.ts

测试：有 Node.js 时运行 node tests/run.cjs。测试覆盖重复轮询不叠加、换武器移除、双 Actor、关闭、10 倍更新、无效接口、无效配置、旧实验冲突、计算无效时回滚、外部 Buff 保留。模拟测试不替代真实游戏测试。
2026-11-14：用户确认 10 倍版本实战有效；随后按要求调为 1.75 倍。该反馈不等于已验证所有招式或单独测量每个伤害通道。

## 2026-11-15：绝技强化时长

新增 ultimateSeconds: 30。仅针对黑魔伤 GE_Hun_HeiMoShang_Buff 的静态持续时间定义，要求原值为 10 秒、持续时间策略为 HasDuration、无曲线覆盖。手持 Tang 时修改为 30 秒，关闭、切换武器或 stop() 时恢复本模块原值；发现其他 Mod 改动则停止覆盖。原有伤害、AngerDamage 保持各 1.75 倍。

这是作用于专属效果类默认对象的时长修改。正在生效的 GameplayEffect Spec 不会被重新施加；测试需在脚本加载后重新施放绝技。原生切换、离战、死亡等取消规则仍可能提前结束效果，本版不移除这些规则。普通黑伤没有被替换为黑魔伤技能。

首次新增 ultimate.js 后重启游戏，或按当前加载器的热重载快捷键。报告位于 %LOCALAPPDATA%/ProjectPBZ/Saved/PBZTangUltimate-report.json：duration-definition-verified-awaiting-cast 只证明持续时间定义读回为 30 秒，需施放绝技确认实际持续时间；error-paused 为接口或资源不匹配；倍率模块独立运行。

ultimateSeconds=0 关闭时长功能，enabled=false 同时关闭两项功能。配置省略 ultimateSeconds 时默认关闭，以兼容旧配置。停用后已产生的效果不会强行删除，正常结束即可。

0.2.0 通过原有 11 项战斗模拟测试和新增 8 项时长模拟测试；30 秒功能尚未经过本次游戏内验证。