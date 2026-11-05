// Anonymous stats for c4snchz.github.io/diabetes: stores test/game answers, serves aggregates.
const CORS = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
	'Access-Control-Allow-Headers': 'Content-Type'
};

// Max option index per test question (imc is a 0-2 category computed in the browser).
const TEST_FIELDS = { sexo: 1, edad: 3, imc: 2, cintura: 3, actividad: 1, verduras: 1, presion: 1, glucosa: 1, familia: 2 };
const CARDS = 9;

const json = (data, status = 200, extra = {}) =>
	new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', ...CORS, ...extra } });

const isInt = (v, max) => Number.isInteger(v) && v >= 0 && v <= max;
const today = () => new Date().toISOString().slice(0, 10);

async function saveTest(env, b) {
	const vals = [];
	for (const [k, max] of Object.entries(TEST_FIELDS)) {
		if (!isInt(b[k], max)) return json({ error: 'bad ' + k }, 400);
		vals.push(b[k]);
	}
	if (!isInt(b.score, 26)) return json({ error: 'bad score' }, 400);
	await env.DB.prepare(
		'INSERT INTO tests (day, score, ' + Object.keys(TEST_FIELDS).join(', ') + ') VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
	).bind(today(), b.score, ...vals).run();
	return json({ ok: true });
}

async function saveGame(env, b) {
	if (typeof b.picks !== 'string' || !/^[01]+$/.test(b.picks) || b.picks.length !== CARDS) return json({ error: 'bad picks' }, 400);
	const hits = [...b.picks].filter((c) => c === '1').length;
	await env.DB.prepare('INSERT INTO games (day, hits, picks) VALUES (?, ?, ?)').bind(today(), hits, b.picks).run();
	return json({ ok: true });
}

async function stats(env) {
	const fields = Object.keys(TEST_FIELDS);
	const [tests, games, days] = await env.DB.batch([
		env.DB.prepare('SELECT score, ' + fields.join(', ') + ' FROM tests'),
		env.DB.prepare('SELECT hits, picks FROM games'),
		env.DB.prepare("SELECT day, COUNT(*) AS n FROM tests WHERE day >= date('now', '-13 days') GROUP BY day")
	]);

	const t = tests.results;
	const bands = [0, 0, 0, 0, 0];
	const answers = Object.fromEntries(fields.map((k) => [k, new Array(TEST_FIELDS[k] + 1).fill(0)]));
	let scoreSum = 0, consult = 0;
	for (const r of t) {
		scoreSum += r.score;
		if (r.score >= 12) consult++;
		bands[r.score < 7 ? 0 : r.score <= 11 ? 1 : r.score <= 14 ? 2 : r.score <= 20 ? 3 : 4]++;
		for (const k of fields) if (r[k] != null) answers[k][r[k]]++;
	}

	const g = games.results;
	const cardHits = new Array(CARDS).fill(0);
	let hitSum = 0;
	for (const r of g) {
		hitSum += r.hits;
		[...r.picks].forEach((c, i) => { if (c === '1') cardHits[i]++; });
	}

	return json({
		tests: t.length,
		avgScore: t.length ? scoreSum / t.length : 0,
		consult,
		bands,
		answers,
		perDay: days.results,
		games: g.length,
		avgHits: g.length ? hitSum / g.length : 0,
		cardHits
	}, 200, { 'Cache-Control': 'public, max-age=60' });
}

export default {
	async fetch(req, env) {
		const { pathname } = new URL(req.url);
		if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
		if (req.method === 'GET' && pathname === '/stats') return stats(env);
		if (req.method === 'POST' && (pathname === '/test' || pathname === '/game')) {
			let body;
			try { body = await req.json(); } catch { return json({ error: 'bad json' }, 400); }
			return pathname === '/test' ? saveTest(env, body) : saveGame(env, body);
		}
		return json({ error: 'not found' }, 404);
	}
};
