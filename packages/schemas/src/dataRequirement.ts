/**
 * DataRequirement v1 - Open Schema for QuestLens task requests.
 *
 * Spec reference: Requirements 9 and design Component 3.
 * Public URL: https://schema.questlens.io/dataRequirement/v1.json
 *
 * The on-chain `dataRequirement` parameter is keccak256 of the RFC 8785
 * canonical form of an object conforming to this schema.
 */

export const DATA_REQUIREMENT_SCHEMA_URL =
  "https://schema.questlens.io/dataRequirement/v1.json";

export type TargetCategory =
  | "storefront"
  | "traffic_sign"
  | "vehicle_damage"
  | "construction_site"
  | "weather_phenomenon"
  | "other";

export interface DataRequirementV1 {
  schemaVersion: "1.0";
  targetLatitude: number;
  targetLongitude: number;
  /** Acceptable distance from the target point in meters. Min 1, max 500. */
  radiusMeters: number;
  /** ISO 8601 date-time. Inclusive lower bound on capture time. */
  timeWindowStart: string;
  /** ISO 8601 date-time. Inclusive upper bound on capture time. */
  timeWindowEnd: string;
  targetCategory: TargetCategory;
  minImageWidthPx?: number;
  minImageHeightPx?: number;
  additionalConstraints?: string[];
}

/**
 * JSON Schema for DataRequirement v1. Loaded at runtime by Ajv.
 * Mirrors the public document at DATA_REQUIREMENT_SCHEMA_URL.
 */
export const dataRequirementSchema = {
  $id: DATA_REQUIREMENT_SCHEMA_URL,
  title: "QuestLens DataRequirement v1",
  description:
    "Open schema describing what a Requester is asking for. Identified on-chain by keccak256 of the RFC 8785 canonical form.",
  type: "object",
  additionalProperties: false,
  required: [
    "schemaVersion",
    "targetLatitude",
    "targetLongitude",
    "radiusMeters",
    "timeWindowStart",
    "timeWindowEnd",
    "targetCategory",
  ],
  properties: {
    schemaVersion: {const: "1.0"},
    targetLatitude: {type: "number", minimum: -90, maximum: 90},
    targetLongitude: {type: "number", minimum: -180, maximum: 180},
    radiusMeters: {type: "number", minimum: 1, maximum: 500},
    timeWindowStart: {type: "string", format: "date-time"},
    timeWindowEnd: {type: "string", format: "date-time"},
    targetCategory: {
      type: "string",
      enum: [
        "storefront",
        "traffic_sign",
        "vehicle_damage",
        "construction_site",
        "weather_phenomenon",
        "other",
      ],
    },
    minImageWidthPx: {type: "integer", minimum: 320},
    minImageHeightPx: {type: "integer", minimum: 320},
    additionalConstraints: {
      type: "array",
      items: {type: "string"},
    },
  },
} as const;
