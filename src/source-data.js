// Node/test entry point. Vite expands the same lossless snapshot via dataSnapshotsPlugin.
import { readSourceData } from "../scripts/data-snapshots.mjs";
export const {
	EXTRA_DATA,
	FLEET_DATA,
	MISSION_DATA,
	OUTFIT_DATA,
	PLANET_DATA,
	SALE_DATA,
	SHIP_DATA,
	SOURCE_COMMIT,
	SYSTEM_DATA,
} = readSourceData();
