# 30 秒备份视频脚本

**用途**：现场网络出问题或 demo 卡死时的兜底，让评审在 30 秒内仍能看到完整闭环。

**录制工具**：QuickTime Player 屏幕录制，或 OBS Studio。  
**输出文件**：`docs/demo-backup.mov`（不入 git，文件名固定方便切换）  
**分辨率**：1920×1080，60fps，硬盘上保留至少两份（U 盘 + iCloud）

---

## 录制前准备

```bash
# 1. 干净环境
make demo-down
rm -rf .demo-state

# 2. 启动栈
make demo-up
# 等到 "demo stack is ready in 4s"

# 3. 浏览器 Chrome / Edge 打开
open http://127.0.0.1:5173

# 4. 浏览器全屏（Cmd-Ctrl-F），关闭书签栏
# 5. 终端字体调到 16-18pt
# 6. 屏幕录制工具就绪，光标隐藏
```

---

## 镜头脚本（共 30 秒，分 4 段）

### 段 1 · 协议层定位（0:00 - 0:05）

**画面**：浏览器顶端 "QuestLens Protocol — Hackathon Golden Path"  
**字幕**：`Decentralized Physical-World Data Oracle on Injective`

**操作**：什么都不点，停留 5 秒让镜头稳。

---

### 段 2 · Happy Path（0:05 - 0:18）

**画面**：浏览器主区  
**操作**：点 **Run golden path**

**字幕同步**（每行 2-3 秒）：
- `Step 1: Requester locks 1 mUSDT` （task created tx hash 出现时）
- `Step 2: Worker stakes 0.1 mUSDT` （stake tx hash 出现时）
- `Step 3: Photo signed in browser (P-256)` （capture step done 时）
- `Step 4: Relayer runs L1 + L2 pipeline` （verify step active 时）
- `Step 5: Settled on-chain in 550 ms` （settle step done 时，**右下角 Result panel 显示总耗时**）

---

### 段 3 · 反作弊（0:18 - 0:25）

**画面**：浏览器主区  
**操作**：点 **Inject GPS-out-of-range**

**字幕**：
- `Worker fakes location 5 km away` （0:19）
- `Layer 1 rejects: distanceM=5560, allowedM=100` （结果出来时，0:21）
- `No on-chain settle. No slash. (Per spec R11.3)` （0:23）

**画面强调**：用屏幕标注工具圈出 **distanceM=5560** 这个数字。这是协议层亲自计算的，不是前端模拟。

---

### 段 4 · 形式化验证（0:25 - 0:30）

**画面**：切到终端窗口（提前在另一窗口跑过 `make invariant` 留着结果）  
**字幕**：`5 invariants × 4096 random sequences. 0 reverts.`

**画面**：5 行 `[PASS] invariant_*` 全部高亮显示。

**最后定格 1 秒**：仓库地址 `github.com/<...>/questlens-protocol`

---

## 录两个版本

1. **`demo-backup-30s.mov`** — 上面这版，用于 Demo Day 现场兜底
2. **`demo-backup-90s.mov`** — 加上 emulator 注入 + `make invariant` 完整跑一遍 + Pipeline 三层架构图淡入。用于事后投稿黑客松官方频道、Twitter / X、Discord 分享

90 秒版的额外脚本：

| 时间 | 画面 | 字幕 |
|---|---|---|
| 0:30-0:40 | 第二次按 Inject emulator | `Android emulator detection — Play Integrity verdict` |
| 0:40-0:55 | 终端 `make invariant`，逐行高亮 5 个 PASS | `Property-based fuzzing of design.md correctness properties` |
| 0:55-1:10 | 终端 `pnpm --filter @questlens/relayer test` | `19 unit tests covering 9 adversarial scenarios` |
| 1:10-1:25 | 浏览器再跑一遍 happy path | `End-to-end in 550 ms on Injective testnet` |
| 1:25-1:30 | 仓库地址 + QR 码 | `make demo-up && open http://127.0.0.1:5173` |

---

## 常见录制坑

- **mac 上不要用 Cmd-Tab 切换窗口**：录制工具会捕获 Mission Control 动画。改用预先排好的两窗口布局（command + 浏览器并排），用鼠标点。
- **进度条切换太快没看清**：每按一次按钮停 1 秒再切下一段，事后剪辑时可以加速。
- **浏览器自动填充密码弹窗**：录前用无痕窗口或新建 profile。
- **测试网 RPC 偶发抖动**：录完后回放，如果哪一步超过 1.5 秒，重录那段。
- **键盘敲命令显得仓促**：终端命令提前在历史里准备好，录的时候上箭头 + 回车，省掉打字时间。

---

## 镜头之外要做的

录完之后顺手做：

1. **截一张定格高清海报**（happy path 完成、5 步全 ✓ 的那一帧），用作社交媒体配图
2. **截一份 `make invariant` 的 5 行 PASS 输出**，配 "PoP, not Promises" 文案
3. **3 张架构图导出 PNG**（Architecture / Pipeline / Lifecycle），放进 docs/diagrams/

这三件事加起来 5 分钟，但能让你后面发 X / Telegram / Discord 时随手就有素材。
