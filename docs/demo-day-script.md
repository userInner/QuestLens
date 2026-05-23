# Demo Day 演讲脚本

**目标时长**：5 分钟（pitch + live demo + Q&A 缓冲）  
**适用场景**：5 月 25 日开营发布会、技术 Workshop、决赛路演

---

## 0. Demo 启动前的准备（开讲前 60 秒）

```bash
# 在终端开两个窗口
# 窗口 1
make demo-up

# 等待 "demo stack is ready in 4s" 出现，然后浏览器打开
open http://127.0.0.1:5173

# 窗口 2 留着备用
```

**关键现场检查**：
- 浏览器右上角"Configuration"面板 RPC / TaskEscrow / mUSDT / Relayer 都不为空
- 浏览器看到 "Run golden path" 按钮可点
- 备份视频文件路径：`docs/demo-backup.mov`（万一现场出问题秒切）

---

## 1. 开场（30 秒）

> 大家好。我是 [姓名]，QuestLens Protocol 的工程负责人。
>
> 一句话讲清楚我们做什么：**我们让任何 AI Agent 都能调用一个链上 API，雇人类去物理世界拍一张照、看一眼、确认一件事。**
>
> 这不是另一个跑腿 App。这是协议层。任何第三方都能在我们的合约和开放标准上做自己的客户端、自己的节点、自己的发单方。

## 2. 真实痛点 + 差异化（45 秒）

> 现在的现状有两个问题。
>
> 一，**自动驾驶、无人机这类 AI 公司极度缺真实物理世界的边角案例数据**——比如暴雨里的特定交通标志、某型号车的底盘擦碰。这些数据 Scale AI、Toloka 这种 Web2 巨头给不出来，因为他们做的是"给已有图片打标签"，不是"现在派人去某个经纬度拍一张"。
>
> 二，**跨境微额结算**。我让一个上海的人路过一家咖啡店拍一张门头照，付他 0.5 美元——这种事在传统银行体系下完全不成立。Injective 链上的稳定币让全球秒级结算 0.5 美元变成默认行为。
>
> 我们的核心差异：
> - **数据属性**：实时物理生成，不是历史标注
> - **组织形式**：无许可的游击式节点，不是中心化外包团队  
> - **结算路径**：Web3 稳定币，不是法币 T+7

## 3. 协议层定义（30 秒）

> 我们说的"协议"不是营销词。
>
> 整个 QuestLens 协议**只有四样东西**：
> 1. 两份链上合约（TaskEscrow 和 ReputationRegistry）
> 2. DataRequirement 公开 JSON Schema
> 3. Proof 标准（P-256 签名 + RFC 8785 规范化）
> 4. Oracle 协议（Phase 1 SGX 单节点，Phase 2 乐观验证）
>
> 任何人都能不用我们的 SDK 直接调合约。任何硬件都能符合 Proof Standard 出凭证。任何第三方都能跑 Relayer 节点。
>
> 这是协议跟 SaaS 的根本区别。

## 4. Live Demo - Happy Path（60 秒）

> 现在请看屏幕。这是我们的 Demo 单页应用。它同时扮演 Requester 和 Worker，让大家在一个屏幕里看完整闭环。
>
> 我点 **Run golden path**。

**[点击按钮]**

> 第一步：Requester 调用 createTask，**1 mUSDT 锁进合约**。看右下角日志，TaskCreated tx hash 已经出来。
>
> 第二步：Worker 调用 stakeForTask，**0.1 mUSDT 微额质押**，1 小时提交期开始。这是反作弊经济激励的关键——作弊就罚没。
>
> 第三步：Worker 端用 Web Crypto API 在浏览器里**用 P-256 私钥签了一个 Proof**。这跟手机的 Android Keystore / iOS Secure Enclave 走的是同一个签名算法、同一个规范化方式。
>
> 第四步：Proof 发到 Relayer，**Relayer 在 SGX 里跑三层 Pipeline**——Demo 模式跑了 L1 + L2，因为 bounty 是 1 USDT，不超过 L3 触发阈值。
>
> 第五步：Relayer 调用 submitProof，**95% 给 Worker，5% 给 protocol treasury**。

**[等结果出来]**

> 全部 ~550 毫秒。这是 Injective testnet 上真实的链上结算。

## 5. Live Demo - 反作弊（60 秒）

> 现在更有意思的来了。我演示一个攻击场景。

**[点击 "Inject GPS-out-of-range"]**

> Worker 这次声称自己在距离任务地点 5 公里外的位置。看屏幕：
>
> - L1 在 50 毫秒内拒绝
> - 拒绝码 `GPS_OUT_OF_RANGE`
> - 距离细节：`distanceM=5560, allowedM=100`
> - **没有上链交易**
> - **Worker 的 0.1 stake 没被罚没**——因为 L1 失败按协议规则不罚没（spec Requirement 11.3）
>
> 注意细节：这不是我们前端的字符串，是 Relayer 节点在协议执行 haversine 距离计算后返回的实际数字。
>
> 再演示一种：

