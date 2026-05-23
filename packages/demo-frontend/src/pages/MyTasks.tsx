import {useMemo} from "react";

import {TaskCard} from "../components/TaskCard.js";
import {useChain} from "../hooks/useChain.js";
import {useTasks} from "../hooks/useTasks.js";
import {loadDataRequirement} from "../lib/dataRequirementStore.js";

interface Props {
  role: "requester" | "worker";
}

export function MyTasks({role}: Props) {
  const chain = useChain();
  const address = role === "requester" ? chain.requester.address : chain.worker.address;

  const {tasks, loading, error} = useTasks(
    role === "requester" ? {requester: address} : {worker: address},
  );

  const decorated = useMemo(
    () => tasks.map((t) => ({task: t, dr: loadDataRequirement(t.dataRequirement)})),
    [tasks],
  );

  return (
    <div className="page-section">
      <div className="page-header">
        <h1>{role === "requester" ? "Tasks I've posted" : "Tasks I've accepted"}</h1>
      </div>

      {error ? <div className="error">{error}</div> : null}
      {loading && tasks.length === 0 ? (
        <div className="empty">Loading…</div>
      ) : tasks.length === 0 ? (
        <div className="empty">
          <p>{role === "requester" ? "You haven't posted anything yet." : "You haven't accepted any tasks yet."}</p>
        </div>
      ) : (
        <div className="task-grid">
          {decorated.map(({task, dr}) => (
            <TaskCard
              key={task.taskId.toString()}
              task={task}
              {...(dr ? {dataRequirement: dr} : {})}
              basePath={`/${role}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
