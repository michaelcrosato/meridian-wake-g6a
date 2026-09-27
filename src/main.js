import "./style.css";
import { AudioManager } from "./audio.js";
import {
	CAMPAIGN,
	COMMODITIES,
	Game,
	OUTFITS,
	SHIPS,
	SYSTEMS,
} from "./game.js";
import { brandMark, icon, shipDrawing } from "./icons.js";
import { createScene } from "./scene.js";
import {
	BINDING_ACTIONS,
	InputController,
	keyLabel,
	remappableCode,
	shortcutBlocked,
	textEntry,
	focusableElements,
	focusToken,
	findFocus,
} from "./input.js";

const app = document.querySelector("#app");
const SAVE_KEY = "meridian-wake-save-v1";
const SETTINGS_KEY = "meridian-wake-settings-v1";
const defaults = {
	quality: "Auto",
	volume: 0.5,
	muted: false,
	diagnostics: true,
	assist: true,
	touchControls: "auto",
};
let settings = { ...defaults };
try {
	settings = {
		...defaults,
		...JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}"),
	};
} catch {
	/* defaults remain usable */
}
settings.touchControls = ["auto", "on", "off"].includes(settings.touchControls)
	? settings.touchControls
	: "auto";
document.documentElement.dataset.touchControls = settings.touchControls;
let game = new Game();
let title = true;
let panel = null;
let portTab = "missions";
let selectedSystem = null;
let selectedStarter = "sparrow";
let scene;
let audio;
let ready = false;
let autopilot = false;
let selectedActorId = null;
let approachActorId = null;
let selectedWreckId = null;
let approachWreckId = null;
let encounterKey = "";
let lastSave = 0;
let lastHud = 0;
let modelTimeAccumulator = 0;
const resumePanel = null;
let lastFocus = null;
const panelHistory = [];
let bindingCapture = null;
let keyboardLayout = null;
let gamepadName = null;
let dialogueDeferred = false;
let focusedWindow = true;
let catalog;
let catalogQuery = "";
let shopQuery = "";
let shopPage = 0;
let sourceLoading = false;
let sourceError = "";
let landingReady = true;
const controls = new InputController(settings.bindings);
settings.bindings = controls.bindings;
const toasts = [];
const $ = (selector) => document.querySelector(selector);
const esc = (value) =>
	String(value ?? "").replace(
		/[&<>"']/g,
		(ch) =>
			({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
				ch
			],
	);
const money = (value) => Math.round(Number(value) || 0).toLocaleString("en-US");
const arr = (value) =>
	Array.isArray(value) ? value : Object.values(value || {});
const systems = arr(SYSTEMS);
const ships = arr(SHIPS);
const outfits = arr(OUTFITS);
const commodities = arr(COMMODITIES);
const systemById = (id) =>
	game.systemById?.(id) || systems.find((s) => s.id === id);
const state = () => game.state;
const current = () => game.currentSystem();
const stats = () => game.stats();
const commodityName = (id) => commodities.find((c) => c.id === id)?.name || id;
const links = (sys) => (sys ? game.neighbors?.(sys.id) || sys.links || [] : []);
const getStory = () => game.availableStory?.();
const getArcs = () => game.availableArcs?.() || [];
const starmapPosition = (s) => {
	const resolved = game.systemById?.(s.id) || s;
	return { x: Number(resolved.x ?? 0), y: Number(resolved.y ?? 0) };
};
function persistSettings() {
	try {
		localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
	} catch {}
}
function save() {
	if (title) return;
	try {
		localStorage.setItem(SAVE_KEY, game.save());
		lastSave = performance.now();
	} catch {
		toast(
			"Local storage is unavailable. Export your save from Options.",
			"error",
		);
	}
}
function hasSave() {
	try {
		return !!localStorage.getItem(SAVE_KEY);
	} catch {
		return false;
	}
}
function toast(message, type = "") {
	if (!message) return;
	toasts.push({ message, type, until: performance.now() + 4700 });
	if (toasts.length > 4) toasts.shift();
	renderToasts();
}
function renderToasts() {
	const el = $("#toasts");
	if (el)
		el.innerHTML = toasts
			.map(
				(t) =>
					`<div class="toast ${t.type}" role="status">${esc(t.message)}</div>`,
			)
			.join("");
}
function clearControls() {
	controls.clear();
	for (const button of document.querySelectorAll("[data-hold].active"))
		button.classList.remove("active");
}
function setPanel(next) {
	if (!panel) lastFocus = focusToken(document.activeElement);
	else if (panel !== next) panelHistory.push(panel);
	panel = next;
	clearControls();
	autopilot = false;
	render({ focusFirst: true });
}
function closePanel() {
	if (bindingCapture) {
		bindingCapture = null;
		render();
		return;
	}
	if (panel === "sourceDialogue")
		dialogueDeferred = JSON.stringify(game.sourceDialogue?.());
	panel =
		panelHistory.pop() ||
		(!title && state().mode === "port" && panel !== "port" ? "port" : null);
	clearControls();
	render({ returnFocus: !panel, focusFirst: !!panel });
}
function act(action, payload = {}) {
	const ownedBefore = new Set((state().fleet || []).map((ship) => ship.id));
	const result = game.act(action, payload);
	if (action === "land" && !result.ok) autopilot = false;
	if (result.message) toast(result.message, result.ok ? "" : "error");
	if (!result.ok) {
		audio?.play("error");
		return result;
	}
	if (
		[
			"story",
			"acceptArc",
			"completeArc",
			"sourceChoose",
			"sourceOffer",
			"sourceComplete",
			"sourceAccept",
		].includes(action)
	) {
		for (const ship of state().fleet || [])
			if (!ownedBefore.has(ship.id)) {
				toast(
					`${ship.name || ships.find((s) => s.id === ship.shipId)?.name || "A new ship"} is now in your hangar. Visit Fleet & bank to take command.`,
					"reward",
				);
			}
	}
	audio?.play(
		[
			"buy",
			"sell",
			"buyShip",
			"buyOutfit",
			"acceptJob",
			"story",
			"completeArc",
		].includes(action)
			? "reward"
			: "click",
	);
	if (action === "launch") {
		panelHistory.length = 0;
		clearControls();
		approachActorId = null;
		approachWreckId = null;
		panel = null;
		autopilot = false;
		audio?.play("launch");
		audio?.startMusic("music");
	}
	if (action === "land") {
		approachActorId = null;
		approachWreckId = null;
		if (state().mode !== "port" && !game.currentPlanet()) {
			toast(
				"No charted landing destination here. Survey this system or plot your next jump.",
				"error",
			);
			return;
		}
		panel = "port";
		portTab = "missions";
		autopilot = false;
		audio?.play("land");
		audio?.startMusic("port");
	}
	if (action === "jump") {
		panelHistory.length = 0;
		clearControls();
		approachActorId = null;
		approachWreckId = null;
		panel = null;
		autopilot = false;
		encounterKey = "";
		audio?.play("jump");
	}
	if (action === "rescue") {
		panelHistory.length = 0;
		panel = "port";
		encounterKey = "";
	}
	if (state().mode === "ending") panel = "ending";
	if (
		["sourceOffer", "sourceChoose", "sourceAccept", "sourceComplete"].includes(
			action,
		)
	)
		dialogueDeferred = false;
	if (
		game.sourceDialogue?.() &&
		JSON.stringify(game.sourceDialogue()) !== dialogueDeferred
	)
		panel = "sourceDialogue";
	else if (panel === "sourceDialogue")
		panel = state().mode === "port" ? "port" : "journal";
	if (state().mode === "destroyed") panel = "destroyed";
	syncScene();
	save();
	render();
	return result;
}
function syncScene() {
	if (!scene) return;
	scene.setShip(game.currentShip());
	const sys = current();
	const key = `${state().systemId}:${state().combatSerial}`;
	if (scene.systemId !== `${state().systemId}:${state().planetName}`) {
		scene.setSystem(sys);
		selectedActorId = null;
		approachActorId = null;
		selectedWreckId = null;
		approachWreckId = null;
		scene.systemId = `${state().systemId}:${state().planetName}`;
		encounterKey = "";
	}
	scene.setView(title ? "title" : state().mode === "port" ? "port" : "flight");
	if (!title && state().mode === "flight" && encounterKey !== key) {
		const e = state().encounter;
		const amount = state().enemies || 0;
		scene.setCombat(Math.max(0, amount), !!e?.boss);
		encounterKey = key;
	}
}
async function startGame(continuing = false) {
	panelHistory.length = 0;
	dialogueDeferred = false;
	bindingCapture = null;
	clearControls();
	if (!ready) return;
	if (continuing) {
		try {
			game = Game.load(localStorage.getItem(SAVE_KEY));
		} catch {
			toast(
				"That save could not be read. Start a new voyage or import a backup.",
				"error",
			);
			return;
		}
	} else {
		game = new Game();
		game.newGame(selectedStarter);
	}
	title = false;
	panel =
		state().mode === "ending"
			? "ending"
			: state().mode === "port"
				? "port"
				: state().mode === "destroyed"
					? "destroyed"
					: null;
	portTab = "missions";
	selectedSystem = state().systemId;
	encounterKey = "";
	audio
		?.init()
		.then(() =>
			audio.startMusic(!title && state().mode === "port" ? "port" : "music"),
		);
	if (state().sourceQuests) await game.enableSourceMissions();
	if (scene) scene.systemId = null;
	syncScene();
	render();
	save();
	if (!continuing)
		toast(
			"Your first ship. A galaxy of possibilities. Welcome aboard, Captain.",
		);
}
function titleScreen() {
	return `<div class="veil"></div><header class="title-top"><div class="brand">${brandMark}<span>Independent spacers’ guild</span></div><div class="title-meta"><i class="live-dot"></i> A SPACEFARING ADVENTURE <span class="muted">/</span> 01.00</div></header><section class="title-body"><div class="edition eyebrow">Beyond the familiar stars</div><h1>MERIDIAN<span>WAKE</span></h1><p class="title-copy">A small ship. An open sky.<br>Make a living. Make a difference.<br>Find your own way home.</p><button class="primary start-button" data-action="${hasSave() ? "continue" : "new"}">${hasSave() ? "Continue your voyage" : "Begin your voyage"} ${icon("arrow")}</button><div class="title-buttons">${hasSave() ? '<button class="text-button" data-action="new">New captain</button>' : ""}<button class="text-button" data-action="controls">Flight handbook</button><button class="text-button" data-action="options">Options</button></div><div class="title-note mono">TRADE · EXPLORE · TAKE A SIDE</div></section><aside class="title-caption"><div class="eyebrow">Your next chapter</div><strong>THE SOUTHERN FRONTIER</strong><br><span class="muted">Unhurried journeys. Unwritten stories.</span></aside><footer class="title-bottom"><div>A reimagining of Endless Sky<br><span class="muted">GENERATED 26 SEP 2026 · GPT-6 ASTRA</span></div><div class="coordinates mono">FLIGHT SYSTEMS ONLINE<br><span id="title-backend">INITIALIZING</span></div><button class="text-button" data-action="about" style="margin:0">About this voyage ↗</button></footer>`;
}
function hud() {
	const s = state(),
		sy = current(),
		st = stats(),
		story = getStory();
	return `<header class="hud-top"><div class="hud-logo">${brandMark}<div><strong>MERIDIAN WAKE</strong><div class="eyebrow">Independent captain · Day ${s.day}</div></div></div><nav class="hud-nav" aria-label="Ship navigation">${[
		["map", "map", "Starmap"],
		["port", "land", "Spaceport"],
		["ship", "ship", "My ship"],
		["journal", "book", "Journal"],
		["options", "settings", "Options"],
	]
		.map(
			([id, i, label]) =>
				`<button data-action="${id}" title="${label}" aria-label="${label}" class="${panel === id ? "active" : ""}">${icon(i)}<span>${label}</span></button>`,
		)
		.join(
			"",
		)}<button data-action="cloak" aria-label="Toggle cloak" title="Cloak (${esc(bindingLabel("cloak"))})" class="${s.cloaked ? "active" : ""}" ${!st.cloakAvailable || s.mode !== "flight" ? "disabled" : ""}>${icon("shield")}<span>${s.cloaked ? "Cloaked" : "Cloak"}</span></button></nav><div class="hud-wallet"><span id="credits-value">${money(s.credits)}</span> <span class="small">cr</span><small>${s.debt > 0 ? `${money(s.debt)} cr loan` : "DEBT FREE"}</small></div></header><section class="location"><div class="eyebrow">${esc(sy.faction || "The frontier")} / ${s.mode === "port" ? "Docked" : "In flight"}</div><h2>${esc(sy.name)}</h2><p>${esc(typeof sy.planet === "string" ? sy.planet : sy.planet?.name || "Deep space")} <span class="muted">·</span> ${Number(sy.danger) > 1 ? "Contested space" : "Local traffic"}</p></section><aside class="mission-tracker"><div class="eyebrow">${story?.accepted ? "Active transmission" : "Captain’s heading"}</div><h3>${esc(story?.name || story?.title || "An open sky")}</h3><p id="mission-objective">${esc(story?.accepted ? story.objective : story ? "Visit the spaceport to hear the next transmission." : "Trade, explore, and discover the stories between the stars.")}</p><button data-action="journal">Open mission journal ↗</button></aside><div id="actor-markers"></div><div class="flight-crosshair"></div><div class="flight-hint" id="flight-hint">${s.mode === "flight" ? `Hold ${esc(bindingLabel("thrust"))} to thrust · ${esc(bindingLabel("left"))} / ${esc(bindingLabel("right"))} to turn` : ""}</div><section class="status-panel"><div class="ship-status-name">${esc(st.name || "Sparrow")} <span>${s.mode === "flight" ? "FREE FLIGHT" : "BERTH SECURED"}</span></div>${meter("SHIELD", "shield", s.shield, st.maxShield)}${meter("HULL", "hull", s.hull, st.maxHull)}${meter("FUEL", "fuel", s.fuel, st.maxFuel)}${meter("POWER", "power", s.energy ?? 100, st.maxEnergy ?? 100)}${meter("HEAT", "heat", s.heat ?? 0, st.maxHeat ?? 100)}<div class="weapon-readout" id="secondary-readout"></div></section><div class="bottom-actions">${s.mode === "port" ? `<button class="action-button primary" data-action="launch">${icon("launch")} Depart spaceport <kbd>${esc(bindingLabel("land"))}</kbd></button>` : `<button class="action-button primary" data-action="land">${icon("land")} Land <kbd>${esc(bindingLabel("land"))}</kbd></button><button class="action-button" data-action="map">${icon("route")} Plot a course <kbd>${esc(bindingLabel("map"))}</kbd></button><button class="action-button" data-action="flightActions" aria-label="Ship actions">${icon("scan")} Actions <kbd>${esc(bindingLabel("flightActions"))}</kbd></button>`}</div><div class="radar" aria-hidden="true"><div class="radar-ship">▲</div><div id="radar-contacts"></div><div class="radar-label" id="radar-label">LOCAL SCANNER</div></div><div class="touch-controls" aria-label="Touch flight controls"><div class="touch-cluster"><button data-hold="left" aria-label="Turn left">↶</button><button data-hold="thrust" aria-label="Thrust">↑</button><button data-hold="right" aria-label="Turn right">↷</button><button data-hold="brake" aria-label="Brake">↓</button><button data-hold="boost" aria-label="Boost" title="Hold to boost">⇧</button></div><div class="touch-cluster"><button data-hold="secondary" aria-label="Fire secondary weapon" title="Secondary weapon (${esc(bindingLabel("secondary"))})">${icon("missile")}</button><button class="fire-touch" data-hold="fire" aria-label="Fire weapons">${icon("bolt")}</button></div></div><footer class="footer-strip"><span id="diagnostics">${settings.diagnostics ? "RENDERER ONLINE" : ""}</span><span class="footer-help">${esc(bindingLabel("thrust"))} Thrust <i>·</i> ${esc(bindingLabel("fire"))} Fire <i>·</i> ${esc(bindingLabel("map"))} Map <i>·</i> ESC Pause</span><span><button data-action="toggleMute" title="Toggle sound" aria-label="Toggle sound">${icon(settings.muted ? "muted" : "sound")}</button><button data-action="controls" title="Flight handbook" aria-label="Flight handbook">${icon("help")}</button><span id="save-status">AUTOSAVE ON</span></span></footer>${panel ? '<div class="pause-marker">FLIGHT PAUSED</div>' : ""}`;
}
function meter(label, id, value, max) {
	return `<div class="bar-row ${id}"><span>${label}</span><div class="meter"><i id="${id}-bar" style="width:${Math.min(100, Math.max(0, (100 * value) / (max || 1)))}%"></i></div><span id="${id}-value">${id === "fuel" ? Math.floor(value) : Math.ceil(value)}</span></div>`;
}
function modal(titleText, subtitle, body, footer = "", small = false) {
	return `<div class="modal-backdrop"><section class="modal ${small ? "small-modal" : ""}" role="dialog" aria-modal="true" aria-labelledby="modal-title"><header class="modal-head"><div><div class="eyebrow">${subtitle}</div><h2 id="modal-title">${titleText}</h2></div><button class="close-button" data-action="close" aria-label="Close panel">${icon("close")}</button></header><div class="modal-body">${body}</div>${footer ? `<footer class="modal-footer">${footer}</footer>` : ""}</section></div>`;
}
function render({ focusFirst = false, returnFocus = false } = {}) {
	const previousFocus = focusToken(document.activeElement);
	const scrollTop = $(".modal-body")?.scrollTop || 0;
	// Captured pointers belong to the old nodes. Never retain a hold after a redraw.
	controls.clearPointers();
	app.innerHTML = `${title ? titleScreen() : hud()}${panel ? renderPanel() : ""}<div class="toast-stack" id="toasts" aria-live="polite"></div>${!ready ? '<div class="loading"><div><div class="eyebrow">Meridian Wake</div><div class="loading-orbit"></div><p id="load-message">Preparing your corner of the galaxy…</p></div></div>' : ""}`;
	for (const element of app.children) {
		if (
			element.classList.contains("modal-backdrop") ||
			element.id === "toasts" ||
			element.classList.contains("loading")
		)
			continue;
		element.inert = !!panel;
	}
	const scope = $(".modal") || app;
	const target = returnFocus
		? findFocus(lastFocus, scope)
		: !focusFirst && (!panel || previousFocus?.inModal)
			? findFocus(previousFocus, scope)
			: null;
	if (target) target.focus({ preventScroll: true });
	else if (panel) focusableElements(scope)[0]?.focus({ preventScroll: true });
	if (panel && !focusFirst && $(".modal-body"))
		$(".modal-body").scrollTop = scrollTop;
	renderToasts();
	syncScene();
}
function renderPanel() {
	switch (panel) {
		case "new":
			return renderNew();
		case "port":
			return renderPort();
		case "map":
			return renderMap();
		case "options":
			return renderOptions();
		case "controls":
			return renderControls();
		case "bindings":
			return renderBindings();
		case "journal":
			return renderJournal();
		case "ship":
			return renderShip();
		case "flightActions":
			return renderActions();
		case "ending":
			return renderEnding();
		case "destroyed":
			return renderDestroyed();
		case "about":
			return renderAbout();
		case "catalog":
			return renderCatalog();
		case "sourceDialogue":
			return renderSourceDialogue();
		case "confirmNew":
			return modal(
				"Start another voyage?",
				"Your captain’s record",
				'<p class="muted small">Starting a new captain replaces the local autosave. You can export your current voyage in Options before starting over.</p><div class="button-row"><button class="primary" data-action="confirmNew">Choose a new ship</button><button data-action="options">Export current save</button></div>',
				"",
				true,
			);
		default:
			return "";
	}
}
function renderNew() {
	const starters = ships.filter(
		(s) =>
			["sparrow", "shuttle", "star-barge", "starbarge"].includes(s.id) ||
			s.starter,
	);
	return modal(
		"Every captain starts somewhere.",
		"A new voyage",
		`<div class="ship-selection"><p>Your first ship shapes your first opportunities.<br>Trade, carry passengers, or earn your wings in combat. You can change ships later.</p></div><div class="item-grid">${starters.map((s, i) => `<article class="item-card ${s.id === selectedStarter ? "current" : ""}"><div class="eyebrow">${s.id === "sparrow" ? "The pathfinder" : s.id === "shuttle" ? "The courier" : "The merchant"}</div><div class="item-illustration">${shipDrawing(i)}</div><h3>${esc(s.name)}</h3><p>${esc(s.description || "A small ship with room for a bigger life.")}</p><div class="item-stats"><span>CARGO <b>${s.cargoCapacity ?? s.cargo ?? 0}t</b></span><span>BUNKS <b>${s.passengerCapacity ?? s.bunks ?? 0}</b></span></div><button data-action="selectStarter" data-id="${s.id}" class="${s.id === selectedStarter ? "primary" : ""}">${s.id === selectedStarter ? "Selected ✓" : "Choose " + esc(s.name)}</button></article>`).join("")}</div>`,
		`<span>Starting funds and a modest ship loan. Your adventure saves locally.</span><button class="primary" data-action="begin">Begin voyage ${icon("arrow")}</button>`,
	);
}
function renderPort() {
	if (state().mode !== "port")
		return modal(
			"Spaceport out of range",
			"Landing required",
			`<p class="muted small">Land on the local planet to trade, pick up work, refuel, and hear the latest transmissions. Press ${esc(bindingLabel("land"))} in flight for landing assistance.</p><div class="button-row"><button class="primary" data-action="land">Begin landing approach</button></div>`,
			"",
			true,
		);
	const sy = current(),
		s = state();
	if (!sy.inhabited && !["missions", "contacts"].includes(portTab))
		portTab = "missions";
	const content = {
		missions: renderMissions,
		contacts: renderContacts,
		market: renderMarket,
		shipyard: renderShipyard,
		outfitter: renderOutfitter,
		fleet: renderFleet,
	};
	const tabs = `<nav class="port-tabs" aria-label="Spaceport facilities">${[
		["missions", sy.inhabited ? "Spaceport" : "Surface survey"],
		["contacts", "Local contacts"],
		["market", "Trading post"],
		["outfitter", "Outfitter"],
		["shipyard", "Shipyard"],
		["fleet", "Fleet & bank"],
	]
		.filter(([id]) => sy.inhabited || ["missions", "contacts"].includes(id))
		.map(
			([id, label]) =>
				`<button class="${portTab === id ? "active" : ""}" data-action="portTab" data-id="${id}">${label}</button>`,
		)
		.join("")}</nav>`;
	return `<div class="modal-backdrop"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><header class="modal-head"><div><div class="eyebrow">${esc(sy.name)} / ${esc(sy.faction || "Independent")}</div><h2 id="modal-title">${esc(typeof sy.planet === "string" ? sy.planet : sy.planet?.name || sy.name)}${sy.inhabited ? " Spaceport" : ""}</h2></div><button class="close-button" data-action="viewPort" aria-label="View docked ship">${icon("close")}</button></header>${tabs}<div class="modal-body">${(content[portTab] || renderMissions)()}</div><footer class="modal-footer"><span>${icon("shield")} Docked safely · ${money(s.credits)} cr available</span><button class="primary" data-action="launch">Depart ${icon("launch")}</button></footer></section></div>`;
}
function renderMissions() {
	const sy = current(),
		s = state(),
		story = getStory();
	return `<div class="port-summary"><div><div class="eyebrow">Welcome ashore, Captain</div><p>${esc(sy.description || "Beyond the airlock, a thousand journeys cross paths. Find a cargo, a cause, or a new corner of the sky.")}</p></div><div class="port-data"><div>Local authority <strong>${esc(sy.faction || "Independent")}</strong></div><div>Flight services <strong>${sy.inhabited ? "Fuel & repairs" : "None · remote landing"}</strong></div><div>Open contracts <strong>${game.availableJobs().length} available</strong></div></div></div>${story ? storyCard(story) : '<div class="story-card"><div class="eyebrow">The story continues</div><h3>A sky of your own.</h3><p>Your main voyage is complete. There are still contracts, distant worlds, and other lives to discover.</p></div>'}<h3 class="section-label">Jobs board / ${game.availableJobs().length} available</h3><div class="job-list">${
		game
			.availableJobs()
			.map((j) => jobCard(j))
			.join("") ||
		'<div class="empty-state">No new contracts today. Visit another port for fresh work.</div>'
	}</div><h3 class="section-label">Other voices in the sky</h3><div class="job-list">${
		getArcs()
			.map((a) => arcCard(a))
			.join("") ||
		'<p class="muted small">New opportunities will appear as your reputation and reach grow.</p>'
	}</div>`;
}
function missionRoutes(m) {
	const active = m.arcId
		? state().activeArcs.find((a) => a.arcId === m.arcId)
		: state().activeStory;
	const scans = (m.scanSystems || []).filter(
		(id) => !(active?.scannedSystems || []).includes(id),
	);
	const targets = [...new Set([...scans, ...(m.visitSystems || [])])];
	if (!targets.length) return "";
	return `<div class="button-row">${targets.map((id) => `<button data-action="map" data-id="${esc(id)}">${scans.includes(id) ? "Survey" : "Visit"} ${esc(systemById(id)?.name || id)} ↗</button>`).join("")}</div>`;
}
function convoyStatus(m) {
	const active = m.arcId
		? state().activeArcs.find((a) => a.arcId === m.arcId)
		: state().activeStory;
	return active?.id === m.id ? game.escortStatus?.(active) : null;
}
function retryConvoyButton(m, status) {
	return `<button class="primary" data-action="retryEscort" data-id="${esc(m.id)}" data-arc="${esc(m.arcId || "")}" ${state().mode !== "port" ? "disabled" : ""}>${state().mode === "port" ? `Replace convoy · ${money(Math.min(25000, Math.max(1000, status.total * 750)))} cr` : "Land to replace the convoy"}</button>`;
}
function storyCard(story) {
	const dest = systemById(story.targetId || story.destinationId),
		convoy = convoyStatus(story);
	const choices = story.choices?.length
		? story.choices
		: [{ id: "complete", label: "Complete mission" }];
	const actions = convoy?.failed
		? retryConvoyButton(story, convoy)
		: !story.accepted
			? `<button class="primary" data-action="story" data-choice="accept">Accept transmission ${icon("arrow")}</button>`
			: story.ready
				? choices
						.map(
							(c) =>
								`<button class="primary" data-action="story" data-choice="${esc(c.id)}" title="${esc(c.description || "")}">${esc(c.label)}</button>`,
						)
						.join("")
				: `<button data-action="map" data-id="${esc(story.targetId || story.destinationId || state().systemId)}">Show destination ${icon("map")}</button>`;
	return `<article class="story-card"><div class="eyebrow">${esc(story.chapter || "Main transmission")} <span class="muted">/</span> ${story.accepted ? "In progress" : "A story worth following"}</div><h3>${esc(story.name || story.title)}</h3><p>${esc(story.description)}</p><div class="requirements">${esc(story.objective || story.kind || "Mission")}${dest ? ` <span class="muted">/ Destination: ${esc(dest.name)}</span>` : ""}</div><div class="button-row">${actions}${story.reward ? `<span class="small accent" style="align-self:center">${money(story.reward)} cr on completion</span>` : ""}</div>${missionRoutes(story)}</article>`;
}

function jobCard(job) {
	const dest = systemById(job.destinationId || job.destination),
		accepted = state().jobs?.some(
			(j) => (typeof j === "string" ? j : j.id) === job.id,
		);
	return `<article class="job-card"><div class="job-icon">${icon(job.passengers ? "people" : job.kind === "bounty" ? "shield" : "cargo")}</div><div><h4>${esc(job.name || job.title)}</h4><p>${esc(job.description || `${dest?.name || job.destinationId || ""} · ${job.cargo || 0}t cargo · ${job.passengers || 0} passengers`)}</p><p class="muted small">${job.cargo || 0}t cargo · ${job.passengers || 0} berths · Due day ${job.deadline}</p></div><div><div class="reward">${money(job.reward)} cr</div><button data-action="acceptJob" data-id="${esc(job.id)}" ${accepted ? "disabled" : ""}>${accepted ? "Accepted" : "Accept job"}</button></div></article>`;
}
function arcCard(a) {
	const destination = systemById(a.targetId || a.destinationId);
	const choices = a.choices?.length
		? a.choices
		: [{ id: "complete", label: "Complete" }];
	const convoy = convoyStatus(a);
	const buttons = convoy?.failed
		? retryConvoyButton(a, convoy)
		: a.locked
			? "<button disabled>Locked</button>"
			: a.accepted && a.ready
				? choices
						.map(
							(c) =>
								`<button data-action="completeArc" data-id="${esc(a.arcId || a.id)}" data-choice="${esc(c.id)}" title="${esc(c.description || "")}">${esc(c.label)}</button>`,
						)
						.join("")
				: `<button data-action="${a.accepted ? "completeArc" : "acceptArc"}" data-id="${esc(a.arcId || a.id)}" ${a.accepted ? "disabled" : ""}>${a.accepted ? "In progress" : "Accept"}</button>`;
	return `<article class="job-card"><div class="job-icon">${icon("star")}</div><div><div class="eyebrow">${esc(a.arcName || a.chapter || "Side story")} · ${(a.index || 0) + 1} / ${a.total || "—"}</div><h4>${esc(a.name || a.title)}</h4><p>${esc(a.locked ? a.lockedReason : a.accepted ? a.objective : a.description)}</p>${missionRoutes(a)}${a.accepted && !a.ready ? `<button class="text-button" data-action="map" data-id="${esc(a.targetId || a.destinationId)}">Destination: ${esc(destination?.name || "Explore")}</button>` : ""}</div><div class="arc-options"><div class="reward">${money(a.reward)} cr</div>${buttons}</div></article>`;
}

async function enableSourceContent() {
	if (sourceLoading) return;
	sourceLoading = true;
	sourceError = "";
	panel = "port";
	portTab = "contacts";
	render();
	try {
		await game.enableSourceMissions();
		save();
	} catch (error) {
		sourceError = error.message;
		toast(
			"The local contacts could not be loaded. Try again when the connection is restored.",
			"error",
		);
	}
	sourceLoading = false;
	render();
}
function renderContacts() {
	if (sourceLoading)
		return '<div class="empty-state">Listening to the spaceport channels…</div>';
	if (sourceError)
		return `<div class="empty-state">${esc(sourceError)}<div class="button-row"><button data-action="portTab" data-id="contacts">Try again</button></div></div>`;
	const available = [...(game.availableSourceMissions?.() || [])];
	const unique = [...new Map(available.map((m) => [m.id, m])).values()];
	const active = game.activeSourceMissions?.() || [];
	return `<p class="small muted">Meet the people whose lives cross yours. Conversations and opportunities depend on where you are, what you have done, and who trusts you. Read the terms before making a promise.</p>${game.sourceDialogue?.() ? '<div class="button-row"><button class="primary" data-action="resumeConversation">Continue conversation</button></div>' : ""}<h3 class="section-label">Your commitments / ${active.length}</h3><div class="job-list">${active.map(nativeMissionCard).join("") || '<p class="small muted">No local commitments yet.</p>'}</div><h3 class="section-label">At this spaceport / ${unique.length}</h3><div class="job-list">${unique.map(nativeMissionCard).join("") || '<div class="empty-state">No new contacts are waiting here. Try another port as your voyage unfolds.</div>'}</div>`;
}
function nativeMissionCard(m) {
	const destination = systems.find((s) => s.name === m.destinationSystem);
	return `<article class="job-card"><div class="job-icon">${icon(m.accepted ? "flag" : "people")}</div><div><h4>${esc(m.name || m.id)}</h4><p>${esc(m.accepted ? m.objective : m.description || "A conversation is waiting. Speak to learn more.")}</p><p class="small muted">${m.cargo ? `${m.cargo}t cargo · ` : ""}${m.passengers ? `${m.passengers} passengers · ` : ""}${m.destination ? esc(m.destination) : ""}${m.deadline ? ` · Due day ${m.deadline}` : ""}</p>${m.accepted && destination ? `<button class="text-button" data-action="map" data-id="${destination.id}">Plot destination ↗</button>` : ""}</div><div>${m.accepted ? `<button data-action="sourceComplete" data-id="${esc(m.id)}" ${!m.ready ? "disabled" : ""}>Complete</button><button class="text-button" data-action="sourceAbort" data-id="${esc(m.id)}">Abandon</button>` : `<button data-action="sourceOffer" data-id="${esc(m.id)}">Speak</button>`}</div></article>`;
}
function renderSourceDialogue() {
	const d = game.sourceDialogue?.();
	if (!d)
		return modal(
			"The conversation has ended.",
			"Spaceport transmission",
			'<p class="small muted">Your decisions have been recorded in the captain’s journal.</p>',
			"",
			true,
		);
	return modal(
		"A voice in the crowd.",
		"Incoming transmission",
		`<div class="dialogue-prose">${esc(d.text)
			.split("\n\n")
			.map((p) => `<p>${p.replaceAll("\n", "<br>")}</p>`)
			.join(
				"",
			)}</div><div class="dialogue-choices">${d.options.map((o) => `<button data-action="sourceChoose" data-id="${o.index}">${esc(o.text)} ${icon("arrow")}</button>`).join("")}</div>`,
		`<span>Your answer becomes part of your voyage.</span>`,
		true,
	);
}
function renderMarket() {
	const s = state(),
		st = stats(),
		used = st.cargoUsed;
	return `<div class="market-info"><span>Trade cargo <strong class="cyan">${used} / ${st.cargoCapacity} tonnes</strong></span><span class="accent">${money(s.credits)} cr available</span></div><p class="small muted">Prices vary between systems. Buy below the galactic average, then find a port where your cargo is worth more. Contract cargo also occupies your hold.</p><div class="trade-header"><span>Commodity</span><span>Local price</span><span class="trade-avg">Galactic avg.</span><span>Hold</span><span style="text-align:right">Quantity / trade</span></div>${commodities
		.map((c) => {
			const price = game.price?.(c.id) ?? c.basePrice ?? c.price;
			return `<div class="trade-row"><span class="trade-name">${icon("cargo")}${esc(c.name)}</span><span class="${price < (c.basePrice ?? c.price) ? "cyan" : "accent"}">${money(price)}</span><span class="trade-avg muted">${money(c.basePrice ?? c.price)}</span><span>${s.cargo?.[c.id] || 0}t</span><div class="trade-controls"><input type="number" min="1" max="999" value="1" id="qty-${c.id}" aria-label="${esc(c.name)} quantity"><button data-action="buy" data-id="${c.id}">Buy</button><button data-action="sell" data-id="${c.id}" ${!s.cargo?.[c.id] ? "disabled" : ""}>Sell</button></div></div>`;
		})
		.join(
			"",
		)}<p class="small muted">Sale price is 94% of the listed local buy price. Trading uses local supply and demand; check your journal for completed cargo runs.</p>${renderMineralHold()}`;
}
function renderShipyard() {
	const available = game.availableShips?.() || ships;
	const filtered = available.filter((s) =>
		`${s.name} ${s.category}`.toLowerCase().includes(shopQuery.toLowerCase()),
	);
	return `<p class="small muted" style="margin-top:0;margin-bottom:22px">A bigger horizon starts with the right ship. Your current ship’s trade-in value is applied when purchasing. Trade your current hull and upgrades toward the purchase, or buy outright and keep your current ship in the hangar. Navigation equipment needed for your voyage is retained when trading.</p>${shopSearch(filtered.length)}<div class="item-grid">${filtered
		.slice(shopPage * 24, (shopPage + 1) * 24)
		.map(
			(s, i) =>
				`<article class="item-card ${s.id === state().shipId ? "current" : ""}"><div class="eyebrow">${esc(s.role || s.faction || "Independent shipworks")}</div><div class="item-illustration">${shipDrawing(i)}</div><h3>${esc(s.name)}</h3><p>${esc(s.description || "A dependable hull for your next chapter.")}</p><div class="item-stats"><span>HULL <b>${s.maxHull ?? s.hull}</b></span><span>SHIELDS <b>${s.maxShield ?? s.shield}</b></span><span>CARGO <b>${s.cargoCapacity ?? s.cargo}t</b></span><span>BUNKS <b>${s.passengerCapacity ?? s.bunks ?? 0}</b></span></div><button data-action="buyShip" data-id="${s.id}" ${s.id === state().shipId ? "disabled" : ""}>${s.id === state().shipId ? "Your flagship" : `Trade in · ${money(s.price)} cr hull`}</button>${s.id !== state().shipId ? `<button data-action="buyShip" data-id="${s.id}" data-keep="true">Keep both · ${money(s.price)} cr</button>` : ""}</article>`,
		)
		.join("")}</div>`;
}
function renderOutfitter() {
	const available = game.availableOutfits?.() || outfits;
	const filtered = available.filter((o) =>
		`${o.name} ${o.category} ${o.description}`
			.toLowerCase()
			.includes(shopQuery.toLowerCase()),
	);
	return `<p class="small muted" style="margin-top:0;margin-bottom:22px">Make this hull your own. Balance weapons, engines, energy, cooling, and cargo space. When trading ships, installed upgrades are included in the trade-in credit.</p>${shopSearch(filtered.length)}<div class="item-grid">${filtered
		.slice(shopPage * 24, (shopPage + 1) * 24)
		.map((o) => {
			const buyQuantity = Math.max(
				0,
				Math.min(
					10,
					(game.ammoCapacity?.(o.id) || 0) - (state().ammo?.[o.id] || 0),
				),
			);
			const n = Array.isArray(state().outfits)
				? state().outfits.filter((x) => (x.id || x) === o.id).length
				: state().outfits?.[o.id] || 0;
			return `<article class="item-card"><div class="eyebrow">${esc(o.category || o.type || "Ship systems")} ${n ? `<span class="tag">Installed ×${n}</span>` : ""}</div><h3>${esc(o.name)}</h3><p>${esc(o.description)}</p><div class="item-stats">${o.space ? `<span>SPACE <b>${o.space}t</b></span>` : ""}${o.energy ? `<span>ENERGY <b>${o.energy}</b></span>` : ""}</div>${o.category === "Ammunition" ? `<span class="small cyan">${state().ammo?.[o.id] || 0} rounds aboard</span><button data-action="buyAmmo" data-id="${o.id}" data-quantity="${buyQuantity}" ${!buyQuantity ? "disabled" : ""}>${buyQuantity ? `Buy ${buyQuantity} · ${money(o.price * buyQuantity)} cr` : game.ammoCapacity?.(o.id) ? "Magazines full" : "Compatible storage required"}</button>` : `<button data-action="buyOutfit" data-id="${o.id}">${money(o.price)} cr · ${Number(o.sourceAttributes?.map) > 0 ? "Download charts" : "Install"}</button>`}</article>`;
		})
		.join("")}</div>`;
}
function shopSearch(count) {
	return `<input class="codex-search" type="search" id="shop-search" placeholder="Search local inventory…" aria-label="Search local inventory" value="${esc(shopQuery)}"><div class="market-info"><span>${count} available locally · Page ${shopPage + 1} / ${Math.max(1, Math.ceil(count / 24))}</span><span><button data-action="shopPrev" ${shopPage < 1 ? "disabled" : ""}>← Previous</button> <button data-action="shopNext" ${((shopPage + 1) * 24) >= count ? "disabled" : ""}>Next →</button></span></div>`;
}
function renderHangar() {
	const parked = game.parkedShips?.() || [];
	return `<h3 class="section-label">Owned ships / hangar</h3><div class="job-list">${parked.map((p) => `<article class="job-card"><div class="job-icon">${icon("ship")}</div><div><h4>${esc(p.name || p.model)}</h4><p>${p.contract ? "Contracted · " : "Owned · "}${esc(p.model)} · Hull ${Math.ceil(p.hull ?? p.stats.maxHull)}/${p.stats.maxHull} · ${(p.outfits || []).length} upgrades stored</p><p>${p.stats.cargoCapacity}t hold · ${p.stats.passengerCapacity} bunks</p></div><div class="arc-options">${p.contract ? `<button data-action="buyoutEscort" data-id="${esc(p.id)}" data-scope="fleet">Buy hull · ${money(p.stats.price - (p.bond || 5000))} cr</button>` : `<button data-action="switchShip" data-id="${esc(p.id)}">Make flagship</button>`}<button data-action="deployShip" data-id="${esc(p.id)}">Deploy escort</button><button data-action="sellParked" data-id="${esc(p.id)}">Sell · ${money(p.saleValue)} cr</button></div></article>`).join("") || '<div class="empty-state">Your hangar is empty. Buy a ship outright, park an escort, or earn a ship through a story.</div>'}</div>`;
}
function renderFleet() {
	const s = state();
	return `<div class="item-grid"><article class="item-card"><div class="eyebrow">Ship account</div><h3>${money(s.debt)} cr</h3><p>Outstanding ship loan. Loan interest and crew wages accrue when you travel. Pay down the balance to keep more of what you earn.</p><div class="button-row"><button data-action="payDebt" data-amount="1000">Pay 1,000 cr</button><button data-action="payDebt" data-amount="${Math.min(s.debt, s.credits)}">Pay maximum</button></div></article><article class="item-card"><div class="eyebrow">Fleet command</div><h3>${Array.isArray(s.escorts) ? s.escorts.length : s.escorts || 0} escort ships</h3><p>Hire a wingmate for protection and stronger combat support. Escort wages come due with each day of travel.</p><button data-action="hireEscort">Recruit · ${money(14000 + s.escorts.length * 2000)} cr</button><span class="small muted">90 cr / day per escort</span></article><article class="item-card"><div class="eyebrow">Flight services</div><h3>Ready for the black</h3><p>Local crews keep your ship flying. Repairs restore your hull and shields; fuel extends your reach between systems.</p><div class="button-row"><button data-action="repair">Repair ship</button><button data-action="refuel">Refuel</button></div></article></div><div class="settings-row"><div><strong>Extra crew: ${s.extraCrew || 0}</strong><p>Additional crew occupies berths, earns 15 cr daily, and helps capture hostile ships.</p></div><div class="button-row"><button data-action="hireCrew">Hire · 200 cr</button><button data-action="dismissCrew" ${!s.extraCrew ? "disabled" : ""}>Release crew</button></div></div><h3 class="section-label">Your wing</h3><div class="job-list">${s.escorts.map((e) => `<article class="job-card"><div class="job-icon">${icon("ship")}</div><div><h4>${esc(e.name)}</h4><p>Hull ${Math.ceil(e.hull)} / ${e.maxHull} · ${esc(e.command)}</p><div class="button-row">${["protect", "attack", "hold"].map((c) => `<button data-action="fleetCommand" data-id="${c}" data-escort="${esc(e.id)}" ${e.command === c ? "disabled" : ""}>${c}</button>`).join("")}</div></div><div class="arc-options"><button data-action="parkEscort" data-id="${esc(e.id)}">Park in hangar</button>${e.contract ? `<button data-action="buyoutEscort" data-id="${esc(e.id)}">Buy hull · ${money((ships.find((x) => x.id === e.shipId)?.price || 45000) - (e.bond || 5000))} cr</button><button data-action="dismissEscort" data-id="${esc(e.id)}">Release · ${money(e.bond || 5000)} cr</button>` : ""}</div></article>`).join("") || '<p class="small muted">No wingmates yet. Recruit an escort or capture a disabled ship.</p>'}</div>${renderHangar()}`;
}
function renderMap() {
	const sy = current(),
		sel = systemById(selectedSystem) || sy,
		s = state();
	const visible = new Set([sy.id, sel.id]);
	let frontier = [sy.id];
	for (let depth = 0; depth < 4; depth++) {
		const next = [];
		for (const id of frontier) {
			for (const target of links(systemById(id))) {
				if (!visible.has(target)) {
					visible.add(target);
					next.push(target);
				}
			}
		}
		frontier = next;
	}
	for (const id of links(sel)) visible.add(id);
	const mapSystems = systems
		.filter((x) => visible.has(x.id))
		.map((x) => systemById(x.id));
	const points = mapSystems.map(starmapPosition),
		xs = points.map((p) => p.x),
		ys = points.map((p) => p.y);
	const minX = Math.min(...xs),
		maxX = Math.max(...xs),
		minY = Math.min(...ys),
		maxY = Math.max(...ys);
	const project = (sys) => {
		const p = starmapPosition(sys);
		return {
			x: 45 + ((p.x - minX) / Math.max(1, maxX - minX)) * 500,
			y: 35 + ((p.y - minY) / Math.max(1, maxY - minY)) * 330,
		};
	};
	const connections = [];
	const drawnConnections = new Set();
	for (const a of mapSystems) {
		for (const id of links(a)) {
			const connectionKey = [a.id, id].sort().join("|");
			if (drawnConnections.has(connectionKey) || !visible.has(id)) continue;
			drawnConnections.add(connectionKey);
			const b = systemById(id);
			if (!b) continue;
			const p = project(a),
				q = project(b);
			connections.push(
				`<line class="map-link ${a.id === sy.id || b.id === sy.id ? "reachable" : ""}" x1="${p.x}" y1="${p.y}" x2="${q.x}" y2="${q.y}"/>`,
			);
		}
	}
	const visited = new Set(s.visited || []),
		canJump = links(sy).includes(sel.id);
	const route = findRoute(sy.id, sel.id);
	const charted = game.isCharted?.(sel.id) ?? visited.has(sel.id);
	const svg = `<svg class="star-map" viewBox="0 0 590 405" role="group" aria-label="Star chart around ${esc(sy.name)}">${connections.join("")}${mapSystems
		.map((a) => {
			const p = project(a);
			return `<g role="button" tabindex="0" aria-label="Select ${esc(a.name)}" data-action="selectSystem" data-id="${esc(a.id)}" class="map-node ${visited.has(a.id) ? "visited" : ""} ${a.id === sy.id ? "current" : ""} ${a.id === sel.id ? "selected" : ""}"><circle cx="${p.x}" cy="${p.y}" r="${a.id === sy.id ? 5 : 3}"/><text x="${p.x + 8}" y="${p.y + 3}">${esc(a.name)}</text>${a.id === sy.id ? `<circle cx="${p.x}" cy="${p.y}" r="11" style="fill:none;stroke:#efb37355"/>` : ""}</g>`;
		})
		.join("")}</svg>`;
	return modal(
		"A galaxy of possibilities.",
		"Navigation / star chart",
		`<label class="small muted" for="system-search">Find a system</label><input class="codex-search" type="search" id="system-search" list="system-names" placeholder="Search ${systems.length} star systems…" autocomplete="off" style="margin-top:8px"><datalist id="system-names">${systems.map((a) => `<option value="${esc(a.name)}">`).join("")}</datalist><div class="map-layout"><div>${svg}<div class="map-legend"><span><i class="here"></i>Your location</span><span><i></i>Visited</span><span>Connected lines: jump routes</span></div></div><aside class="map-detail"><div class="eyebrow">${charted ? esc(sel.faction || "Independent") : "Unsurveyed system"}</div><h3>${esc(sel.name)}</h3><p>${charted ? esc(sel.description || "A distant world awaits.") : "Only this star’s position is on your charts. Visit or survey the system, or buy a Local Map to reveal its worlds and market information."}</p><dl><dt>Planet</dt><dd>${charted ? esc(typeof sel.planet === "string" ? sel.planet : sel.planet?.name || "None") : "Unsurveyed"}</dd><dt>Distance</dt><dd>${route.length ? `${route.length - 1} jump${route.length === 2 ? "" : "s"}` : sel.id === sy.id ? "Here" : "No known route"}</dd><dt>Fuel aboard</dt><dd>${Math.floor(s.fuel)} / ${stats().maxFuel}</dd><dt>Status</dt><dd>${visited.has(sel.id) ? "Visited" : charted ? "Charted" : "Uncharted"}</dd></dl>${charted && sel.inhabited ? `<details class="map-prices"><summary>Today’s market guide</summary>${commodities.map((c) => `<div><span>${esc(c.name)}</span><b>${money(game.price(c.id, sel.id))}</b></div>`).join("")}<p>Prices can change before arrival.</p></details>` : ""}${sel.id === sy.id ? "<button disabled>Current system</button>" : s.mode === "port" ? '<button class="primary" data-action="launch">Launch to plot a jump</button>' : canJump ? `<button class="primary" data-action="jump" data-id="${esc(sel.id)}">Jump to ${esc(sel.name)} ${icon("arrow")}</button>` : route.length > 1 ? `<button class="primary" data-action="jump" data-id="${esc(route[1])}">Next hop: ${esc(systemById(route[1])?.name)} ${icon("arrow")}</button>` : "<button disabled>No linked route · Explore for a jump drive</button>"}</aside></div>`,
		`<span>Click a star to inspect. Travel costs fuel and a day; refuel at inhabited ports.</span><span class="mono">${s.visited?.length || 1} / ${systems.length} EXPLORED</span>`,
	);
}
function findRoute(from, to) {
	if (from === to) return [from];
	const q = [[from]],
		seen = new Set([from]);
	while (q.length) {
		const route = q.shift(),
			last = systemById(route.at(-1));
		for (const id of links(last)) {
			if (seen.has(id)) continue;
			const next = [...route, id];
			if (id === to) return next;
			seen.add(id);
			q.push(next);
		}
	}
	return [];
}
function renderJournal() {
	const story = getStory(),
		s = state();
	return modal(
		"The captain’s journal",
		"Your choices leave a wake",
		`${story ? storyCard(story) : ""}<h3 class="section-label">Active contracts</h3><div class="job-list">${(s.jobs || []).map((j) => `<article class="job-card"><div class="job-icon">${icon("cargo")}</div><div><h4>${esc(j.name || j.title || j.id)}</h4><p>${esc(j.description || "")} · Destination: ${esc(systemById(j.destinationId || j.destination)?.name || j.destinationId || j.destination || "Check objective")} ${j.deadline ? `· Due day ${j.deadline}` : ""}</p></div><button data-action="abandonJob" data-id="${esc(j.id)}">Abandon</button></article>`).join("") || '<div class="empty-state">Your hold is clear of commitments.<br>Visit a spaceport jobs board to pick up work.</div>'}</div><h3 class="section-label">Side stories</h3><div class="job-list">${
			getArcs()
				.filter((a) => a.accepted)
				.map(arcCard)
				.join("") ||
			'<p class="muted small">Speak with travelers in the spaceport to discover side stories.</p>'
		}</div><h3 class="section-label">Local commitments</h3><div class="job-list">${(game.activeSourceMissions?.() || []).map(nativeMissionCard).join("")}</div><h3 class="section-label">Flight log</h3>${
			(s.log || [])
				.slice(0, 35)
				.map(
					(entry) =>
						`<div class="log-entry"><time>DAY ${esc(entry.day ?? s.day)}</time><p>${entry.title ? "<strong>" + esc(entry.title) + "</strong><br>" : ""}${esc(typeof entry === "string" ? entry : entry.message || entry.text)}</p></div>`,
				)
				.join("") ||
			'<p class="muted small">The first page of your story is still blank.</p>'
		}`,
		`<span>${s.kills || 0} hostiles defeated · ${s.visited?.length || 1} systems visited</span><button data-action="catalog">Galaxy archive ${icon("book")}</button>`,
	);
}
function renderSecondary() {
	const launchers = game.secondaryWeapons?.() || [],
		selected = game.secondaryWeapon?.();
	if (!launchers.length)
		return '<p class="small muted">Secondary hardpoint empty. Install a launcher and buy its ammunition at an outfitter to use F or the secondary fire button.</p>';
	return `<h3 class="section-label">Secondary weapons</h3><div class="job-list">${launchers
		.map((w) => {
			const ammoName = Array.isArray(w.weapon?.ammo)
				? w.weapon.ammo[0]
				: w.weapon?.ammo || "Energy";
			const ammo = outfits.find((o) => o.name === ammoName);
			return `<article class="job-card"><div class="job-icon">${icon("bolt")}</div><div><h4>${esc(w.name)}</h4><p>${esc(ammoName)} · ${ammo ? `${state().ammo?.[ammo.id] || 0} rounds` : "Rechargeable"}${w.id === selected?.id ? ` · ${selected.damage} damage` : ""}</p></div><button data-action="selectSecondary" data-id="${esc(w.id)}" ${w.id === selected?.id ? "disabled" : ""}>${w.id === selected?.id ? "Armed" : "Arm"}</button></article>`;
		})
		.join("")}</div>`;
}

function renderShip() {
	const s = state(),
		st = stats();
	return modal(
		"Your home between the stars",
		"Flagship / " + esc(st.name),
		`<div class="port-summary"><div class="item-illustration" style="height:160px">${shipDrawing(ships.findIndex((x) => x.id === s.shipId))}</div><div class="port-data"><div>Hull <strong>${Math.ceil(s.hull)} / ${st.maxHull}</strong></div><div>Shields <strong>${Math.ceil(s.shield)} / ${st.maxShield}</strong></div><div>Fuel <strong>${Math.floor(s.fuel)} / ${st.maxFuel}</strong></div><div>Free cargo capacity <strong>${st.cargoCapacity} tonnes total</strong></div><div>Passenger berths <strong>${st.passengerCapacity}</strong></div></div></div>${renderSecondary()}<h3 class="section-label">Installed equipment</h3><div class="job-list">${
			(Array.isArray(s.outfits)
				? s.outfits
				: Object.entries(s.outfits || {}).flatMap(([id, n]) =>
						Array(n).fill(id),
					)
			)
				.map((id) => {
					const o = outfits.find((x) => x.id === (id.id || id));
					return `<article class="job-card"><div class="job-icon">${icon("bolt")}</div><div><h4>${esc(o?.name || id)}</h4><p>${esc(o?.description || "")}</p></div>${s.mode === "port" ? `<button data-action="sellOutfit" data-id="${esc(id.id || id)}">Remove / sell</button>` : ""}</article>`;
				})
				.join("") ||
			'<div class="empty-state">Factory equipment. Visit an outfitter to customize your ship.</div>'
		}</div><h3 class="section-label">In your hold</h3><div class="job-list">${
			Object.entries(s.cargo || {})
				.filter(([, n]) => n > 0)
				.map(
					([id, n]) =>
						`<article class="job-card"><div class="job-icon">${icon("cargo")}</div><div><h4>${esc(commodityName(id))}</h4><p>Trade cargo</p></div><span class="mono accent">${n} tonnes</span></article>`,
				)
				.join("") || '<p class="muted small">No trade cargo aboard.</p>'
		}</div>`,
		`<span>Outfit space, energy, and cooling determine what you can install.</span>${s.mode === "port" ? '<button data-action="portTab" data-id="outfitter">Visit outfitter</button>' : ""}`,
	);
}
function renderMining() {
	const minerals = game.availableMinerals?.() || [];
	return `<div class="settings-row"><div><strong>Mining focus</strong><p>Common metal can be collected with standard weapons. Mineral extraction requires a Mining Laser and cargo space.</p></div><select id="mineral-focus" aria-label="Mining focus"><option value="metal">Common metals</option>${minerals.map((m) => `<option value="${m.id}" ${state().mineralFocus === m.id ? "selected" : ""}>${esc(m.name)} · ${m.mass}t each</option>`).join("")}</select></div>`;
}
function renderMineralHold() {
	const minerals = game.mineralCargo?.() || [];
	if (!minerals.length) return "";
	return `<h3 class="section-label">Mineral cargo</h3><div class="job-list">${minerals.map((m) => `<article class="job-card"><div class="job-icon">${icon("cargo")}</div><div><h4>${esc(m.name)}</h4><p>${m.quantity} units · ${m.totalMass}t · ${money(m.sellPrice)} cr / unit</p></div>${state().mode === "port" ? `<button data-action="sellMineral" data-id="${m.id}" data-quantity="${m.quantity}">Sell all · ${money(m.sellPrice * m.quantity)} cr</button>` : ""}</article>`).join("")}</div>`;
}
function renderWrecks() {
	const wrecks = scene?.getTelemetry().wrecks || [];
	if (!wrecks.length) return "";
	return `<h3 class="section-label">Disabled hulls / ${wrecks.length}</h3><div class="job-list">${wrecks.map((w) => `<article class="job-card"><div class="job-icon">${icon("ship")}</div><div><h4>${esc(ships.find((s) => s.id === w.shipId)?.name || "Disabled vessel")}</h4><p>${Math.round(w.distance)} km · ${w.boardReady ? "In boarding range" : "Approach and brake to board"}</p><div class="button-row"><button data-action="approachWreck" data-id="${esc(w.id)}">Approach</button><button data-action="boardWreck" data-id="${esc(w.id)}">Board / salvage</button><button data-action="captureWreck" data-id="${esc(w.id)}">Capture · 3,000 cr</button></div></div></article>`).join("")}</div><div class="separator"></div>`;
}
function interactWreck(choice, id = selectedWreckId) {
	const check = scene?.inspectWreck?.(id || undefined);
	if (!check?.ok) {
		toast(check?.message || "No disabled vessel in range.", "error");
		return;
	}
	const result = act("board", { choice, wreckId: check.wreck.id });
	if (result.ok) {
		scene.consumeWreck(check.wreck.id);
		selectedWreckId = null;
		approachWreckId = null;
	}
}
function renderMissionTargets() {
	const actors = scene?.getTelemetry().missionActors || [];
	if (!actors.length) return "";
	return `<h3 class="section-label">Local ships / mission contacts</h3><button class="text-button" data-action="clearActor">Clear selected contact · scan the whole system</button><div class="job-list">${actors
		.map(
			(a) =>
				`<article class="job-card"><div class="job-icon">${icon("ship")}</div><div><h4>${esc(a.name)}</h4><p>${esc(a.role)} · ${esc(a.status)} · ${Math.round(a.distance)} km · Hull ${Math.ceil(a.hull)}/${a.maxHull}</p><div class="button-row"><button data-action="approachActor" data-id="${esc(a.id)}">Approach</button>${[
					["scan cargo", "Scan cargo"],
					["scan outfits", "Scan outfits"],
					["board", "Board"],
					["capture", "Capture"],
					["assist", "Assist"],
					["hail", "Hail"],
				]
					.map(
						([command, label]) =>
							`<button data-action="actorInteract" data-id="${esc(a.id)}" data-command="${command}">${label}</button>`,
					)
					.join("")}</div></div></article>`,
		)
		.join("")}</div><div class="separator"></div>`;
}
function interactActor(command, id = selectedActorId) {
	const actors = scene?.getTelemetry().missionActors || [];
	const target =
		actors.find((a) => a.id === id) ||
		[...actors].sort((a, b) => a.distance - b.distance)[0];
	if (!target) return false;
	const result = scene.interactActor(command, target.id);
	if (!result.ok) {
		toast(result.message, "error");
		return true;
	}
	for (const event of result.events || []) {
		const applied = game.act("sourceActorEvent", event);
		if (!applied.ok) {
			toast(applied.message, "error");
			return true;
		}
	}
	toast(result.message);
	audio?.play("click");
	save();
	if (
		["sourceOffer", "sourceChoose", "sourceAccept", "sourceComplete"].includes(
			action,
		)
	)
		dialogueDeferred = false;
	if (
		game.sourceDialogue?.() &&
		JSON.stringify(game.sourceDialogue()) !== dialogueDeferred
	)
		panel = "sourceDialogue";
	render();
	return true;
}
function renderLocalPlanets() {
	const planets = current().planets || [];
	return `<h3 class="section-label">Local destinations / ${esc(current().name)}</h3><div class="job-list">${planets.map((p) => `<article class="job-card"><div class="job-icon">${icon("star")}</div><div><h4>${esc(p.name)}</h4><p>${p.inhabited ? "Inhabited · port services" : "Uninhabited · orbital exploration"}</p></div><button data-action="selectPlanet" data-id="${esc(p.name)}" ${p.name === state().planetName ? "disabled" : ""}>${p.name === state().planetName ? "Selected" : "Set course"}</button></article>`).join("") || '<p class="small muted">No charted landing destinations. Survey in flight or jump onward.</p>'}</div><div class="separator"></div>`;
}
function renderActions() {
	return modal(
		"Ship operations",
		"In-flight actions",
		`${renderLocalPlanets()}${renderMissionTargets()}${renderWrecks()}${renderMining()}<p class="small muted">Actions depend on the local situation and your installed equipment. Flight pauses while this panel is open.</p><div class="job-list">${[
			[
				"scan",
				"Scan the system",
				"Survey unfamiliar space and locate mission signals.",
			],
			[
				"mine",
				"Mine asteroids",
				"Collect metal in an asteroid belt. Needs a suitable weapon and free hold.",
			],
			[
				"board",
				"Board disabled ship",
				"Salvage cargo and outfits from a disabled target.",
			],
			[
				"capture",
				"Capture disabled ship",
				"Claim a weakened ship for your fleet if you have enough crew.",
			],
			[
				"scoop",
				"Harvest stellar fuel",
				"Use a Ramscoop to replenish fuel from the stellar wind.",
			],
			[
				"hail",
				"Hail local traffic",
				"Listen for navigation help, trade news, or distress signals.",
			],
		]
			.map(
				([id, name, desc]) =>
					`<article class="job-card"><div class="job-icon">${icon(id === "mine" ? "cargo" : "scan")}</div><div><h4>${name}</h4><p>${desc}</p></div><button data-action="${id}">Engage</button></article>`,
			)
			.join(
				"",
			)}</div><div class="button-row"><button data-action="fleetCommand" data-id="protect">Fleet: protect</button><button data-action="fleetCommand" data-id="attack">Fleet: attack</button><button data-action="fleetCommand" data-id="hold">Fleet: hold</button></div>`,
		`<span>Tip: ${esc(bindingLabel("board"))} boards a target · ${esc(bindingLabel("scoop"))} scoops fuel · ${esc(bindingLabel("scan"))} scans.</span>`,
		true,
	);
}
function fullscreenAvailable() {
	return (
		typeof document.documentElement.requestFullscreen === "function" &&
		document.fullscreenEnabled !== false
	);
}
function renderOptions() {
	return modal(
		"Make yourself at home.",
		"Flight preferences",
		`<div class="settings-row"><div><strong>Rendering quality</strong><p>Auto responds to measured frame times. High adds detail and effects. Balanced reduces resolution, shadows, and physics load.</p></div><select id="quality-setting" aria-label="Rendering quality">${["Auto", "High", "Balanced"].map((q) => `<option ${settings.quality === q ? "selected" : ""}>${q}</option>`).join("")}</select></div><div class="settings-row"><div><strong>Master volume</strong><p>Original Endless Sky sound effects and ambience.</p></div><input id="volume-setting" aria-label="Master volume" type="range" min="0" max="1" step="0.05" value="${settings.volume}"></div><div class="settings-row"><div><strong>Sound</strong><p>Mute music, ambience, and effects.</p></div><button data-action="toggleMute">${settings.muted ? "Muted" : "Sound on"} ${icon(settings.muted ? "muted" : "sound")}</button></div><div class="settings-row"><div><strong>On-screen flight controls</strong><p>Auto follows your screen and pointing device. Always show also supports touch on hybrid laptops.</p></div><select id="touch-setting" aria-label="On-screen flight controls">${[
			["auto", "Auto"],
			["on", "Always show"],
			["off", "Hide"],
		]
			.map(
				([value, label]) =>
					`<option value="${value}" ${settings.touchControls === value ? "selected" : ""}>${label}</option>`,
			)
			.join(
				"",
			)}</select></div><div class="settings-row"><div><strong>Keyboard controls</strong><p>Change primary and alternate bindings for any keyboard layout.</p></div><button data-action="bindings">Change controls</button></div><div class="settings-row"><div><strong>Controller</strong><p>${gamepadName ? esc(gamepadName) : "Standard gamepads are detected when you press a controller button."}</p></div><button data-action="controls">Controller guide</button></div><div class="settings-row"><div><strong>Fullscreen</strong><p>${fullscreenAvailable() || document.fullscreenElement ? "A little more room for the universe." : "This browser does not allow page fullscreen. Use its display options if available."}</p></div><button data-action="fullscreen" ${!fullscreenAvailable() && !document.fullscreenElement ? "disabled" : ""}>${document.fullscreenElement ? "Exit" : fullscreenAvailable() ? "Enter" : "Unavailable"} ${icon("full")}</button></div><div class="settings-row"><div><strong>Flight diagnostics</strong><p>Show renderer backend, active preset, and frame time.</p></div><button data-action="toggleDiagnostics">${settings.diagnostics ? "Visible" : "Hidden"}</button></div>${!title ? '<div class="settings-row"><div><strong>Your captain’s record</strong><p>Saved automatically on this browser. Export a backup to carry your progress elsewhere.</p></div><button data-action="exportSave">Export save</button></div>' : ""}<div class="settings-row"><div><strong>Import a voyage</strong><p>Restore a previously exported Meridian Wake save.</p></div><button data-action="importSave">Import save</button><input id="save-file" type="file" accept="application/json,.json" hidden></div><div class="button-row">${!title ? '<button data-action="title">Save & return to title</button>' : ""}<button data-action="controls">Flight handbook</button><button data-action="about">About this voyage</button></div>`,
		"<span>Preferences save automatically.</span>",
		true,
	);
}
function renderControls() {
	const entries = [
		...BINDING_ACTIONS.map(([id, label]) => [label, bindingLabel(id)]),
		["Pause / close panel", "Esc"],
	];
	return modal(
		"A little guidance goes a long way.",
		"The flight handbook",
		`<div class="controls-grid">${entries.map(([label, key]) => `<div class="control-row"><span>${label}</span><kbd>${key}</kbd></div>`).join("")}</div><h3 class="section-label">A captain’s first day</h3><p class="small muted">Accept a transmission or delivery at the spaceport. Launch, open the starmap, and choose a linked system. Travel spends fuel and advances the day. Land at the destination to deliver cargo and hear the next chapter.</p><p class="small muted">Your ship carries momentum. Turn first, then thrust. Brake to slow down; use landing assistance to approach the planet. In combat, face your target and hold ${esc(bindingLabel("fire"))}. Disabled enemies can be boarded for salvage or captured.</p><h3 class="section-label">On a touchscreen</h3><p class="small muted">Use the left thumb controls to steer, thrust, brake, and boost. Hold the lightning button to fire and the small missile button to launch an equipped secondary weapon. The shield button toggles a fitted cloak. Tap the map, landing, and operations buttons for the same choices as desktop.</p>${gamepadHandbook()}<h3 class="section-label">Your voyage, your pace</h3><p class="small muted">Menus pause flight. Local ports automatically service your ship when possible. Trading, passenger work, mining, side stories, and fleet building remain available alongside the main story. If your ship is destroyed or stranded, rescue gets you flying again.</p>`,
		`<button data-action="bindings">Change keyboard controls</button><button class="primary" data-action="close">Understood ${icon("check")}</button>`,
		true,
	);
}
function bindingLabel(action) {
	return controls.bindings[action]
		.map((code) => keyLabel(code, keyboardLayout))
		.join(" / ");
}
function gamepadHandbook() {
	return `<h3 class="section-label">Standard gamepad</h3><p class="input-device-note small muted">${gamepadName ? `Connected: ${esc(gamepadName)}.` : "Connect a standard Xbox, PlayStation, or compatible controller and press a button to let the browser detect it."} Release the controls once after connecting, changing menus, or returning to this window.</p><div class="controls-grid">${[
		["Flight: turn / thrust / brake", "Left stick / D-pad"],
		["Primary / secondary weapons", "RT / RB · R2 / R1"],
		["Afterburner / cloak", "LT / LB · L2 / L1"],
		["Land or launch", "A / Cross"],
		["Ship operations", "B / Circle"],
		["Survey / select contact", "X / Y · Square / Triangle"],
		["Board / harvest fuel", "Left / right stick press"],
		["Starmap / pause", "View / Menu · Create / Options"],
		["Menus: focus / activate / back", "D-pad / A / B"],
		["Menus: change value / scroll", "Left–right / right stick"],
	]
		.map(
			([label, key]) =>
				`<div class="control-row"><span>${label}</span><kbd>${key}</kbd></div>`,
		)
		.join(
			"",
		)}</div><p class="input-device-note small muted">Gamepads use the browser’s standard mapping with a stick dead zone. Keyboard and touch remain available. Text searches use a keyboard. Browsers can require a click, tap, or keyboard press to enable audio, fullscreen, or the save-file picker; a controller button cannot grant that permission.</p>`;
}
function renderBindings() {
	return modal(
		"Make the controls your own.",
		"Keyboard controls",
		`<p class="input-device-note small muted">Select a binding, then press a key. The same key cannot control two actions. Escape cancels; Tab, Enter, Escape and Ctrl/Alt/Command combinations stay available for menus and browser commands. Bindings follow physical key positions. ${keyboardLayout ? "Labels match your current keyboard layout." : "Default letter labels use US positions; arrow controls work on every layout. Rebind any position for your keyboard."}</p>${bindingCapture ? `<p class="binding-prompt" role="status">Press a key for ${esc(BINDING_ACTIONS.find(([id]) => id === bindingCapture.action)[1].toLowerCase())}. <button data-action="cancelBinding">Cancel</button></p>` : ""}<div class="binding-list">${BINDING_ACTIONS.map(([action, label]) => `<div class="binding-row"><span>${label}</span><div>${[0, 1].map((slot) => `<button class="binding-key" data-action="rebind" data-id="${action}" data-slot="${slot}" aria-label="${esc(label)} ${slot ? "alternate" : "primary"} binding: ${esc(controls.bindings[action][slot] ? keyLabel(controls.bindings[action][slot], keyboardLayout) : "unassigned")}" ${bindingCapture?.action === action && bindingCapture.slot === slot ? 'aria-pressed="true"' : ""}>${esc(controls.bindings[action][slot] ? keyLabel(controls.bindings[action][slot], keyboardLayout) : "Add alternate")}</button>`).join("")}</div></div>`).join("")}</div>`,
		'<button data-action="resetBindings">Restore default controls</button><button class="primary" data-action="close">Done</button>',
		true,
	);
}
function renderEnding() {
	const s = state();
	return modal(
		"The end of one journey.",
		"Meridian Wake / voyage complete",
		`<div class="ending"><div class="eyebrow">Every choice leaves a wake</div><h2>An open sky.<br>A different tomorrow.</h2><p>${esc(s.ending?.text || s.endingText || "You began with a small ship and a debt. You leave behind a trail of delivered promises, hard choices, and worlds that know your name. The war has an ending. Your story does not have to.")}</p><div class="ending-stats"><div><b>${s.visited?.length || 1}</b><span>SYSTEMS EXPLORED</span></div><div><b>${money(s.credits)}</b><span>CREDITS ABOARD</span></div><div><b>${s.kills || 0}</b><span>HOSTILES DEFEATED</span></div></div><p class="small muted">Based on the universe and stories of Endless Sky.<br>Original adaptation, interface, and 3D art by GPT-6 Astra · 26 September 2026.</p><div class="button-row" style="justify-content:center"><button class="primary" data-action="continueSandbox">Keep exploring ${icon("arrow")}</button><button data-action="title">Return to title</button></div></div>`,
	);
}
function renderDestroyed() {
	return modal(
		"A distress beacon in the dark.",
		"Ship disabled",
		`<div class="ending"><h2>Still a captain.</h2><p>Your ship has been disabled. A rescue crew can tow you to the nearest safe berth. Your story and completed missions survive.</p><div class="button-row" style="justify-content:center"><button class="primary" data-action="rescue">Request rescue ${icon("shield")}</button></div></div>`,
		"",
		true,
	);
}
function renderAbout() {
	return modal(
		"Meridian Wake",
		"A spacefaring adventure",
		`<p class="small muted">A browser reimagining of <a href="https://github.com/endless-sky/endless-sky" target="_blank" rel="noopener" class="cyan">Endless Sky</a>, the open-source space trading, exploration, and combat game. Built with original low-poly brick spacecraft and adapted source storylines.</p><div class="separator"></div><div class="eyebrow">Generation record</div><p class="small">26 September 2026 · GPT-6 Astra (g6a)</p><div class="eyebrow">Credits</div><p class="small muted">Universe, names, source stories, and placeholder audio: the Endless Sky contributors. Source material is credited in the repository’s attribution and completion report. Interface, procedural geometry, and browser adaptation are new to Meridian Wake.</p><p class="small muted">Rendering: Three.js WebGPU with automatic WebGL2 fallback. Physics: Rapier. Typeface: Lato by Łukasz Dziedzic. Internal, non-commercial testing build.</p><div class="button-row"><button data-action="catalog">Explore the source archive ${icon("book")}</button></div>`,
		"<span>Independent stars. Shared beginnings.</span>",
		true,
	);
}
function renderCatalog() {
	if (!catalog) {
		loadCatalog();
		return modal(
			"The galaxy archive",
			"Source content reference",
			'<p class="muted small">Loading the source inventory…</p>',
		);
	}
	const entries = catalog.files
		? catalog.files.flatMap((file) =>
				file.definitions.map((d) => ({ ...d, file: file.path })),
			)
		: Array.isArray(catalog.entries)
			? catalog.entries
			: Object.entries(
					catalog.categories || catalog.content || catalog,
				).flatMap(([type, values]) =>
					Array.isArray(values)
						? values.map((v) =>
								typeof v === "string"
									? { name: v, type }
									: { ...v, type: v.type || type },
							)
						: [],
				);
	const q = catalogQuery.toLowerCase();
	const filtered = entries
		.filter(
			(e) => !q || `${e.name || e.id} ${e.type}`.toLowerCase().includes(q),
		)
		.slice(0, 80);
	return modal(
		"The galaxy archive",
		"Endless Sky / source inventory",
		`<p class="small muted">The archive records the original source definitions for traceability. Read the completion report for the distinction between playable content and reference material.</p><input class="codex-search" id="catalog-search" type="search" value="${esc(catalogQuery)}" placeholder="Search systems, ships, outfits, missions…" aria-label="Search source archive"><p class="eyebrow">${entries.length} source definitions · showing ${filtered.length}</p><div id="catalog-results">${filtered.map((e) => `<div class="codex-entry"><span class="tag">${esc(e.type || e.kind)}</span> ${esc(e.name || e.id)}<small>${esc(e.description || e.file || e.source || "Source definition preserved in the repository inventory.")}</small></div>`).join("")}</div>`,
	);
}
async function loadCatalog() {
	try {
		const response = await fetch("/source-catalog.json");
		if (!response.ok) throw Error();
		catalog = await response.json();
		if (panel === "catalog") render();
	} catch {
		catalog = { entries: [] };
		toast(
			"The archive could not load. Consult the repository source checklist.",
			"error",
		);
		if (panel === "catalog") render();
	}
}
async function handleAction(action, el) {
	const id = el?.dataset?.id;
	if (
		["controls", "bindings"].includes(action) &&
		!keyboardLayout &&
		navigator.keyboard?.getLayoutMap
	) {
		navigator.keyboard
			.getLayoutMap()
			.then((map) => {
				keyboardLayout = map;
				if (["controls", "bindings"].includes(panel) && !bindingCapture)
					render();
			})
			.catch(() => {});
	}
	if (action === "rebind") {
		bindingCapture = { action: id, slot: Number(el.dataset.slot) };
		clearControls();
		render();
		return;
	}
	if (action === "cancelBinding") {
		bindingCapture = null;
		render();
		return;
	}
	if (action === "resetBindings") {
		bindingCapture = null;
		controls.resetBindings();
		settings.bindings = controls.bindings;
		persistSettings();
		render();
		toast("Default keyboard controls restored.");
		return;
	}
	if (action === "new") {
		setPanel(hasSave() ? "confirmNew" : "new");
		return;
	}
	if (action === "confirmNew") {
		setPanel("new");
		return;
	}
	if (action === "selectStarter") {
		selectedStarter = id;
		render();
		return;
	}
	if (action === "begin") {
		await startGame();
		return;
	}
	if (action === "continue") {
		await startGame(true);
		return;
	}
	if (action === "resumeConversation") {
		dialogueDeferred = false;
		setPanel("sourceDialogue");
		return;
	}
	if (action === "close") {
		closePanel();
		return;
	}
	if (action === "viewPort") {
		panelHistory.length = 0;
		panel = null;
		render();
		return;
	}
	if (action === "title") {
		panelHistory.length = 0;
		save();
		title = true;
		panel = null;
		autopilot = false;
		clearControls();
		scene?.setView("title");
		render();
		return;
	}
	if (action === "portTab") {
		portTab = id;
		if (id === "contacts") {
			await enableSourceContent();
		}
		shopQuery = "";
		shopPage = 0;
		setPanel("port");
		return;
	}
	if (action === "shopPrev" || action === "shopNext") {
		shopPage = Math.max(0, shopPage + (action === "shopNext" ? 1 : -1));
		render();
		return;
	}
	if (
		[
			"options",
			"controls",
			"bindings",
			"journal",
			"ship",
			"flightActions",
			"about",
			"catalog",
			"port",
		].includes(action)
	) {
		setPanel(action);
		return;
	}
	if (action === "map") {
		if (title) return;
		selectedSystem = id || selectedSystem || state().systemId;
		setPanel("map");
		return;
	}
	if (action === "selectSystem") {
		selectedSystem = id;
		render();
		return;
	}
	if (action === "toggleMute") {
		settings.muted = !settings.muted;
		audio?.setMuted(settings.muted);
		audio
			?.init()
			.then(() =>
				audio.startMusic(!title && state().mode === "port" ? "port" : "music"),
			);
		persistSettings();
		render();
		return;
	}
	if (action === "toggleDiagnostics") {
		settings.diagnostics = !settings.diagnostics;
		persistSettings();
		render();
		return;
	}
	if (action === "fullscreen") {
		if (!document.fullscreenElement && !fullscreenAvailable()) {
			toast("This browser does not allow page fullscreen.", "error");
			return;
		}
		try {
			if (document.fullscreenElement) await document.exitFullscreen();
			else await document.documentElement.requestFullscreen();
		} catch {
			toast("Fullscreen is unavailable in this browser.", "error");
		}
		render();
		return;
	}
	if (action === "exportSave") {
		const blob = new Blob([game.save()], { type: "application/json" }),
			url = URL.createObjectURL(blob),
			anchor = document.createElement("a");
		anchor.href = url;
		anchor.download = `meridian-wake-day-${state().day}.json`;
		anchor.click();
		setTimeout(() => URL.revokeObjectURL(url), 1000);
		toast("Your captain’s record has been exported.");
		return;
	}
	if (action === "importSave") {
		audio?.init();
		$("#save-file")?.click();
		return;
	}
	if (action === "land") {
		approachActorId = null;
		approachWreckId = null;
		if (state().mode !== "port" && !game.currentPlanet()) {
			toast(
				"No charted landing destination here. Survey this system or plot your next jump.",
				"error",
			);
			return;
		}
		if (state().mode === "port") {
			act("launch");
			return;
		}
		if (scene?.getTelemetry().landReady) {
			game.act("landReady", { ready: true });
			act("land", { approach: true });
		} else {
			autopilot = true;
			panel = null;
			clearControls();
			render();
			toast(
				"Landing approach engaged. Your ship will brake and dock automatically.",
			);
		}
		return;
	}
	if (action === "buy" || action === "sell") {
		act(action, {
			commodityId: id,
			quantity: Number($(`#qty-${id}`)?.value || 1),
		});
		return;
	}
	if (
		[
			"buyShip",
			"buyOutfit",
			"sellOutfit",
			"acceptJob",
			"abandonJob",
			"acceptArc",
			"completeArc",
		].includes(action)
	) {
		const fields = {
			buyShip: "shipId",
			buyOutfit: "outfitId",
			sellOutfit: "outfitId",
			acceptJob: "jobId",
			abandonJob: "jobId",
			acceptArc: "arcId",
			completeArc: "arcId",
		};
		act(action, {
			[fields[action]]: id,
			choice: el.dataset.choice || "complete",
			keepCurrent: el.dataset.keep === "true",
		});
		return;
	}
	if (action === "clearActor") {
		selectedActorId = null;
		approachActorId = null;
		scene?.selectActor(null);
		render();
		return;
	}
	if (action === "selectWreck") {
		selectedWreckId = id;
		selectedActorId = null;
		scene?.selectWreck(id);
		scene?.selectActor(null);
		toast(
			`Disabled hull selected. Open Actions to approach, or ${bindingLabel("board")} to board in range.`,
		);
		return;
	}
	if (action === "approachWreck") {
		selectedWreckId = id;
		approachWreckId = id;
		selectedActorId = null;
		approachActorId = null;
		autopilot = false;
		scene?.selectWreck(id);
		panel = null;
		clearControls();
		render();
		return;
	}
	if (action === "boardWreck" || action === "captureWreck") {
		interactWreck(action === "captureWreck" ? "capture" : "salvage", id);
		return;
	}
	if (action === "selectActor") {
		selectedWreckId = null;
		approachWreckId = null;
		selectedActorId = id;
		scene?.selectActor(id);
		toast("Target selected. Open Actions for approach, scans, and boarding.");
		return;
	}
	if (action === "approachActor") {
		selectedWreckId = null;
		approachWreckId = null;
		selectedActorId = id;
		approachActorId = id;
		autopilot = false;
		scene?.selectActor(id);
		panel = null;
		clearControls();
		render();
		return;
	}
	if (action === "actorInteract") {
		interactActor(el.dataset.command, id);
		return;
	}
	if (action === "scan" && selectedActorId && interactActor("scan cargo"))
		return;

	if (action === "retryEscort") {
		act(action, { missionId: id, arcId: el.dataset.arc || undefined });
		return;
	}

	if (
		action === "sourceOffer" ||
		action === "sourceAccept" ||
		action === "sourceComplete" ||
		action === "sourceAbort"
	) {
		act(action, { missionId: id });
		return;
	}
	if (action === "sourceChoose") {
		act(action, { index: Number(id) });
		return;
	}
	if (action === "jump") {
		act("jump", { systemId: id });
		return;
	}
	if (action === "story") {
		act("story", { choice: el.dataset.choice || "complete" });
		return;
	}
	if (action === "payDebt") {
		act("payDebt", { amount: Number(el.dataset.amount) });
		return;
	}
	if (action === "buyoutEscort") {
		act(
			action,
			el.dataset.scope === "fleet" ? { fleetId: id } : { escortId: id },
		);
		return;
	}
	if (["switchShip", "deployShip", "sellParked"].includes(action)) {
		act(action, { fleetId: id });
		return;
	}
	if (action === "parkEscort") {
		act(action, { escortId: id });
		return;
	}
	if (action === "sellMineral") {
		act(action, { mineralId: id, quantity: Number(el.dataset.quantity) });
		return;
	}
	if (action === "buyAmmo") {
		act(action, { ammoId: id, quantity: Number(el.dataset.quantity || 1) });
		return;
	}
	if (action === "selectSecondary") {
		act(action, { outfitId: id });
		return;
	}
	if (action === "hireCrew" || action === "dismissCrew") {
		act(action, { count: 1 });
		return;
	}
	if (action === "selectPlanet") {
		const result = act(action, { planetName: id });
		if (result.ok) {
			panel = null;
			render();
		}
		return;
	}
	if (action === "dismissEscort") {
		act(action, { escortId: id });
		return;
	}
	if (action === "fleetCommand") {
		act(action, { command: id, escortId: el?.dataset?.escort });
		return;
	}
	if (action === "capture") {
		if (selectedActorId && interactActor("capture", selectedActorId)) return;
		interactWreck("capture");
		return;
	}
	if (action === "board") {
		if (selectedActorId && interactActor("board", selectedActorId)) return;
		interactWreck("salvage");
		return;
	}
	if (action === "continueSandbox") {
		panelHistory.length = 0;
		act("continueSandbox");
		panel = "port";
		render();
		return;
	}
	act(action);
}
app.addEventListener("click", (event) => {
	const el = event.target.closest("[data-action]");
	if (el) {
		handleAction(el.dataset.action, el).catch((error) => {
			console.error(error);
			toast(
				"That operation could not complete. Your last saved voyage is safe.",
				"error",
			);
		});
	}
});
app.addEventListener("change", async (event) => {
	const el = event.target;
	if (el.id === "mineral-focus") {
		act("selectMineral", { mineralId: el.value });
	}
	if (el.id === "touch-setting") {
		settings.touchControls = el.value;
		document.documentElement.dataset.touchControls = el.value;
		clearControls();
		persistSettings();
	}
	if (el.id === "quality-setting") {
		settings.quality = el.value;
		scene?.setQuality(settings.quality);
		persistSettings();
	}
	if (el.id === "system-search") {
		const sys = systems.find(
			(s) => s.name.toLowerCase() === el.value.trim().toLowerCase(),
		);
		if (sys) {
			selectedSystem = sys.id;
			render();
		}
	}
	if (el.id === "save-file" && el.files?.[0]) {
		try {
			const saved = await el.files[0].text();
			const loaded = Game.load(saved);
			if (loaded.state.sourceQuests) await loaded.enableSourceMissions();
			game = loaded;
			panelHistory.length = 0;
			dialogueDeferred = false;
			bindingCapture = null;
			clearControls();
			if (scene) scene.systemId = null;
			title = false;
			panel =
				state().mode === "ending"
					? "ending"
					: state().mode === "port"
						? "port"
						: state().mode === "destroyed"
							? "destroyed"
							: null;
			encounterKey = "";
			syncScene();
			save();
			render();
			audio?.startMusic(state().mode === "port" ? "port" : "music");
			toast("Your voyage has been restored.");
		} catch {
			toast("This file is not a valid Meridian Wake save.", "error");
		}
	}
});
app.addEventListener("input", (event) => {
	const el = event.target;
	if (el.id === "volume-setting") {
		settings.volume = Number(el.value);
		audio?.setVolume(settings.volume);
		persistSettings();
	}
	if (el.id === "shop-search") {
		shopQuery = el.value;
		shopPage = 0;
		const start = el.selectionStart;
		render();
		const input = $("#shop-search");
		input?.focus();
		input?.setSelectionRange(start, start);
	}
	if (el.id === "catalog-search") {
		catalogQuery = el.value;
		const start = el.selectionStart;
		render();
		const input = $("#catalog-search");
		input?.focus();
		input?.setSelectionRange(start, start);
	}
});
function cancelApproach() {
	autopilot = false;
	approachActorId = null;
	approachWreckId = null;
}
function runShortcut(action) {
	if (action === "pause") {
		if (panel) closePanel();
		else if (!title) setPanel("options");
		return;
	}
	if (action === "target") {
		if (panel || title) return;
		const actors = scene?.getTelemetry().missionActors || [];
		if (actors.length) {
			selectedActorId =
				actors[
					(actors.findIndex((actor) => actor.id === selectedActorId) + 1) %
						actors.length
				].id;
			scene.selectActor(selectedActorId);
		}
		return;
	}
	if (
		panel &&
		!["map", "journal", "ship", "flightActions", "land"].includes(action)
	)
		return;
	if (panel === action) {
		closePanel();
		return;
	}
	handleAction(action).catch((error) => {
		console.error(error);
		toast("That operation could not complete.", "error");
	});
}
function pauseForFocusLoss() {
	focusedWindow = false;
	clearControls();
	cancelApproach();
	if (!title) {
		save();
		if (!panel && state().mode === "flight") setPanel("options");
	}
}
app.addEventListener("pointerdown", (event) => {
	if (event.button !== 0) return;
	const marker = event.target.closest(".actor-marker");
	if (marker) marker.setPointerCapture?.(event.pointerId);
	const el = event.target.closest("[data-hold]");
	if (!el || panel || title || state().mode !== "flight") return;
	event.preventDefault();
	controls.pointerDown(event.pointerId, el.dataset.hold);
	el.classList.add("active");
	el.setPointerCapture?.(event.pointerId);
	if (["left", "right", "thrust", "brake", "boost"].includes(el.dataset.hold))
		cancelApproach();
});
for (const type of ["pointerup", "pointercancel", "lostpointercapture"])
	window.addEventListener(
		type,
		(event) => {
			controls.pointerUp(event.pointerId);
			for (const el of document.querySelectorAll("[data-hold]"))
				el.classList.toggle(
					"active",
					[...controls.pointers.values()].includes(el.dataset.hold),
				);
		},
		true,
	);
window.addEventListener("blur", pauseForFocusLoss);
window.addEventListener("focus", () => {
	focusedWindow = true;
	clearControls();
});
window.addEventListener("gamepaddisconnected", () => {
	clearControls();
});
window.addEventListener("keydown", (event) => {
	if (shortcutBlocked(event)) {
		controls.keys.clear();
		return;
	}
	if (bindingCapture) {
		if (event.repeat) return;
		if (event.key === "Escape") {
			event.preventDefault();
			bindingCapture = null;
			render();
			return;
		}
		if (!remappableCode(event.code)) {
			bindingCapture = null;
			render();
			return;
		}
		event.preventDefault();
		const result = controls.rebind(
			bindingCapture.action,
			bindingCapture.slot,
			event.code,
		);
		if (result.ok) {
			settings.bindings = controls.bindings;
			persistSettings();
			bindingCapture = null;
			render();
			toast("Keyboard binding saved.");
		} else toast(result.message, "error");
		return;
	}
	if (event.key === "Tab" && panel) {
		const nodes = focusableElements($(".modal"));
		if (
			nodes.length &&
			(!nodes.includes(document.activeElement) ||
				(event.shiftKey
					? document.activeElement === nodes[0]
					: document.activeElement === nodes.at(-1)))
		) {
			event.preventDefault();
			(event.shiftKey ? nodes.at(-1) : nodes[0]).focus();
		}
		return;
	}
	if (event.key === "Escape") {
		event.preventDefault();
		if (!event.repeat) runShortcut("pause");
		return;
	}
	if (textEntry(event.target)) return;
	const roleButton = event.target.closest('[role="button"]');
	if (roleButton && ["Enter", " "].includes(event.key)) {
		event.preventDefault();
		if (!event.repeat)
			roleButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
		return;
	}
	if (
		["Space", "Enter"].includes(event.code) &&
		event.target.closest("button, a, summary")
	)
		return;
	if (title || !ready) return;
	const result = controls.keyDown(event, {
		flight: !panel && state().mode === "flight",
	});
	if (result.handled) event.preventDefault();
	if (result.manual) cancelApproach();
	if (result.action) runShortcut(result.action);
});
window.addEventListener("keyup", (event) => controls.keyUp(event));
// Text entry and IME composition must also release a previously held flight key.
app.addEventListener("focusin", (event) => {
	if (textEntry(event.target)) controls.keys.clear();
});
app.addEventListener("compositionstart", () => clearControls());
document.addEventListener("fullscreenchange", () => {
	if (panel === "options") render();
});
let gamepadAudioNotice = false;
let unsupportedGamepadNotice = false;
function gamepadMenu(action) {
	const scope = $(".modal") || app;
	const nodes = focusableElements(scope);
	if (!nodes.length) return;
	const active = nodes.includes(document.activeElement)
		? document.activeElement
		: null;
	if (action === "activate") {
		const target = active || nodes[0];
		if (
			["fullscreen", "importSave", "exportSave"].includes(target.dataset.action)
		) {
			target.focus();
			toast("Use a click, tap, or keyboard press for this browser permission.");
			return;
		}
		if (target.matches("input, select, textarea")) {
			toast(
				target.matches('select, input[type="range"], input[type="number"]')
					? "Use left and right to change this value; up and down move to another control."
					: "Use a keyboard to enter text, or move to another control.",
			);
			return;
		}
		if (typeof target.click === "function") target.click();
		else target.dispatchEvent(new MouseEvent("click", { bubbles: true }));
		return;
	}
	if (
		["left", "right"].includes(action) &&
		active?.matches('select, input[type="range"], input[type="number"]')
	) {
		const direction = action === "right" ? 1 : -1;
		if (active.tagName === "SELECT") {
			const options = [...active.options].filter((option) => !option.disabled);
			const index = options.findIndex((option) => option.selected);
			active.value =
				options[Math.max(0, Math.min(options.length - 1, index + direction))]
					?.value ?? active.value;
		} else {
			try {
				direction > 0 ? active.stepUp() : active.stepDown();
			} catch {}
		}
		active.dispatchEvent(new Event("input", { bubbles: true }));
		active.dispatchEvent(new Event("change", { bubbles: true }));
		return;
	}
	const direction = ["left", "up"].includes(action) ? -1 : 1;
	const index = active
		? (nodes.indexOf(active) + direction + nodes.length) % nodes.length
		: direction > 0
			? 0
			: nodes.length - 1;
	nodes[index].focus();
	nodes[index].scrollIntoView({ block: "nearest" });
}
function pollGamepad(now, dt) {
	let pads;
	try {
		pads = navigator.getGamepads?.() || [];
	} catch {
		pads = [];
	}
	const mode =
		document.hidden || !focusedWindow || !ready
			? "disabled"
			: title || panel || state().mode !== "flight"
				? "menu"
				: "flight";
	const result = controls.pollGamepads(pads, now, mode);
	if (result.unsupported && !unsupportedGamepadNotice)
		toast(
			"This controller has no standard browser mapping. Keyboard, mouse and touch controls remain available.",
		);
	unsupportedGamepadNotice = result.unsupported;
	if (result.changed) {
		gamepadName = result.id;
		if (result.connected)
			toast(
				"Gamepad connected. Release its controls, then open the flight handbook for the mapping.",
			);
		else if (!title && state().mode === "flight" && !panel) setPanel("options");
		if (["options", "controls"].includes(panel)) render();
	}
	if (mode === "disabled") return;
	if (result.manual) cancelApproach();
	if (result.scroll && $(".modal-body"))
		$(".modal-body").scrollTop += result.scroll * dt * 500;
	for (const action of result.actions) {
		if (
			!gamepadAudioNotice &&
			!settings.muted &&
			audio?.context?.state !== "running"
		) {
			gamepadAudioNotice = true;
			toast(
				"A click, tap, or keyboard press may be needed to enable sound in this browser.",
			);
		}
		if (action.startsWith("menu:")) gamepadMenu(action.slice(5));
		else runShortcut(action);
	}
}
function resumeAudioFromGesture(event) {
	if (
		!event.isTrusted ||
		settings.muted ||
		!audio?.context ||
		audio.context.state === "running"
	)
		return;
	audio
		.init()
		.then(() =>
			audio.startMusic(!title && state().mode === "port" ? "port" : "music"),
		);
}
window.addEventListener("pointerdown", resumeAudioFromGesture);
window.addEventListener("keydown", resumeAudioFromGesture);
window.addEventListener("beforeunload", () => {
	if (!title) save();
});
document.addEventListener("visibilitychange", () => {
	if (document.hidden) pauseForFocusLoss();
	else {
		focusedWindow = document.hasFocus();
		clearControls();
	}
});
function updateHud(t) {
	const s = state(),
		st = stats(),
		tele = scene.getTelemetry();
	for (const [id, value, max] of [
		["shield", s.shield, st.maxShield],
		["hull", s.hull, st.maxHull],
		["fuel", s.fuel, st.maxFuel],
		["power", s.energy ?? 100, st.maxEnergy ?? 100],
		["heat", s.heat ?? 0, st.maxHeat ?? 100],
	]) {
		const bar = $(`#${id}-bar`),
			label = $(`#${id}-value`);
		if (bar)
			bar.style.width = `${Math.min(100, Math.max(0, (100 * value) / (max || 1)))}%`;
		if (label)
			label.textContent =
				id === "fuel" ? Math.floor(value * 10) / 10 : Math.ceil(value);
	}
	const credits = $("#credits-value");
	if (credits) credits.textContent = money(s.credits);
	const secondaryReadout = $("#secondary-readout");
	if (secondaryReadout) {
		const w = game.secondaryWeapon?.();
		secondaryReadout.textContent = w
			? `${w.name.toUpperCase()} · ${w.ammoCount ?? "∞"} [F]`
			: "SECONDARY HARDPOINT EMPTY";
	}
	const objective = $("#mission-objective");
	const story = getStory();
	if (objective && story?.accepted) objective.textContent = story.objective;
	const diag = $("#diagnostics");
	if (diag)
		diag.textContent = settings.diagnostics
			? `${tele.backend} · ${tele.quality === "Auto" ? "Auto → " : ""}${tele.effectivePreset || tele.preset} · ${tele.frameMs.toFixed(1)} ms · ${tele.bodies} bodies`
			: "";
	const titleBackend = $("#title-backend");
	if (titleBackend)
		titleBackend.textContent = `${tele.backend?.toUpperCase()} · ${tele.preset?.toUpperCase()}`;
	const cloakButton = document.querySelector(".hud-nav [data-action=cloak]");
	if (cloakButton) {
		cloakButton.classList.toggle("active", !!s.cloaked);
		const label = cloakButton.querySelector("span");
		if (label) label.textContent = s.cloaked ? "Cloaked" : "Cloak";
	}
	const hint = $("#flight-hint");
	if (hint)
		hint.textContent =
			state().mode !== "flight"
				? ""
				: autopilot
					? game.campaignLandingReady?.() === false && tele.landReady
						? "HOLDING POSITION · WAITING FOR CONVOY"
						: "AUTOPILOT · LANDING APPROACH"
					: tele.enemies > 0
						? `${tele.enemies} HOSTILE CONTACT${tele.enemies === 1 ? "" : "S"} · FACE TARGET + ${bindingLabel("fire")} TO FIRE`
						: tele.landReady
							? `BERTH IN RANGE · PRESS ${bindingLabel("land")} TO LAND`
							: s.overheated
								? "WEAPONS OVERHEATED · WAIT FOR COOLING"
								: s.energy < 3
									? "LOW POWER · RECHARGING"
									: `${Math.round(tele.speed || 0)} KM/S · FREE FLIGHT`;
	const markers = $("#actor-markers");
	if (markers) {
		const actors = [
			...(tele.missionActors || []).map((a) => ({ ...a, kind: "actor" })),
			...(tele.wrecks || []).map((w) => ({
				...w,
				kind: "wreck",
				name: `Disabled ${ships.find((s) => s.id === w.shipId)?.name || "vessel"}`,
				status: "Board / capture",
			})),
		].filter((a) => a.screen?.visible);
		const existing = new Map(
			[...markers.children].map((node) => [node.dataset.id, node]),
		);
		const visible = new Set(actors.map((a) => a.id));
		for (const [id, node] of existing) if (!visible.has(id)) node.remove();
		for (const actor of actors) {
			let node = existing.get(actor.id);
			if (!node) {
				node = document.createElement("button");
				node.type = "button";
				node.dataset.action =
					actor.kind === "wreck" ? "selectWreck" : "selectActor";
				node.dataset.id = actor.id;
				const name = document.createElement("span"),
					status = document.createElement("small");
				name.className = "actor-name";
				status.className = "actor-status";
				node.append(name, status);
				markers.append(node);
			}
			node.className = `actor-marker ${(actor.kind === "wreck" ? actor.id === selectedWreckId : actor.id === selectedActorId) ? "selected" : ""}`;
			node.style.left = `${actor.screen.x * 100}%`;
			node.style.top = `${actor.screen.y * 100}%`;
			node.querySelector(".actor-name").textContent = actor.name;
			node.querySelector(".actor-status").textContent = actor.status;
		}
	}
	if (approachWreckId) {
		const wreck = (tele.wrecks || []).find((w) => w.id === approachWreckId);
		if (!wreck || wreck.boardReady) {
			approachWreckId = null;
			toast(
				wreck
					? `Disabled ship in boarding range. Press ${bindingLabel("board")} or open Actions.`
					: "That disabled ship is no longer present.",
			);
		}
	}
	if (approachActorId) {
		const target = (tele.missionActors || []).find(
			(a) => a.id === approachActorId,
		);
		if (!target || (target.distance < 4 && tele.speed < 1)) {
			approachActorId = null;
			toast(
				target
					? "Target in range. Open Actions to interact."
					: "Target no longer in range.",
			);
		}
	}
	const contacts = $("#radar-contacts");
	if (contacts) {
		const dots = [
			...(tele.targets || []).map((t) => ({ ...t, kind: "hostile" })),
			...(tele.escorts || []).map((t) => ({ ...t, kind: "friendly" })),
			...(tele.missionActors || []).map((t) => ({
				...t,
				kind: t.role === "hostile" ? "hostile" : "mission",
			})),
			...(tele.wrecks || []).map((t) => ({ ...t, kind: "wreck" })),
		];
		if (current().planets?.length) dots.push({ x: 12, z: 1, kind: "dock" });
		contacts.innerHTML = dots
			.map((dot) => {
				let x = (dot.x - tele.position.x) / 65,
					z = (dot.z - tele.position.z) / 65;
				const length = Math.hypot(x, z);
				if (length > 0.86) {
					x *= 0.86 / length;
					z *= 0.86 / length;
				}
				return `<i class="radar-contact ${dot.kind}" style="left:${50 + x * 46}%;top:${50 + z * 46}%"></i>`;
			})
			.join("");
		const arrow = $(".radar-ship");
		if (arrow)
			arrow.style.transform = `rotate(${(tele.heading * 180) / Math.PI}deg)`;
	}
	const radar = $("#radar-label");
	if (radar)
		radar.textContent =
			tele.enemies > 0 ? `${tele.enemies} HOSTILE CONTACTS` : "LOCAL SCANNER";
	const saveStatus = $("#save-status");
	if (saveStatus)
		saveStatus.textContent =
			t - lastSave < 2500 ? "VOYAGE SAVED" : "AUTOSAVE ON";
}
let lastFrame = performance.now();
function frame(now) {
	const dt = Math.min((now - lastFrame) / 1000, 0.1);
	lastFrame = now;
	if (scene) {
		pollGamepad(now, dt);
		const paused =
			title ||
			!!panel ||
			state().mode !== "flight" ||
			document.hidden ||
			!focusedWindow;
		const s = state();
		scene.setPaused(paused);
		const input = {
			...controls.flight(),
			autopilot,
			approachActorId,
			approachWreckId,
		};
		const events =
			scene.update(
				dt,
				{
					system: current(),
					ship: game.currentShip(),
					cloaked: s.cloaked,
					energy: s.energy,
					overheated: s.overheated,
					escorts: s.escorts,
					encounter: s.encounter,
					missionActors: s.missionActors,
					wrecks: s.wrecks,
					paused,
					mode: s.mode,
				},
				input,
			) || [];
		for (const event of events) {
			if (event.type === "landReady") {
				landingReady = event.ready;
				game.act("landReady", { ready: event.ready });
			}
			if (event.type === "shot") audio?.play("laser");
			if (event.type === "fired" && !paused && !event.authorized)
				game.act("fire");
			if (event.type === "secondaryFired" && !paused) {
				if (!event.authorized) game.act("secondary");
				audio?.play("laser");
			}
			if (event.type === "intercept" && !paused && !event.authorized)
				game.act("intercept");
			if (event.type === "missionActor" && !paused) {
				const result = game.act("sourceActorEvent", event);
				if (result.destroyed || result.failed) toast(result.message, "error");
				else if (event.action === "destroy")
					toast(
						"A mission vessel was lost. Check your journal for the outcome.",
						"error",
					);
				else if (event.action === "disable")
					toast(
						"Mission target disabled. Stop firing if you intend to board it.",
					);
			}
			if (event.type === "mined" && !paused) {
				const result = game.act("mine");
				if (result.ok) toast(result.message, "reward");
			}
			if (event.type === "escortHit" && !paused) {
				const result = game.act("escortDamage", {
					escortId: event.escortId,
					amount: event.damage,
				});
				if (result.destroyed) toast(result.message, "error");
			}
			if (event.type === "hit" && !paused) {
				game.act("damage", { amount: event.damage });
				audio?.play("hit");
				if (s.mode === "destroyed") {
					panel = "destroyed";
					save();
					render();
				}
			}
			if (event.type === "kill" && !paused) {
				const result = game.act("kill", { wreck: event.wreck });
				audio?.play("explosion");
				if (result.ok) {
					toast(
						result.message || "Target disabled. Salvage or board the wreck.",
						"reward",
					);
					save();
				}
			}
			if (event.type === "pickup" && !paused) {
				const result = game.act("pickup", { credits: event.credits });
				if (result.ok) {
					audio?.play("reward");
					toast(
						result.message || `Recovered ${money(event.credits)} credits.`,
						"reward",
					);
				}
			}
		}
		if (!paused) {
			modelTimeAccumulator += dt;
			while (modelTimeAccumulator >= 0.25) {
				game.act("regenerate", { seconds: 0.25 });
				modelTimeAccumulator -= 0.25;
			}
		}
		if (
			!title &&
			state().mode === "flight" &&
			encounterKey !== `${state().systemId}:${state().combatSerial}`
		)
			syncScene();
		if (
			autopilot &&
			state().mode === "flight" &&
			!paused &&
			scene.getTelemetry().landReady &&
			game.campaignLandingReady?.() !== false
		) {
			game.act("landReady", { ready: true });
			act("land", { approach: true });
		}
		if (
			!title &&
			!panel &&
			game.sourceDialogue?.() &&
			JSON.stringify(game.sourceDialogue()) !== dialogueDeferred
		) {
			panel = "sourceDialogue";
			render();
		}
		if (now - lastHud > 250) {
			updateHud(now);
			lastHud = now;
		}
		if (!title && now - lastSave > 20000) save();
	}
	if (toasts.some((t) => t.until < now)) {
		while (toasts[0]?.until < now) toasts.shift();
		renderToasts();
	}
	requestAnimationFrame(frame);
}
render();
try {
	audio = new AudioManager({ volume: settings.volume, muted: settings.muted });
	scene = await createScene(document.querySelector("#scene"), {
		quality: settings.quality,
		authorizeAction: (action) => game.act(action),
	});
	scene.setQuality(settings.quality);
	scene.setView("title");
	ready = true;
	render();
	requestAnimationFrame(frame);
	// Read-only diagnostics expose actual runtime evidence for browser verification.
	window.meridian = {
		get state() {
			return JSON.parse(game.save());
		},
		get telemetry() {
			return scene.getTelemetry();
		},
		get audio() {
			return {
				loaded: audio.buffers.size,
				errors: [...audio.errors],
				contextState: audio.context?.state || "locked",
				muted: audio.muted,
				volume: audio.volume,
				gain: audio.master?.gain.value ?? 0,
				activeVoices: audio.voices.size,
				music: audio.music?.id || null,
			};
		},
		get content() {
			return {
				systems: systems.length,
				ships: ships.length,
				outfits: outfits.length,
				campaign: arr(CAMPAIGN).length,
			};
		},
		version: "1.0.0",
	};
} catch (error) {
	console.error(error);
	const loading = $(".loading");
	if (loading)
		loading.innerHTML = `<div><div class="eyebrow">Flight systems unavailable</div><p>${esc(error.message)}</p><p>This game requires a current browser with WebGPU or WebGL2.<br>Enable hardware acceleration, then reload.</p><button class="primary action-button" onclick="location.reload()">Retry launch</button></div>`;
}
