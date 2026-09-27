import assert from "node:assert/strict";
import test from "node:test";
import {
	DEFAULT_BINDINGS,
	InputController,
	keyLabel,
	normalizeBindings,
	shortcutBlocked,
} from "../src/input.js";

const key = (code, extra = {}) => ({
	code,
	key: code.replace("Key", ""),
	...extra,
});
const pad = (extra = {}) => ({
	id: "Test standard controller",
	index: 0,
	connected: true,
	mapping: "standard",
	axes: [0, 0, 0, 0],
	buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })),
	...extra,
});
function buttons(device, ...indices) {
	device.buttons.forEach((button, index) => {
		button.pressed = indices.includes(index);
		button.value = button.pressed ? 1 : 0;
	});
}

test("keyboard aliases release independently and manual steering is distinct from firing", () => {
	const input = new InputController();
	assert.equal(input.keyDown(key("KeyW"), { flight: true }).manual, true);
	input.keyDown(key("ArrowUp"), { flight: true });
	input.keyUp(key("KeyW"));
	assert.equal(input.flight().thrust, 1);
	input.keyUp(key("ArrowUp"));
	assert.equal(input.flight().thrust, 0);
	assert.equal(input.keyDown(key("Space"), { flight: true }).manual, false);
	input.clear();
	assert.equal(input.flight().fire, false);
	assert.deepEqual(input.keyDown(key("Space"), { flight: false }), {});
});

test("browser modifiers and IME composition never trigger game commands", () => {
	const input = new InputController();
	for (const modifier of ["ctrlKey", "altKey", "metaKey", "isComposing"]) {
		assert.equal(shortcutBlocked(key("KeyR", { [modifier]: true })), true);
		assert.deepEqual(
			input.keyDown(key("KeyR", { [modifier]: true }), { flight: true }),
			{},
		);
	}
	assert.deepEqual(input.keyDown(key("KeyL", { keyCode: 229 })), {});
	assert.equal(input.keyDown(key("KeyT")).action, "target");
	assert.equal(input.keyDown(key("KeyT", { repeat: true })).action, undefined);
});

test("saved custom bindings preserve alternatives, reject collisions and retain accessible recovery keys", () => {
	const input = new InputController();
	assert.equal(input.rebind("thrust", 0, "KeyZ").ok, true);
	assert.deepEqual(input.bindings.thrust, ["KeyZ", "ArrowUp"]);
	assert.equal(input.rebind("fire", 0, "KeyZ").ok, false);
	for (const code of [
		"Escape",
		"Tab",
		"Enter",
		"ControlLeft",
		"AltRight",
		"F5",
		"",
	])
		assert.equal(input.rebind("fire", 0, code).ok, false);
	assert.equal(input.rebind("unknown", 0, "KeyZ").ok, false);
	assert.equal(input.rebind("fire", -1, "KeyZ").ok, false);
	assert.deepEqual(
		new InputController(JSON.parse(JSON.stringify(input.bindings))).bindings,
		input.bindings,
	);
	assert.equal(input.keyDown(key("KeyW"), { flight: true }).handled, undefined);
	assert.equal(
		input.keyDown(key("KeyZ", { key: "w" }), { flight: true }).handled,
		true,
	);
	input.resetBindings();
	assert.deepEqual(input.bindings, DEFAULT_BINDINGS);
	assert.deepEqual(normalizeBindings({ thrust: [] }), DEFAULT_BINDINGS);
	assert.deepEqual(normalizeBindings({ fire: ["Escape"] }), DEFAULT_BINDINGS);
	// A preference saved before "scan" existed keeps its custom keys.
	const older = { ...DEFAULT_BINDINGS, fire: ["KeyR"], thrust: ["KeyZ"] };
	delete older.scan;
	const migrated = normalizeBindings(older);
	assert.deepEqual(migrated.fire, ["KeyR"]);
	assert.deepEqual(migrated.thrust, ["KeyZ"]);
	assert.equal(migrated.scan.length, 1);
	assert.ok(!Object.values(older).flat().includes(migrated.scan[0]));
	assert.equal(keyLabel("KeyW", new Map([["KeyW", "z"]])), "Z");
});

