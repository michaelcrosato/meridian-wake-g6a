/** Shared keyboard, pointer, and standard-layout gamepad input. No game-state mutations. */
export const BINDING_ACTIONS = [
	["thrust", "Thrust"],
	["left", "Turn left"],
	["right", "Turn right"],
	["brake", "Brake"],
	["fire", "Fire primary weapons"],
	["secondary", "Fire secondary weapon"],
	["boost", "Afterburner"],
	["target", "Select mission contact"],
	["cloak", "Toggle cloak"],
	["land", "Land / launch"],
	["map", "Starmap"],
	["flightActions", "Ship operations"],
	["board", "Board disabled target"],
	["scoop", "Harvest stellar fuel"],
	["scan", "Survey / scan selected ship"],
	["journal", "Mission journal"],
	["ship", "Ship loadout"],
];
export const DEFAULT_BINDINGS = Object.freeze({
	thrust: ["KeyW", "ArrowUp"],
	left: ["KeyA", "ArrowLeft"],
	right: ["KeyD", "ArrowRight"],
	brake: ["KeyS", "ArrowDown"],
	fire: ["Space"],
	secondary: ["KeyF"],
	boost: ["ShiftLeft", "ShiftRight"],
	target: ["KeyT"],
	cloak: ["KeyC"],
	land: ["KeyL"],
	map: ["KeyM"],
	flightActions: ["KeyE"],
	board: ["KeyB"],
	scoop: ["KeyG"],
	scan: ["KeyR"],
	journal: ["KeyJ"],
	ship: ["KeyI"],
});
const continuous = new Set([
	"thrust",
	"left",
	"right",
	"brake",
	"fire",
	"secondary",
	"boost",
]);
export const remappableCode = (code) =>
	/^(Key[A-Z]|Digit[0-9]|Arrow(Up|Down|Left|Right)|Shift(Left|Right)|Space|Numpad[0-9]|Numpad(Add|Subtract|Multiply|Divide|Decimal)|Backquote|Minus|Equal|BracketLeft|BracketRight|Backslash|Semicolon|Quote|Comma|Period|Slash|IntlBackslash|IntlRo|IntlYen)$/.test(
		code,
	);
export const shortcutBlocked = (event) =>
	!!(
		event.ctrlKey ||
		event.metaKey ||
		event.altKey ||
		event.isComposing ||
		event.key === "Process" ||
		event.keyCode === 229
	);
export const textEntry = (element) =>
	!!element?.closest?.(
		'input, select, textarea, [contenteditable]:not([contenteditable="false"])',
	);
export function normalizeBindings(saved) {
	const result = {};
	const seen = new Set();
	for (const [action] of BINDING_ACTIONS) {
		const values = Array.isArray(saved?.[action])
			? saved[action]
			: DEFAULT_BINDINGS[action];
		result[action] = values
			.filter((code) => remappableCode(code) && !seen.has(code))
			.slice(0, 2);
		for (const code of result[action]) seen.add(code);
	}
	// A corrupt preference must never leave an action inaccessible.
	if (Object.values(result).some((codes) => !codes.length))
		return Object.fromEntries(
			Object.entries(DEFAULT_BINDINGS).map(([action, codes]) => [
				action,
				[...codes],
			]),
		);
	return result;
}
export function keyLabel(code, layout) {
	const label = layout?.get?.(code);
	if (label && !code.startsWith("Space") && !code.startsWith("Shift"))
		return label.toLocaleUpperCase();
	return (
		{
			Space: "Space",
			ArrowUp: "↑",
			ArrowDown: "↓",
			ArrowLeft: "←",
			ArrowRight: "→",
			ShiftLeft: "Left Shift",
			ShiftRight: "Right Shift",
			Backquote: "`",
			Minus: "−",
			Equal: "=",
			BracketLeft: "[",
			BracketRight: "]",
			Backslash: "\\",
			Semicolon: ";",
			Quote: "'",
			Comma: ",",
			Period: ".",
			Slash: "/",
		}[code] || code.replace(/^Key|^Digit/, "").replace(/^Numpad/, "Num ")
	);
}
const emptyFlight = () => ({
	thrust: 0,
	turn: 0,
	brake: false,
	fire: false,
	secondary: false,
	boost: false,
});
const deadzone = (value = 0, zone = 0.2) =>
	Number.isFinite(value) && Math.abs(value) > zone
		? Math.sign(value) * Math.min(1, (Math.abs(value) - zone) / (1 - zone))
		: 0;