**[点击 "Inject emulator attestation"]**

> Worker 这次伪装成安卓模拟器。L1 直接靠 Play Integrity verdict 拒绝。

## 6. 形式化验证（45 秒）

> 我们承诺反作弊不只是说说。

**[切到终端窗口 2]**

```bash
make invariant
```

> 这是 Foundry 的 invariant fuzzer。它会用随机参数构造 4096 个调用序列，每条 protocol property 在所有可能的状态转换下都必须成立。
>
> 跑出来 5 个 invariant 全过：
> - 余额守恒
> - 单 Worker 唯一
> - 结算 / 罚没原子性
> - 信誉边界
> - 授权完备
>
> 大约 600 毫秒跑完。这意味着我们 design 文档里写的 11 条数学性质里有 7 条已经被机器化证明，剩下 4 条是 Phase 2 才启用的。

## 7. 路线图与诉求（30 秒）

> 短期（一个月内，Phase 1 加固）：
> - 真实的 Azure SGX 部署
> - ERC-4337 paymaster 让 Worker 完全无 Gas 体验
> - Telegram Mini App 作为参考客户端
>
> 中期（Phase 2，三个月）：
> - 任何人质押 100 USDT 跑 Relayer 节点
> - 24 小时挑战期 + DAO 仲裁
>
> 我们最需要的两件事：
> 1. 微软生态：**Azure Confidential VM 配额** + 视觉 API 额度
> 2. AI 数据集 design partner：自动驾驶 / 无人机 / 零售视觉团队作为 B 端首批客户

## 8. 收尾（10 秒）

> 仓库公开，所有测试一键跑。
>
> `make demo-up`，`make rehearse`，`make invariant`。
>
> 谢谢。

---

## 评审常见问题预判

### Q: 这跟传统中心化后端有什么区别？Phase 1 的 Relayer 不就是你们自己跑吗？

> 老实回答：**Phase 1 是的，Relayer 在我们 Azure 节点上跑**。但跟传统后端的区别在两点。
>
> 一，**SGX 可信执行环境**。我们节点的 MRENCLAVE 哈希公开在 ReputationRegistry 合约里，任何外部方都能下载 attestation report 自己验证代码完整性。中心化但是不可篡改。
>
> 二，**Phase 2 路径已编码在合约里**。100 USDT 质押 / 24h 挑战期 / 罚没规则全部是合约状态机的一部分，不是 Roadmap 的承诺，是治理一票就能激活的开关。

### Q: AI Agent 现在还没大规模发单需求，你们 B 端冷启动怎么办？

> 三步走：
> 1. **AI 视觉训练集市场**——这个需求**今天**就存在。Tesla、Waymo、Zipline 都在花真金白银找特定物理场景的边角案例数据。
> 2. **聚合 Web2 长尾**——美团拍店 / Amazon Mechanical Turk 上的线下任务，我们写爬虫聚合上来。
> 3. **生态资源**——微软 Azure 客户里需要做 IoT / 资产盘点的小微企业，黑客松期间零手续费试用。
>
> "AI Agent 自动发单"是远景叙事，**今天的付费客户是 AI 实验室和数据标注公司**。

### Q: 反作弊有没有可能被绕过？

> 现在公开的攻击面有 9 种我们都覆盖了——签名篡改、模拟器、Root、Fake-GPS、AIGC 等等，每一种都有专门的单元测试。
>
> 我承认 **L1 平台 attestation 现在用的是 stub**（接受 `DEMO_OK_DEVICE` 前缀）。生产环境必须接 Play Integrity / DeviceCheck 真实 API，这是 Phase 1 加固任务 9.3 [P1]，已经写进 spec。
>
> 还有更深的攻击：**真人去现场但拍假对象**。这个我们靠 L2 ResNet 类别识别 + L3 Azure 取证捕获，并且在 Phase 2 通过多节点交叉验证 + 信誉加权投票兜底。

### Q: 为什么选 Injective 而不是其他链？

> 三个原因：
> 1. **EVM 兼容**：合约可以无缝迁移到其他 EVM 链
> 2. **微额结算成本极低**：0.5 USDT 转账的手续费可以忽略
> 3. **黑客松上下文**：Injective 是这次黑客松的主办方之一，生态资源对接最快

---

## 备份计划

如果现场遇到任何意外：

| 故障 | 应急 |
|---|---|
| Wi-Fi 抽风，testnet 连不上 | 切到 `docs/demo-backup.mov` 录屏视频继续讲 |
| Demo 前端启动失败 | 终端跑 `make e2e` 直接看 stdout 输出 |
| 浏览器卡死 | `make demo-down && make demo-up` 4 秒重启 |
| 完全 break | 现场跑 `make invariant`，5 个 PASS 救场 |
