import {Link} from "react-router-dom";

import {useChain} from "../hooks/useChain.js";
import {useTasks} from "../hooks/useTasks.js";
import {formatUsdt, shortAddress} from "../lib/format.js";

export function Landing() {
  const chain = useChain();
  const {tasks: open} = useTasks({status: ["created"]});
  const {tasks: settled} = useTasks({status: ["settled"]});

  const totalSettledBounty = settled.reduce((acc, t) => acc + t.budget, 0n);

  return (
    <div className="landing">
      <section className="hero">
        <h1>The world's first AI-callable physical reality oracle</h1>
        <p className="lede">
          QuestLens is a base-layer protocol on Injective. Any AI agent or
          application can pay humans to photograph, verify, or simply look at
          something in the real world — with cryptographic proof of capture
          and on-chain settlement in stablecoins.
        </p>
        <div className="hero-cta">
          <Link to="/worker" className="btn btn-primary">
            Browse {open.length} open task{open.length === 1 ? "" : "s"} →
          </Link>
          <Link to="/requester" className="btn btn-ghost">
            Post a task
          </Link>
        </div>
      </section>

      <section className="kpis">
        <div className="kpi">
          <div className="kpi-num">{open.length}</div>
          <div className="kpi-lbl">open tasks</div>
        </div>
        <div className="kpi">
          <div className="kpi-num">{settled.length}</div>
          <div className="kpi-lbl">settled tasks</div>
        </div>
        <div className="kpi">
          <div className="kpi-num">{formatUsdt(totalSettledBounty)} mUSDT</div>
          <div className="kpi-lbl">paid to workers</div>
        </div>
        <div className="kpi">
          <div className="kpi-num mono">{shortAddress(chain.config.taskEscrowAddress)}</div>
          <div className="kpi-lbl">TaskEscrow on chain</div>
        </div>
      </section>

      <section className="how">
        <h2>How it works</h2>
        <ol className="how-steps">
          <li>
            <strong>Requester</strong> locks a 0.5–2.0 mUSDT bounty in TaskEscrow with
            a signed DataRequirement (target GPS, radius, time window, category).
          </li>
          <li>
            <strong>Worker</strong> stakes 0.1 mUSDT to accept, captures a photo,
            and submits a Proof signed by the device's hardware secure element.
          </li>
          <li>
            <strong>Relayer Node</strong> runs a 3-layer Verification Pipeline
            (signature + GPS + platform attestation, then ResNet, then
            Azure deep forensics on disputes).
          </li>
          <li>
            <strong>TaskEscrow</strong> settles instantly: 0.95 mUSDT to the
            Worker, 0.05 mUSDT protocol fee. Fraud forfeits the stake to the
            community reward pool and treasury.
          </li>
        </ol>
      </section>
    </div>
  );
}
