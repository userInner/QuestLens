import {Link} from "react-router-dom";
import type {TaskInfo} from "@questlens/sdk";

import {MiniMap} from "./Map.js";
import {StatusBadge} from "./StatusBadge.js";
import type {DataRequirementV1} from "@questlens/schemas";
import {formatDistance, formatRelativeTime, formatUsdt, shortAddress} from "../lib/format.js";

interface Props {
  task: TaskInfo;
  dataRequirement?: DataRequirementV1;
  distanceM?: number;
  basePath: string; // "/worker" or "/requester"
}

export function TaskCard({task, dataRequirement, distanceM, basePath}: Props) {
  const lat = dataRequirement?.targetLatitude;
  const lon = dataRequirement?.targetLongitude;
  const radius = dataRequirement?.radiusMeters;
  const category = dataRequirement?.targetCategory ?? "(unknown)";

  return (
    <Link to={`${basePath}/tasks/${task.taskId}`} className="task-card">
      <div className="task-card-map">
        {lat !== undefined && lon !== undefined ? (
          <MiniMap lat={lat} lon={lon} radiusM={radius} height={120} />
        ) : (
          <div className="map-placeholder">no coords</div>
        )}
      </div>
      <div className="task-card-body">
        <div className="task-card-header">
          <span className="task-id">#{task.taskId.toString()}</span>
          <StatusBadge status={task.status} />
        </div>
        <div className="task-card-cat">{category}</div>
        <dl className="task-card-stats">
          <dt>bounty</dt>
          <dd>{formatUsdt(task.budget)} mUSDT</dd>
          {distanceM !== undefined ? (
            <>
              <dt>distance</dt>
              <dd>{formatDistance(distanceM)}</dd>
            </>
          ) : null}
          <dt>requester</dt>
          <dd>{shortAddress(task.requester)}</dd>
          {task.createdAt > 0 ? (
            <>
              <dt>posted</dt>
              <dd>{formatRelativeTime(task.createdAt)}</dd>
            </>
          ) : null}
        </dl>
      </div>
    </Link>
  );
}
