import type {StepKey, StepUpdate} from "../lib/demoFlow.js";

const STEPS: Array<{key: StepKey; title: string; hint: string}> = [
  {key: "create", title: "Task created", hint: "Requester locks 1 mUSDT in TaskEscrow"},
  {key: "stake", title: "Worker accepts", hint: "Worker stakes 0.1 mUSDT and gets a 1h deadline"},
  {key: "capture", title: "Photo captured", hint: "Browser camera + signed Proof v1 (P-256)"},
  {key: "verify", title: "Verification pipeline", hint: "Layer 1 (signature, GPS, attestation) + L2/L3 stubs"},
  {key: "settle", title: "Settled on Injective", hint: "submitProof transfers 0.95 mUSDT + 0.1 stake to Worker"},
];

export interface StepsProps {
  states: Record<StepKey, StepUpdate | undefined>;
}

export function Steps({states}: StepsProps) {
  return (
    <div className="steps">
      {STEPS.map((step, idx) => {
        const update = states[step.key];
        const cls =
          update?.state === "done"
            ? "step done"
            : update?.state === "active"
              ? "step active"
              : update?.state === "failed"
                ? "step failed"
                : "step";
        return (
          <div className={cls} key={step.key}>
            <div className="marker">{update?.state === "done" ? "✓" : update?.state === "failed" ? "!" : idx + 1}</div>
            <div>
              <div className="label">{step.title}</div>
              <div className="detail">{update?.detail ?? step.hint}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
