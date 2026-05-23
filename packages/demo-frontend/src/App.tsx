import {useCallback, useMemo, useRef, useState} from "react";

import {Steps} from "./components/Steps.js";
import {loadConfig, type DemoConfig} from "./lib/config.js";
import {runGoldenPath, type RunResult, type StepKey, type StepUpdate} from "./lib/demoFlow.js";

type StepsState = Record<StepKey, StepUpdate | undefined>;

const initialSteps: StepsState = {
  create: undefined,
  stake: undefined,
  capture: undefined,
  verify: undefined,
  settle: undefined,
};

interface LogLine {
  line: string;
  level: "info" | "warn" | "fail" | "ok";
  ts: number;
}

export default function App() {
  const initialConfig = useMemo(() => safeLoadConfig(), []);
  const [config, setConfig] = useState<DemoConfig | null>(initialConfig.ok ? initialConfig.config : null);
  const [configError, setConfigError] = useState<string | null>(initialConfig.ok ? null : initialConfig.error);
  const [steps, setSteps] = useState<StepsState>(initialSteps);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<RunResult | null>(null);
  const [logs, setLogs] = useState<LogLine[]>([]);
  const logBoxRef = useRef<HTMLDivElement>(null);

  const log = useCallback((line: string, level: LogLine["level"] = "info") => {
    setLogs((prev) => [...prev, {line, level, ts: Date.now()}]);
    queueMicrotask(() => {
      const el = logBoxRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }, []);

  const onProgress = useCallback((u: StepUpdate) => {
    setSteps((prev) => ({...prev, [u.step]: u}));
  }, []);

  const runDemo = useCallback(
    async (mode?: "gps" | "emulator") => {
      if (!config) return;
      setRunning(true);
      setResult(null);
      setSteps(initialSteps);
      setLogs([]);
      try {
        const opts: Parameters<typeof runGoldenPath>[0] = {config, onProgress, log};
        if (mode) opts.forceFailure = mode;
        const r = await runGoldenPath(opts);
        setResult(r);
      } catch (err) {
        log(`Demo aborted: ${err instanceof Error ? err.message : String(err)}`, "fail");
      } finally {
        setRunning(false);
      }
    },
    [config, log, onProgress],
  );

  if (configError || !config) {
    return (
      <div className="shell">
        <h1 className="title">QuestLens demo - configuration needed</h1>
        <div className="panel">
          <p>The frontend needs the deployed contract addresses. Set the following Vite env vars or create a <code>.env.local</code> in <code>packages/demo-frontend</code>:</p>
          <pre style={{whiteSpace: "pre-wrap"}}>{`VITE_RPC_URL=http://127.0.0.1:8545
VITE_TASK_ESCROW=0x...
VITE_MOCK_USDT=0x...
VITE_RELAYER_URL=http://127.0.0.1:3000
VITE_TARGET_LAT=31.230416
VITE_TARGET_LON=121.473701`}</pre>
          <p style={{color: "var(--muted)"}}>{configError}</p>
          <ConfigInline onLoaded={(c) => {setConfig(c); setConfigError(null);}} />
        </div>
      </div>
    );
  }

  return (
    <div className="shell">
      <h1 className="title">QuestLens Protocol — Hackathon Golden Path</h1>
      <p className="subtitle">
        End-to-end: Requester locks bounty → Worker stakes → captures Proof → Relayer verifies → Settled on-chain.
      </p>

      <div className="cols">
        <div>
          <div className="panel">
            <h2>Pipeline progress</h2>
            <Steps states={steps} />
            <div className="actions">
              <button className="primary" disabled={running} onClick={() => runDemo()}>
                {running ? "Running…" : "Run golden path"}
              </button>
              <button disabled={running} onClick={() => runDemo("gps")}>
                Inject GPS-out-of-range
              </button>
              <button disabled={running} onClick={() => runDemo("emulator")}>
                Inject emulator attestation
              </button>
            </div>
          </div>

          <div className="panel">
            <h2>Result</h2>
            {result ? (
              <dl className="kv">
                <dt>taskId</dt><dd>{result.taskId.toString()}</dd>
                <dt>create tx</dt><dd>{result.createTxHash}</dd>
                <dt>stake tx</dt><dd>{result.stakeTxHash}</dd>
                <dt>verdict</dt>
                <dd>
                  <span className={`tag ${result.relayer.verdict.ok ? "ok" : "fail"}`}>
                    L{result.relayer.verdict.layer} {result.relayer.verdict.ok ? "OK" : result.relayer.verdict.reason}
                  </span>
                </dd>
                <dt>action</dt><dd>{result.relayer.action}</dd>
                <dt>relayer tx</dt><dd>{result.relayer.txHash ?? "-"}</dd>
                <dt>elapsed</dt><dd>{result.totalMs} ms</dd>
              </dl>
            ) : (
              <p className="subtitle" style={{margin: 0}}>Run the golden path to see results here.</p>
            )}
          </div>
        </div>

        <div>
          <div className="panel">
            <h2>Configuration</h2>
            <dl className="kv">
              <dt>RPC</dt><dd>{config.rpcUrl}</dd>
              <dt>TaskEscrow</dt><dd>{config.taskEscrowAddress || <em>missing</em>}</dd>
              <dt>mUSDT</dt><dd>{config.mockUsdtAddress || <em>missing</em>}</dd>
              <dt>Relayer</dt><dd>{config.relayerUrl}</dd>
              <dt>Target</dt><dd>({config.targetLatitude.toFixed(6)}, {config.targetLongitude.toFixed(6)})</dd>
              <dt>Bounty</dt><dd>{(Number(config.bountyAmount) / 1e6).toFixed(2)} mUSDT</dd>
              <dt>Worker stake</dt><dd>{(Number(config.workerStakeAmount) / 1e6).toFixed(2)} mUSDT</dd>
            </dl>
          </div>

          <div className="panel">
            <h2>Live log</h2>
            <div className="log" ref={logBoxRef}>
              {logs.length === 0 ? (
                <div className="line" style={{color: "var(--muted)"}}>(empty - run a demo to populate)</div>
              ) : (
                logs.map((l, i) => (
                  <div key={i} className={`line ${l.level}`}>
                    <span style={{opacity: 0.5}}>[{new Date(l.ts).toLocaleTimeString()}] </span>
                    {l.line}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function safeLoadConfig(): {ok: true; config: DemoConfig} | {ok: false; error: string} {
  try {
    const c = loadConfig();
    if (!c.taskEscrowAddress || !c.mockUsdtAddress) {
      return {ok: false, error: "VITE_TASK_ESCROW and VITE_MOCK_USDT must be set."};
    }
    return {ok: true, config: c};
  } catch (err) {
    return {ok: false, error: err instanceof Error ? err.message : String(err)};
  }
}

function ConfigInline({onLoaded}: {onLoaded: (c: DemoConfig) => void}) {
  const [taskEscrow, setTaskEscrow] = useState("");
  const [mockUsdt, setMockUsdt] = useState("");
  const [rpcUrl, setRpcUrl] = useState("http://127.0.0.1:8545");
  const [relayerUrl, setRelayerUrl] = useState("http://127.0.0.1:3000");

  return (
    <div style={{marginTop: 16}}>
      <h2 style={{margin: "0 0 8px"}}>Or paste addresses inline (demo only)</h2>
      <div className="config-row"><label>RPC</label><input value={rpcUrl} onChange={(e) => setRpcUrl(e.target.value)} /></div>
      <div className="config-row"><label>TaskEscrow</label><input value={taskEscrow} onChange={(e) => setTaskEscrow(e.target.value)} placeholder="0x..." /></div>
      <div className="config-row"><label>mUSDT</label><input value={mockUsdt} onChange={(e) => setMockUsdt(e.target.value)} placeholder="0x..." /></div>
      <div className="config-row"><label>Relayer</label><input value={relayerUrl} onChange={(e) => setRelayerUrl(e.target.value)} /></div>
      <button
        className="primary"
        disabled={!taskEscrow || !mockUsdt}
        onClick={() =>
          onLoaded({
            rpcUrl,
            taskEscrowAddress: taskEscrow,
            mockUsdtAddress: mockUsdt,
            relayerUrl,
            requesterPrivateKey: "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
            workerPrivateKey: "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a",
            targetLatitude: 31.230416,
            targetLongitude: 121.473701,
            targetCategory: "storefront",
            bountyDecimals: 6,
            bountyAmount: 1_000_000n,
            workerStakeAmount: 100_000n,
          })
        }
      >
        Use these addresses
      </button>
    </div>
  );
}
