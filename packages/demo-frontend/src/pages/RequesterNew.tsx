import {useState} from "react";
import {useNavigate} from "react-router-dom";
import type {DataRequirementV1, TargetCategory} from "@questlens/schemas";

import {MapPicker} from "../components/Map.js";
import {useChain} from "../hooks/useChain.js";
import {saveDataRequirement} from "../lib/dataRequirementStore.js";
import {formatUsdt} from "../lib/format.js";

const CATEGORIES: {value: TargetCategory; label: string}[] = [
  {value: "storefront", label: "Storefront"},
  {value: "traffic_sign", label: "Traffic sign"},
  {value: "vehicle_damage", label: "Vehicle damage"},
  {value: "construction_site", label: "Construction site"},
  {value: "weather_phenomenon", label: "Weather phenomenon"},
  {value: "other", label: "Other"},
];

export function RequesterNew() {
  const chain = useChain();
  const navigate = useNavigate();

  const [lat, setLat] = useState(chain.config.targetLatitude);
  const [lon, setLon] = useState(chain.config.targetLongitude);
  const [radius, setRadius] = useState(100);
  const [category, setCategory] = useState<TargetCategory>("storefront");
  const [bountyMicros, setBountyMicros] = useState(1_000_000); // 1 mUSDT default
  const [hours, setHours] = useState(24);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const now = Date.now();
      const dr: DataRequirementV1 = {
        schemaVersion: "1.0",
        targetLatitude: lat,
        targetLongitude: lon,
        radiusMeters: radius,
        timeWindowStart: new Date(now - 60_000).toISOString(),
        timeWindowEnd: new Date(now + hours * 3600_000).toISOString(),
        targetCategory: category,
      };
      const client = chain.clientFor("requester");
      const result = await client.createTask({
        budget: BigInt(bountyMicros),
        stablecoin: chain.config.mockUsdtAddress,
        dataRequirement: dr,
      });
      saveDataRequirement(result.dataRequirementHash, dr);
      navigate(`/requester/tasks/${result.taskId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-section">
      <div className="page-header">
        <div>
          <h1>Post a new task</h1>
          <p className="subtitle">
            Describe what you need photographed. The bounty is locked in TaskEscrow
            and released to the Worker on verified delivery.
          </p>
        </div>
      </div>

      <form className="form-grid" onSubmit={onSubmit}>
        <div className="form-col">
          <label>
            Category
            <select value={category} onChange={(e) => setCategory(e.target.value as TargetCategory)}>
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            Bounty <span className="muted">{formatUsdt(BigInt(bountyMicros))} mUSDT</span>
            <input
              type="range"
              min={500_000}
              max={2_000_000}
              step={50_000}
              value={bountyMicros}
              onChange={(e) => setBountyMicros(Number(e.target.value))}
            />
          </label>

          <label>
            Capture radius <span className="muted">{radius} m</span>
            <input
              type="range"
              min={20}
              max={500}
              step={10}
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
            />
          </label>

          <label>
            Window <span className="muted">{hours} h from now</span>
            <input
              type="range"
              min={1}
              max={72}
              step={1}
              value={hours}
              onChange={(e) => setHours(Number(e.target.value))}
            />
          </label>

          <label>
            Coordinates
            <div className="coord-row">
              <input
                type="number"
                step="0.000001"
                value={lat}
                onChange={(e) => setLat(Number(e.target.value))}
              />
              <input
                type="number"
                step="0.000001"
                value={lon}
                onChange={(e) => setLon(Number(e.target.value))}
              />
            </div>
            <div className="muted small">click the map to move the pin</div>
          </label>

          {error ? <div className="error">{error}</div> : null}

          <button className="btn btn-primary" type="submit" disabled={submitting}>
            {submitting ? "Locking bounty…" : `Lock ${formatUsdt(BigInt(bountyMicros))} mUSDT and post`}
          </button>
        </div>

        <div className="form-col">
          <MapPicker
            lat={lat}
            lon={lon}
            radiusM={radius}
            onChange={(la, lo) => {
              setLat(Number(la.toFixed(6)));
              setLon(Number(lo.toFixed(6)));
            }}
            height={420}
          />
        </div>
      </form>
    </div>
  );
}