export class InputController {
	constructor(bindings) {
		this.bindings = normalizeBindings(bindings);
		this.keys = new Set();
		this.pointers = new Map();
		this.padButtons = new Set();
		this.padId = null;
		this.padNeedsNeutral = true;
		this.padDirection = null;
		this.padRepeatAt = 0;
		this.padFlight = emptyFlight();
	}
	clear() {
		this.keys.clear();
		this.clearPointers();
		this.padFlight = emptyFlight();
		this.padNeedsNeutral = true;
		this.padDirection = null;
	}
	clearPointers() {
		this.pointers.clear();
	}
	rebind(action, slot, code) {
		if (
			!this.bindings[action] ||
			![0, 1].includes(slot) ||
			!remappableCode(code)
		)
			return {
				ok: false,
				message:
					"Choose a letter, number, arrow, Shift, Space, or punctuation key. Escape, Enter, Tab and browser shortcuts stay reserved.",
			};
		for (const [other, codes] of Object.entries(this.bindings))
			if (
				codes.includes(code) &&
				(other !== action || codes.indexOf(code) !== slot)
			)
				return {
					ok: false,
					message: `${keyLabel(code)} is already assigned to ${BINDING_ACTIONS.find(([id]) => id === other)[1].toLowerCase()}. Choose another key first.`,
				};
		this.bindings[action][slot] = code;
		this.clear();
		return { ok: true };
	}
	resetBindings() {
		this.bindings = normalizeBindings();
		this.clear();
	}
	keyDown(event, { flight = false } = {}) {
		if (shortcutBlocked(event)) return {};
		const action = Object.keys(this.bindings).find((id) =>
			this.bindings[id].includes(event.code),
		);
		if (!action) return {};
		if (continuous.has(action)) {
			if (!flight) return {};
			this.keys.add(event.code);
			return {
				handled: true,
				manual: ["thrust", "left", "right", "brake", "boost"].includes(action),
			};
		}
		return event.repeat ? { handled: true } : { handled: true, action };
	}
	keyUp(event) {
		this.keys.delete(event.code);
	}
	pointerDown(id, action) {
		if (continuous.has(action)) this.pointers.set(id, action);
	}
	pointerUp(id) {
		this.pointers.delete(id);
	}
	held(action) {
		return (
			this.bindings[action]?.some((code) => this.keys.has(code)) ||
			[...this.pointers.values()].includes(action)
		);
	}
	flight() {
		return {
			thrust: Math.max(this.held("thrust") ? 1 : 0, this.padFlight.thrust),
			turn: Math.max(
				-1,
				Math.min(
					1,
					Number(this.held("right")) -
						Number(this.held("left")) +
						this.padFlight.turn,
				),
			),
			...Object.fromEntries(
				["brake", "fire", "secondary", "boost"].map((action) => [
					action,
					!!(this.held(action) || this.padFlight[action]),
				]),
			),
		};
	}
	pollGamepads(gamepads, now, mode = "flight") {
		const pads = Array.from(gamepads || []).filter(
			(pad) => pad?.connected && pad.mapping === "standard",
		);
		const pad =
			pads.find((item) => `${item.index}:${item.id}` === this.padId) || pads[0];
		const id = pad ? `${pad.index}:${pad.id}` : null;
		const changed = id !== this.padId;
		if (changed) {
			this.padId = id;
			this.padNeedsNeutral = true;
			this.padButtons.clear();
			this.padDirection = null;
		}
		this.padFlight = emptyFlight();
		const result = {
			actions: [],
			connected: !!pad,
			changed,
			id: pad?.id || null,
			unsupported:
				!pad && Array.from(gamepads || []).some((item) => item?.connected),
		};
		if (!pad) return result;
		const pressed = new Set(
			pad.buttons.flatMap((button, index) =>
				button?.pressed || button?.value > 0.5 ? [index] : [],
			),
		);
		const x = deadzone(pad.axes[0]),
			y = deadzone(pad.axes[1]);
		const scroll = deadzone(pad.axes[3], 0.25);
		if (mode === "disabled") this.padNeedsNeutral = true;
		if (this.padNeedsNeutral) {
			this.padButtons = pressed;
			if (!pressed.size && !x && !y && !scroll && mode !== "disabled")
				this.padNeedsNeutral = false;
			return result;
		}
		const edge = (index) => pressed.has(index) && !this.padButtons.has(index);
		if (mode === "menu") {
			const direction =
				pressed.has(12) || y < -0.45
					? "up"
					: pressed.has(13) || y > 0.45
						? "down"
						: pressed.has(14) || x < -0.45
							? "left"
							: pressed.has(15) || x > 0.45
								? "right"
								: null;
			if (
				direction &&
				(direction !== this.padDirection || now >= this.padRepeatAt)
			) {
				result.actions.push(`menu:${direction}`);
				this.padRepeatAt = now + (direction !== this.padDirection ? 400 : 150);
			}
			this.padDirection = direction;
			if (edge(0)) result.actions.push("menu:activate");
			if (edge(1) || edge(9)) result.actions.push("pause");
			result.scroll = scroll;
		} else {
			this.padDirection = null;
			this.padFlight = {
				thrust: pressed.has(12) ? 1 : Math.max(0, -y),
				turn: Math.max(
					-1,
					Math.min(1, x + Number(pressed.has(15)) - Number(pressed.has(14))),
				),
				brake: y > 0.3 || pressed.has(13),
				fire: pressed.has(7),
				secondary: pressed.has(5),
				boost: pressed.has(6),
			};
			for (const [button, action] of [
				[0, "land"],
				[1, "flightActions"],
				[2, "scan"],
				[3, "target"],
				[4, "cloak"],
				[8, "map"],
				[9, "pause"],
				[10, "board"],
				[11, "scoop"],
			])
				if (edge(button)) result.actions.push(action);
			result.manual = !!(
				this.padFlight.thrust ||
				this.padFlight.turn ||
				this.padFlight.brake ||
				this.padFlight.boost
			);
		}
		this.padButtons = pressed;
		return result;
	}
}

export function focusableElements(root) {
	return [
		...root.querySelectorAll(
			"button, a[href], input, select, textarea, summary, [tabindex]",
		),
	].filter(
		(el) =>
			!el.disabled &&
			el.tabIndex >= 0 &&
			!el.closest("[inert], [hidden]") &&
			el.getClientRects().length,
	);
}
export function focusToken(element) {
	if (!element || element === element.ownerDocument?.body) return null;
	return {
		id: element.id,
		tag: element.tagName,
		data: { ...element.dataset },
		label: element.getAttribute("aria-label"),
		text: element.textContent.trim(),
		inModal: !!element.closest(".modal"),
	};
}
export function findFocus(token, root) {
	if (!token) return null;
	return focusableElements(root).find((el) =>
		token.id
			? el.id === token.id
			: el.tagName === token.tag &&
				(Object.keys(token.data).length
					? Object.entries(token.data).every(
							([key, value]) => el.dataset[key] === value,
						)
					: token.label
						? el.getAttribute("aria-label") === token.label
						: el.textContent.trim() === token.text),
	);
}
