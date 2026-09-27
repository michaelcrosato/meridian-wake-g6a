import { FACTIONS } from "./content.js";
import {
	HISTORY,
	ORGANIZATIONS,
	REGIONS,
	regionFor,
	wikiUrl,
} from "./wiki-content.js";

const entries = [...REGIONS, ...ORGANIZATIONS, ...HISTORY];
export function fieldGuideEntries(game, query = "", category = "All") {
	// Alien dossiers become visible through actual discovery, keeping early exploration intact.
	const discovered = new Set(
		game.state.visited.map((id) => game.systemById(id)?.faction),
	);
	const dossiers = FACTIONS.filter(
		(f) =>
			discovered.has(f.name) &&
			!["Republic", "Syndicate", "Free Worlds"].includes(f.name),
	).map((f) => ({
		...f,
		category: "Contacts",
		summary: "Encountered during your voyage",
		text: f.description,
	}));
	const q = query.trim().toLowerCase();
	return [...entries, ...dossiers].filter(
		(entry) =>
			(category === "All" || entry.category === category) &&
			`${entry.name} ${entry.summary} ${entry.text} ${entry.travel || ""}`
				.toLowerCase()
				.includes(q),
	);
}

export function fieldGuideBody(game, { query, category, esc }) {
	const local = regionFor(game.currentSystem(), game.currentPlanet());
	const filtered = fieldGuideEntries(game, query, category);
	return `<p class="small muted">Public history and a traveler’s guide to human space. Accounts reflect what people know at the start of your voyage in 3013. New alien contacts appear as you visit their space.</p>
	${local ? `<div class="guide-location"><span class="eyebrow">You are here / ${esc(local.name)}</span><p>${esc(local.summary)}</p></div>` : ""}
	<label class="small muted" for="guide-search">Search the field guide</label><input id="guide-search" class="codex-search" type="search" value="${esc(query)}" placeholder="Regions, organizations, history…">
	<div class="guide-filters" role="group" aria-label="Field guide categories">${["All", "Regions", "Organizations", "History", "Contacts"].map((c) => `<button data-action="guideCategory" data-id="${c}" aria-pressed="${category === c}">${c}</button>`).join("")}</div>
	<p class="eyebrow" role="status">${filtered.length} ${filtered.length === 1 ? "entry" : "entries"}</p>
	<div class="guide-entries">${
		filtered
			.map(
				(entry) => `<details class="guide-entry" ${query ? "open" : ""}>
	<summary><span class="tag">${esc(entry.year || entry.category)}</span> ${esc(entry.name)}</summary>
	${entry.category !== "History" ? `<p>${esc(entry.summary)}</p>` : ""}<p class="muted">${esc(entry.text)}</p>
	${entry.travel ? `<p class="guide-tip">Captain’s note: ${esc(entry.travel)}</p>` : ""}
	${entry.source ? `<a class="small cyan" href="${wikiUrl(entry.source)}" target="_blank" rel="noopener">Read the Endless Sky wiki ↗</a>` : ""}</details>`,
			)
			.join("") ||
		'<div class="empty-state">No matching entries. Try another name or category.</div>'
	}</div>`;
}
