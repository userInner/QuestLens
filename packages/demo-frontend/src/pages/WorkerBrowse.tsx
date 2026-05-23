import {useMemo, useState} from "react";

import {TaskCard} from "../components/TaskCard.js";
import {useChain} from "../hooks/useChain.js";
import {useTasks} from "../hooks/useTasks.js";
import {haversineMeters} from "../lib/format.js";
import {loadDataRequirement} from "../lib/dataRequirementStore.js";

type SortKey = "distance" | "bounty" | "newest";

export function WorkerBrowse() {
  const chain = useChain();
  const {tasks, loading, error, refresh} = useTasks({status: ["created"]});
  const [sort, setSort] = useState<SortKey>("newest");
  const [category, setCategory] = useState<string>("all");

  // Worker's "current location" - default to the demo target so the distance
  // column shows something meaningful even before the worker shares GPS.
  const [myLat] = useState<number>(chain.config.targetLatitude);
  const [myLon] = useState<number>(chain.config.targetLongitude);

  const decorated = useMemo(() => {
    return tasks.map((t) => {
      const dr = loadDataRequirement(t.dataRequirement);
      const distance =
        dr?.targetLatitude !== undefined && dr.targetLongitude !== undefined
          ? haversineMeters(myLat, myLon, dr.targetLatitude, dr.targetLongitude)
          : undefined;
      return {task: t, dr, distance};
    });
  }, [tasks, myLat, myLon]);

  const filtered = useMemo(() => {
    const list = decorated.filter((d) => {
      if (category !== "all" && d.dr?.targetCategory !== category) return false;
      return true;
    });
    list.sort((a, b) => {
      switch (sort) {
        case "distance":
          return (a.distance ?? Infinity) - (b.distance ?? Infinity);
        case "bounty":
          return Number(b.task.budget - a.task.budget);
        case "newest":
        default:
          return Number(b.task.taskId - a.task.taskId);
      }
    });
    return list;
  }, [decorated, sort, category]);

  return (
    <div className="page-section">
      <div className="page-header">
        <div>
          <h1>Open task marketplace</h1>
          <p className="subtitle">
            Pick a task near you. Stake 0.1 mUSDT to accept, you have 1 hour to submit.
          </p>
        </div>
        <button className="btn btn-ghost" onClick={() => void refresh()}>
          Refresh
        </button>
      </div>

      <div className="toolbar">
        <label>
          Sort
          <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
            <option value="newest">Newest</option>
            <option value="distance">Distance</option>
            <option value="bounty">Highest bounty</option>
          </select>
        </label>
        <label>
          Category
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="all">All</option>
            <option value="storefront">Storefront</option>
            <option value="traffic_sign">Traffic sign</option>
            <option value="vehicle_damage">Vehicle damage</option>
            <option value="construction_site">Construction site</option>
            <option value="weather_phenomenon">Weather phenomenon</option>
            <option value="other">Other</option>
          </select>
        </label>
      </div>

      {error ? <div className="error">Failed to load tasks: {error}</div> : null}

      {loading && filtered.length === 0 ? (
        <div className="empty">Loading tasks…</div>
      ) : filtered.length === 0 ? (
        <div className="empty">
          <p>No open tasks right now.</p>
          <p className="subtitle">
            Switch to the <em>Post task</em> tab and create one to populate the marketplace.
          </p>
        </div>
      ) : (
        <div className="task-grid">
          {filtered.map(({task, dr, distance}) => (
            <TaskCard
              key={task.taskId.toString()}
              task={task}
              {...(dr ? {dataRequirement: dr} : {})}
              {...(distance !== undefined ? {distanceM: distance} : {})}
              basePath="/worker"
            />
          ))}
        </div>
      )}
    </div>
  );
}