test("pointer identity keeps a second finger held, cancellation and redraw reset every source", () => {
	const input = new InputController();
	input.pointerDown(1, "thrust");
	input.pointerDown(2, "thrust");
	input.pointerDown(3, "fire");
	input.pointerUp(1);
	assert.equal(input.flight().thrust, 1);
	assert.equal(input.flight().fire, true);
	input.pointerUp(2);
	assert.equal(input.flight().thrust, 0);
	input.clearPointers();
	assert.equal(input.flight().fire, false);
	input.pointerUp(3);
	assert.equal(input.pointers.size, 0);
});

test("only standard controllers are mapped and a held connect button cannot activate a menu", () => {
	const input = new InputController();
	assert.equal(
		input.pollGamepads([pad({ mapping: "" })], 0, "menu").unsupported,
		true,
	);
	const device = pad();
	buttons(device, 0);
	assert.deepEqual(input.pollGamepads([null, device], 0, "menu").actions, []);
	buttons(device);
	input.pollGamepads([device], 1, "menu");
	buttons(device, 0);
	assert.deepEqual(input.pollGamepads([device], 2, "menu").actions, [
		"menu:activate",
	]);
	assert.deepEqual(input.pollGamepads([device], 3, "menu").actions, []);
});

test("gamepad analog deadzones, digital movement, weapons and edge commands coexist with keyboard", () => {
	const input = new InputController();
	const device = pad();
	input.pollGamepads([device], 0);
	device.axes = [0.19, -0.18, 0, 0];
	input.pollGamepads([device], 1);
	assert.equal(input.flight().turn, 0);
	assert.equal(input.flight().thrust, 0);
	device.axes = [0.6, -1, 0, 0];
	buttons(device, 7, 5, 6, 4);
	assert.deepEqual(input.pollGamepads([device], 2).actions, ["cloak"]);
	assert.equal(input.flight().thrust, 1);
	assert.ok(Math.abs(input.flight().turn - 0.5) < 1e-9);
	assert.equal(input.flight().fire, true);
	assert.equal(input.flight().secondary, true);
	assert.equal(input.flight().boost, true);
	assert.deepEqual(input.pollGamepads([device], 3).actions, []);
	input.keyDown(key("KeyA"), { flight: true });
	assert.ok(input.flight().turn < 0);
	buttons(device, 13);
	device.axes = [0, 0, 0, 0];
	input.pollGamepads([device], 4);
	assert.equal(input.flight().brake, true);
	assert.equal(input.flight().fire, false);
});

test("controller menu repeats are timed, right stick scrolls, and flight weapons never leak into menus", () => {
	const input = new InputController();
	const device = pad();
	input.pollGamepads([device], 0, "menu");
	buttons(device, 13, 7);
	device.axes[3] = 1;
	assert.deepEqual(input.pollGamepads([device], 10, "menu").actions, [
		"menu:down",
	]);
	assert.deepEqual(input.pollGamepads([device], 300, "menu").actions, []);
	assert.deepEqual(input.pollGamepads([device], 410, "menu").actions, [
		"menu:down",
	]);
	assert.deepEqual(input.pollGamepads([device], 560, "menu").actions, [
		"menu:down",
	]);
	assert.equal(input.pollGamepads([device], 600, "menu").scroll, 1);
	assert.equal(input.flight().fire, false);
	buttons(device, 1);
	assert.deepEqual(input.pollGamepads([device], 610, "menu").actions, [
		"pause",
	]);
});

test("blur, menu changes and disconnection clear controller flight until controls are released", () => {
	const input = new InputController();
	const device = pad();
	input.pollGamepads([device], 0);
	buttons(device, 7);
	device.axes[1] = -1;
	input.pollGamepads([device], 1);
	assert.equal(input.flight().fire, true);
	input.clear();
	input.pollGamepads([device], 2, "disabled");
	assert.equal(input.flight().fire, false);
	input.pollGamepads([device], 3, "flight");
	assert.equal(input.flight().fire, false);
	buttons(device);
	device.axes[1] = 0;
	input.pollGamepads([device], 4);
	buttons(device, 7);
	input.pollGamepads([device], 5);
	assert.equal(input.flight().fire, true);
	assert.equal(input.pollGamepads([], 6).connected, false);
	assert.equal(input.flight().fire, false);
	input.pollGamepads([device], 7);
	assert.equal(input.flight().fire, false);
});
