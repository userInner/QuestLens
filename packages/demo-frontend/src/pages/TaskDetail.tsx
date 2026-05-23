import {useEffect, useState} from "react";
import {useNavigate, useParams} from "react-router-dom";

import {MiniMap} from "../components/Map.js";
import {StatusBadge} from "../components/StatusBadge.js";
import {useChain} from "../hooks/useChain.js";
import {buildBrowserProof} from "../lib/browserProof.js";
import {captureDemoImage} from "../lib/captureImage.js";
import {loadDataRequirement} from "../lib/dataRequirementStore.js";
import {formatRemainingTime, formatUsdt, haversineMeters, shortAddress, shortHash} from "../lib/format.js";
import {submitToRelayer, type RelayerResponse} from "../lib/relayerClient.js";
import type {TaskInfo, TaskStatus} from "@questlens/sdk";
import type {DataRequirementV1} from "@questlens/schemas";

interface Props {
  role: "requester" | "worker";
}

export function TaskDetail({role}: Props) {
  const {taskId: idParam} = useParams();
  const navigate = useNavigate();
  const chain = useChain();

  const taskId = idParam ? BigInt(idParam) : 0n;
  const [task, setTask] = useState<TaskInfo | null>(null);
  const [dr, setDr] = useState<DataRequirementV1 | null>(null);
  const [busy, setBusy] = useState(false);
  const [logs, setLogs] = useState<{ts: number; msg: string; level: "info" | "ok" | "warn" | "fail"}[]>([]);
  const [relayerResponse, setRelayerResponse] = useState<RelayerResponse | null>(null);

  const log = (msg: string, level: "info" | "ok" | "warn" | "fail" = "info") => {
    setLogs((prev) => [...prev, {ts: Date.now(), msg, level}]);
  };

  const refresh = async () => {
    try {
      const info = await chain.readonlyClient.getTaskInfo(taskId);
      setTask(info);
      const stored = loadDataRequirement(info.dataRequirement);
      if (stored) setDr(stored);
    } catch (err) {
      log(`Could not load task: ${err instanceof Error ? err.message : String(err)}`, "fail");
    }
  };

  useEffect(() => {
    if (!taskId) return;
    void refresh();
    const id = window.setInterval(() => void refresh(), 4000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId]);

  if (!task) {
    return (
      <div className="page-section">
        <p className="subtitle">Loading task #{taskId.toString()}…</p>
      </div>
    );
  }

  const isWorker = role === "worker";
  const canStake = isWorker && task.status === "created";
  const isMyTask =
    isWorker
      ? task.worker.toLowerCase() === chain.worker.address.toLowerCase()
      : task.requester.toLowerCase() === chain.requester.address.toLowerCase();
  const canSubmit = isWorker && task.status === "accepted" && isMyTask;
  const canRefund = role === "requester" && isMyTask && (task.status === "created" || task.status === "accepted");

  const submissionDeadline = task.acceptedAt > 0 ? task.acceptedAt + 3600 : 0;
  const taskDeadline = task.createdAt > 0 ? task.createdAt + 72 * 3600 : 0;

  const onStake = async () => {
    setBusy(true);
    try {
      log("Staking 0.1 mUSDT to accept this task…");
      const client = chain.clientFor("worker");
      const r = await client.stakeForTask({
        taskId,
        stablecoin: chain.config.mockUsdtAddress,
        stakeAmount: chain.config.workerStakeAmount,
      });
      log(`Staked, tx ${shortHash(r.txHash)}`, "ok");
      await refresh();
    } catch (err) {
      log(`Stake failed: ${err instanceof Error ? err.message : String(err)}`, "fail");
    } finally {
      setBusy(false);
    }
  };

  const onSubmit = async (mode: "honest" | "gps" | "emulator") => {
    if (!dr) {
      log("Cannot submit: no DataRequirement available off-chain", "fail");
      return;
    }
    setBusy(true);
    setRelayerResponse(null);
    try {
      log(`Capturing image (${mode === "honest" ? "honest" : "with " + mode + " injection"})…`);
      const blob = await captureDemoImage();
      const lat = mode === "gps" ? dr.targetLatitude + 0.05 : dr.targetLatitude;
      const lon = dr.targetLongitude;
      const platformAttestation = mode === "emulator" ? "FAIL_EMULATOR_DEMO" : "DEMO_OK_DEVICE";
      log(`Building signed Proof (P-256)…`);
      const {proof, imageBytes} = await buildBrowserProof({
        taskId,
        imageBlob: blob,
        capturedLatitude: lat,
        capturedLongitude: lon,
        platformAttestation,
      });
      log(`Posting Proof to Relayer…`);
      const r = await submitToRelayer(chain.config.relayerUrl, proof, dr, imageBytes);
      setRelayerResponse(r);
      const v = r.verdict;
      log(
        `Pipeline ${r.layersRun.join("→")}; verdict ${v.ok ? "OK" : v.reason}; action ${r.action}`,
        v.ok ? "ok" : "warn",
      );
      if (r.txHash) log(`On-chain tx ${shortHash(r.txHash)}`, "ok");
      await refresh();
    } catch (err) {
      log(`Submission failed: ${err instanceof Error ? err.message : String(err)}`, "fail");
    } finally {
      setBusy(false);
    }
  };

  const onRefund = async () => {
    setBusy(true);
    try {
      log("Calling claimRefund…");
      // SDK doesn't expose claimRefund yet for this demo; use raw contract call.
      const {Contract} = await import("ethers");
      const escrow = new Contract(
        chain.config.taskEscrowAddress,
        ["function claimRefund(uint256 taskId)"],
        chain.requester,
      );
      const fn = escrow["claimRefund"] as ((id: bigint) => Promise<{wait: () => Promise<unknown>}>) | undefined;
      if (!fn) throw new Error("claimRefund function unavailable");
      const tx = await fn(taskId);
      await tx.wait();
      log(`Refund claimed`, "ok");
      await refresh();
    } catch (err) {
      log(`Refund failed: ${err instanceof Error ? err.message : String(err)}`, "fail");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page-section detail">
      <button className="link-back" onClick={() => navigate(-1)}>
        ← Back
      </button>
      <div className="detail-grid">
        <div className="detail-main">
          <div className="detail-header">
            <h1>Task #{task.taskId.toString()}</h1>
            <StatusBadge status={task.status} />
          </div>

          {dr ? (
            <MiniMap lat={dr.targetLatitude} lon={dr.targetLongitude} radiusM={dr.radiusMeters} height={260} />
          ) : (
            <div className="map-placeholder">no coords (DataRequirement unavailable off-chain)</div>
          )}

          <dl className="kv">
            <dt>Category</dt>
            <dd>{dr?.targetCategory ?? "(unknown)"}</dd>
            <dt>Bounty</dt>
            <dd>{formatUsdt(task.budget)} mUSDT</dd>
            <dt>Worker stake</dt>
            <dd>{formatUsdt(task.workerStake)} mUSDT</dd>
            <dt>Requester</dt>
            <dd>{shortAddress(task.requester)}</dd>
            <dt>Worker</dt>
            <dd>{task.worker === "0x0000000000000000000000000000000000000000" ? "—" : shortAddress(task.worker)}</dd>
            {dr ? (
              <>
                <dt>Coordinates</dt>
                <dd>
                  ({dr.targetLatitude.toFixed(6)}, {dr.targetLongitude.toFixed(6)}), within {dr.radiusMeters} m
                </dd>
                <dt>Window</dt>
                <dd>
                  {new Date(dr.timeWindowStart).toLocaleString()} →{" "}
                  {new Date(dr.timeWindowEnd).toLocaleString()}
                </dd>
                <dt>Distance from you</dt>
                <dd>
                  {Math.round(
                    haversineMeters(
                      chain.config.targetLatitude,
                      chain.config.targetLongitude,
                      dr.targetLatitude,
                      dr.targetLongitude,
                    ),
                  )}{" "}
                  m
                </dd>
              </>
            ) : null}
            {task.status === "created" && taskDeadline > 0 ? (
              <>
                <dt>Auto-refund in</dt>
                <dd>{formatRemainingTime(taskDeadline)}</dd>
              </>
            ) : null}
            {task.status === "accepted" && submissionDeadline > 0 ? (
              <>
                <dt>Submission deadline</dt>
                <dd>{formatRemainingTime(submissionDeadline)}</dd>
              </>
            ) : null}
            <dt>dataRequirement hash</dt>
            <dd className="mono small">{shortHash(task.dataRequirement, 12, 10)}</dd>
          </dl>
        </div>

        <aside className="detail-side">
          <div className="panel">
            <h3>Actions</h3>
            {canStake ? (
              <button className="btn btn-primary" disabled={busy} onClick={onStake}>
                Stake 0.1 mUSDT and accept
              </button>
            ) : null}
            {canSubmit ? (
              <>
                <button className="btn btn-primary" disabled={busy} onClick={() => void onSubmit("honest")}>
                  Capture & submit (honest)
                </button>
                <button className="btn btn-ghost" disabled={busy} onClick={() => void onSubmit("gps")}>
                  Submit with GPS spoof (will be slashed L1)
                </button>
                <button className="btn btn-ghost" disabled={busy} onClick={() => void onSubmit("emulator")}>
                  Submit with emulator (will be slashed L1)
                </button>
              </>
            ) : null}
            {canRefund ? (
              <button className="btn btn-danger" disabled={busy} onClick={onRefund}>
                Claim refund
              </button>
            ) : null}
            {!canStake && !canSubmit && !canRefund ? (
              <p className="subtitle">No actions available in current state.</p>
            ) : null}
          </div>

          {relayerResponse ? (
            <div className="panel">
              <h3>Latest verdict</h3>
              <div className="verdict-summary">
                <StatusBadge status={relayerResponse.verdict.ok ? "settled" : "slashed"} />
                <span className="mono">
                  L{relayerResponse.verdict.layer} {relayerResponse.verdict.ok ? "OK" : relayerResponse.verdict.reason}
                </span>
              </div>
              <pre className="codeblock">
                {JSON.stringify(relayerResponse.verdict.details ?? {}, null, 2)}
              </pre>
              {relayerResponse.txHash ? (
                <div className="muted small">tx {shortHash(relayerResponse.txHash, 12, 10)}</div>
              ) : null}
            </div>
          ) : null}

          <div className="panel">
            <h3>Live log</h3>
            <div className="log">
              {logs.length === 0 ? (
                <div className="muted">no events yet</div>
              ) : (
                logs.map((l, i) => (
                  <div key={i} className={`line ${l.level}`}>
                    <span className="muted">[{new Date(l.ts).toLocaleTimeString()}] </span>
                    {l.msg}
                  </div>
                ))
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
