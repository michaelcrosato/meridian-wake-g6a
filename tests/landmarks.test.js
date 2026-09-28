import assert from "node:assert/strict";
import test from "node:test";
import { createSpecialLandmarks, describeLandmark } from "../src/landmarks.js";
import { disposeObject } from "../src/ship-model.js";

// Named references and attributes are from the pinned source planet definitions.
const destination = (name, attributes, description = "") => ({
	name,
	attributes,
	description,
});
function classify(planet, extra = []) {
	return describeLandmark({ planet: planet.name, planets: [...extra, planet] });
}

test("source gaslining, starlining and ringworld destinations receive their own landmark families", () => {
	assert.equal(
		classify(destination("Nasqueron", ["requires: gaslining"])).kind,
		"gas-giant",
	);
	assert.equal(
		classify(
			destination("Exotic Metal Garden", [
				"predecessor",
				"station",
				"uninhabited",
				"requires: starlining",
			]),
		).kind,
		"stellar-garden",
	);
	assert.equal(
		classify(
			destination("Giaru Gegno", [
				"gegno quarg",
				"quarg",
				"ringworld",
				"station",
			]),
		).kind,
		"ringworld",
	);
	assert.equal(
		classify(
			destination(
				"Lagrange",
				["human quarg", "quarg", "station", "tourism"],
				"The Quarg built this station centuries ago, before they began construction on the ringworld.",
			),
		).kind,
		"ring-station",
	);
	assert.equal(
		classify(destination("Station Cian", ["station"])).kind,
		"station",
	);
	assert.equal(
		describeLandmark({ name: "Empty star", planets: [] }).kind,
		"star",
	);
});

test("selected destination controls classification without changing ordinary New Boston or garden worlds", () => {
	const boston = destination("New Boston", [
		"dirt belt",
		"farming",
		"textiles",
	]);
	const jupiter = destination("Jupiter", ["gas giant", "requires: gaslining"]);
	assert.equal(classify(boston, [jupiter]).kind, "planet");
	assert.equal(
		classify(destination("Far Garden", ["farming", "saryd", "urban"])).kind,
		"planet",
	);
	assert.equal(
		classify(
			destination(
				"Remote Blue",
				["kimek", "urban"],
				"Most Kimek here prefer to live far away from the Heliarch ringworlds.",
			),
		).kind,
		"planet",
	);
	assert.equal(
		classify(
			destination(
				"Garden Empyreal",
				["coalition station"],
				"Not including the trio of Quarg ringworlds, this is the largest megastructure in Coalition space.",
			),
		).kind,
		"station",
	);
});

test("all specialized landmarks have finite geometry and use a bounded number of draw batches", () => {
	const landmarks = createSpecialLandmarks();
	try {
		for (const kind of [
			"gas-giant",
			"stellar-garden",
			"ringworld",
			"ring-station",
			"station",
		]) {
			landmarks.set({ kind, name: kind, palette: "amber" });
			let batches = 0;
			landmarks.group.traverseVisible((node) => {
				if (!node.isMesh) return;
				batches++;
				assert.ok(
					Array.from(node.geometry.attributes.position.array).every(
						Number.isFinite,
					),
				);
			});
			assert.ok(batches <= 12, `${kind} keeps static geometry batched`);
		}
	} finally {
		disposeObject(landmarks.group);
	}
});
