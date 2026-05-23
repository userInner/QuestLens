import {useEffect, useState} from "react";
import type {TaskInfo, TaskStatus} from "@questlens/sdk";

import {useChain} from "./useChain.js";

export interface UseTasksOptions {
  status?: TaskStatus[];
  requester?: string;
  worker?: string;
  pollMs?: number;
}

/** Live task feed. Polls the chain at `pollMs` and re-fetches on relevant events. */
export function useTasks(opts: UseTasksOptions = {}): {
  tasks: TaskInfo[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
} {
  const chain = useChain();
  const [tasks, setTasks] = useState<TaskInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pollMs = opts.pollMs ?? 4000;

  const fetcher = async () => {
    try {
      const list = await chain.readonlyClient.listTasks({
        ...(opts.status ? {status: opts.status} : {}),
        ...(opts.requester ? {requester: opts.requester} : {}),
        ...(opts.worker ? {worker: opts.worker} : {}),
      });
      setTasks(list.sort((a, b) => Number(b.taskId - a.taskId)));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetcher();
    const id = window.setInterval(() => void fetcher(), pollMs);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opts.status?.join(","), opts.requester, opts.worker, pollMs]);

  return {tasks, loading, error, refresh: fetcher};
}
