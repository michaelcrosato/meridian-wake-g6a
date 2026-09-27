const paths = {
	missile:
		"M20 4c-7-1-12 4-14 10l4 4c6-2 11-7 10-14ZM8 10 3 11l-1 5 5-1m7 2-1 5 5-1 1-5M4 20l-2 2M13 9l2 2",
	star: "M12 2l2.6 6.8L22 12l-7.4 3.2L12 22l-2.6-6.8L2 12l7.4-3.2z",
	map: "M3 5l6-3 6 3 6-3v17l-6 3-6-3-6 3zM9 2v17m6-14v17",
	ship: "M12 2L6 10l-3 8 6-2 3 5 3-5 6 2-3-8zM12 7v8M7 12l3 1m4 0 3-1",
	cargo: "M3 6l9-4 9 4v12l-9 4-9-4zM3 6l9 4 9-4M12 10v12M7 4l10 4",
	book: "M4 3h13a3 3 0 0 1 3 3v15H7a3 3 0 0 1-3-3zm0 14h16M8 7h8M8 11h5",
	settings:
		"M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8M12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2",
	arrow: "M4 12h16m-6-6 6 6-6 6",
	land: "M12 2v13m-5-5 5 5 5-5M4 16v5h16v-5",
	launch: "M12 18V3m-5 5 5-5 5 5M4 16v5h16v-5",
	route:
		"M5 4a2 2 0 1 0 0 4 2 2 0 0 0 0-4M19 16a2 2 0 1 0 0 4 2 2 0 0 0 0-4M7 6h7a4 4 0 0 1 0 8H9a4 4 0 0 0 0 4h8",
	sound: "M4 9h4l5-5v16l-5-5H4zM17 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14",
	muted: "M4 9h4l5-5v16l-5-5H4zM17 9l5 6m0-6-5 6",
	full: "M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5",
	help: "M9 8a3 3 0 1 1 4 3c-1 1-1 1-1 3m0 3v1M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20",
	people:
		"M9 3a3 3 0 1 0 0 6 3 3 0 0 0 0-6M2 20v-4a7 7 0 0 1 14 0v4M17 3a3 3 0 0 1 0 6m1 4a6 6 0 0 1 4 6v1",
	shield: "M12 2l9 4v6c0 5-9 10-9 10S3 17 3 12V6zM8 12l3 3 5-6",
	bolt: "M14 2L4 14h7l-1 8L20 9h-7z",
	scan: "M3 8V3h5m8 0h5v5M3 16v5h5m8 0h5v-5M4 12h16M12 7v10",
	close: "M5 5l14 14M5 19 19 5",
	check: "M4 12l5 5L20 6",
	flag: "M5 22V3c5-4 9 4 15 0v10c-6 4-10-4-15 0",
};
export function icon(name, cls = "icon") {
	return `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true"><path d="${paths[name] || paths.star}"/></svg>`;
}
export const brandMark = `<svg class="brand-mark" viewBox="0 0 40 40" fill="none" aria-hidden="true"><path d="M20 2 36 11v18L20 38 4 29V11Z" stroke="currentColor"/><path d="m10 27 10-18 10 18h-5l-5-9-5 9Z" fill="currentColor"/><path d="M14 31h12" stroke="currentColor"/></svg>`;
export function shipDrawing(index = 0) {
	const colors = ["#adcfc9", "#d2c7ac", "#aebfd0", "#baaca1"];
	return `<svg viewBox="0 0 120 85" aria-hidden="true" fill="none"><path d="M10 65 60 83 110 65 60 48Z" fill="#99c9c308"/><path d="m60 4 13 28 22 13 8 22-29-6-14 12-14-12-29 6 8-22 22-13Z" fill="${colors[index % 4]}" stroke="#091e28" stroke-width="2"/><path d="m60 12 8 22-8 13-8-13Z" fill="#386573"/><path d="M47 36v25l13 12V47Zm26 0v25L60 73V47Z" fill="#0002"/><path d="M32 42v14m56-14v14M48 64v10m24-10v10" stroke="#edb57b" stroke-width="4"/><path d="m25 56 18-6m32 0 18 6" stroke="#fff5" stroke-width="3"/></svg>`;
}
