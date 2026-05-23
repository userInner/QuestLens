# QuestLens Protocol · 一页纸 Pitch

> 面向 AI 与 Web3 的去中心化"真实物理世界"预言机

---

## 一句话

**任何 AI Agent 或应用都能调用 QuestLens 的 API，让人类去物理世界"看一眼"，并把结果以可验证的方式记录到 Injective 链上。**

## 我们解决什么

| 痛点 | 现状 | QuestLens |
|---|---|---|
| AI 视觉模型缺真实世界边角案例（暴雨红绿灯、车底盘擦碰等） | 自动驾驶 / 无人机公司预算充沛但找不到供给 | Web3 众包网络，全球任何人路过即可接单 |
| 跨境微额结算 | Scale AI / Toloka 法币 T+7~T+30，0.5 美元跨境无解 | Injective 稳定币秒级到账，全球零摩擦 |
| 反作弊靠人工审核 | 成本高、慢、不可验证 | 三层 AI 漏斗 + 链上质押罚没，**协议层强制**而非平台政策 |

## 协议层的最小定义（**严格只有四样**）

```
Requesters (AI Agents / 数据公司 / DApp)
        │
        ▼  createTask via SDK or raw ABI
┌──────────────────────────────────────────┐
│  Injective EVM 合约层                    │
│  ① TaskEscrow      托管赏金 / 罚没      │
│  ② ReputationReg   信誉 / 节点注册      │
└──────────────▲───────────────────────────┘
               │ submitProof / slashWorker
┌──────────────┴───────────────────────────┐
│  Relayer Node (Phase 1 SGX 单节点 → Phase 2 乐观验证)
│  Pipeline: L1 设备签名 → L2 ResNet → L3 Azure 取证
└──────────────▲───────────────────────────┘
               │ ④ Proof Standard (P-256 over RFC 8785)
┌──────────────┴───────────────────────────┐
│  Worker_Clients (Telegram Mini App / DePIN 硬件)
│      ③ DataRequirement Schema (公开 JSON Schema)
└──────────────────────────────────────────┘
```

**任何第三方都能写自己的 Requester / Worker / Relayer**，因为四样都是公开标准。这才是协议，不是 SaaS。

## 反作弊：能跑通的不是 PPT

我们不说"我们用 AI 反作弊"。我们的 9 类对抗场景都有**专门的单元测试和具体的拒绝代码**：

| 攻击 | 协议响应 | 拒绝码 |
|---|---|---|
| 签名篡改 | L1 拒绝，不罚没 | `INVALID_SIG` |
| 拍完照偷改字段 | L1 拒绝，不罚没 | `INVALID_SIG` |
| 时钟漂移 > 120s | L1 拒绝，不罚没 | `TIMESTAMP_DRIFT` |
| GPS 偏离 > 200m | L1 拒绝，不罚没 | `GPS_OUT_OF_RANGE` |
| 安卓模拟器 | L1 拒绝，不罚没 | `PLATFORM_ATTEST_FAIL`/emulator |
| Root / 越狱 | L1 拒绝，不罚没 | `PLATFORM_ATTEST_FAIL`/rooted |
| Fake-GPS app | L1 拒绝，不罚没 | `MOCK_LOCATION` |
| 跟任务无关的内容 | L2 ResNet 拒绝，**罚没 0.1 USDT** | `IRRELEVANT_CONTENT` |
| Photoshop / AIGC 生成 | L3 Azure 拒绝，**罚没** | `IMAGE_TAMPERED` / `AI_GENERATED` |

**漏斗式审核**：L1 零成本（端侧加密签名验证），L2 极低成本（本地 ResNet），L3 仅在 bounty > 1 USDT 或被申诉时触发，单次 API 成本上限 0.1 USDT。

## 形式化验证：协议性质机器可证

design.md 的 11 条 correctness properties 已落成 **5 个 Foundry invariant**，每个跑 4096 个随机操作序列，0 reverts：

- 余额守恒：escrow 合约余额恒等于 $\sum$ 锁定 budget + $\sum$ 锁定 stake
- 单 Worker：每个 Accepted task 只有一个 Worker
- 结算/罚没原子性：95%/5% 分账 / 50%/50% 罚没 永远精确
- 信誉边界：每个 Worker reputation 恒在 [0, 100]，3 次罚没自动永久封禁
- 授权完备：submitProof / slashWorker 必须由活跃 Relayer 调用

## Demo Day 现场可复现

```bash
git clone questlens-protocol && cd questlens-protocol
make install
make demo-up        # 4 秒启动 anvil + 部署 + Relayer + 前端
open http://127.0.0.1:5173
# 按 "Run golden path" — 5 步进度条填满，~550ms 完成端到端
# 按 "Inject GPS-out-of-range" — L1 显示 distanceM=5560 / allowedM=100
# 按 "Inject emulator attestation" — L1 显示 PLATFORM_ATTEST_FAIL kind=emulator
make rehearse       # 完整自动彩排（CI 也跑这个）
make invariant      # 5 properties × 4096 sequences
```

## 工程指标

| 维度 | 数字 |
|---|---|
| 协议合约 | 2 份，~600 行 Solidity |
| 单元测试 | 50 个，全部 < 1 秒 |
| Invariant 测试 | 5 个 × 4096 序列，<600ms |
| Pipeline 反作弊覆盖 | 9 种对抗场景 |
| Demo 端到端 | ~550ms |
| 部署时间 | 4 秒（一键 `make demo-up`） |

## 当前状态

- ✅ Phase 1 协议合约 + 反作弊 Pipeline 跑通（含 SGX mock 标记，便于切换真实部署）
- ✅ DataRequirement Schema + Proof Standard 已发布为 v1
- ✅ TypeScript SDK + 浏览器 Demo 前端
- ✅ 一键 Demo Day 脚本 + 自动彩排
- ⏳ Phase 1 加固：真实 Azure SGX 部署、ERC-4337 paymaster、Telegram Mini App
- ⏳ Phase 2 去中心化：100 USDT 节点质押 + 24h 挑战期 + DAO 仲裁

## 团队需要的东西

1. **Microsoft 生态对接**：Azure Confidential VM 配额（SGX 真实部署），Azure 视觉 API 试用额度
2. **Web3Labs 内推**：Injective 主网部署 + 测试网 USDT/USDC 流动性
3. **AI 数据集 design partner**：自动驾驶 / 无人机 / 零售视觉团队，作为冷启动期的 B 端付费方

---

**联系方式**：（待补充）  
**仓库**：`questlens-protocol/`（45 单元测试 + 5 invariant + 2 端到端 smoke 全部 green）
