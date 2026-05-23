import Ajv2020Module from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

// Ajv 2020 entry exports the constructor as both `default` and as the `Ajv2020`
// named export. We use `default` and cast through unknown to dodge ESM/CJS quirks.
const Ajv2020 = Ajv2020Module as unknown as new (opts?: object) => InstanceType<typeof Ajv2020Module["default"]>;

/** Build a configured Ajv instance for QuestLens schemas (Draft 2020-12 + date-time format). */
export function makeAjv() {
  const ajv = new Ajv2020({allErrors: true, strict: false});
  // ajv-formats type defs are a bit fussy across ajv major versions.
  (addFormats as unknown as (a: unknown) => void)(ajv);
  return ajv;
}
