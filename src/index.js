const corsHeaders = {
	'Access-Control-Allow-Headers': '*',
	'Access-Control-Allow-Methods': 'POST',
	'Access-Control-Allow-Origin': '*',
};

export default {
	async fetch(request, env, ctx) {
		try {
			if (request.method === 'OPTIONS') {
				return new Response('ok', {
					headers: corsHeaders,
				});
			}

			if (request.method === 'GET') {
				const { results } = await env.DB.prepare('SELECT name, color, x, y FROM Points').all();
				return Response.json(results);
			}

			const { initData, color, x, y } = await request.json();
			const data = transformInitData(initData || '');
			const user = JSON.parse(data.user);

			const isValid = await validate(data, env.BOT_TOKEN);
			if (!isValid) {
				return Response.json({ error: 'هش نامعتبر' }, { status: 403 });
			}

			const { results } = await env.DB.prepare('SELECT * FROM Points WHERE (x = ? AND y = ?) OR telegramId = ?').bind(x, y, user.id).all();
			if (results.length > 0) {
				return Response.json({ error: 'مجاز به ارسال دوباره نیستید' }, { status: 403 });
			}
			if (color >= 8 || color < 0) {
				return Response.json({ error: 'رنگ نامعتبر' }, { status: 400 });
			}

			const name = [user.first_name, user.last_name].filter(Boolean).join(' ');
			await env.DB.prepare('INSERT INTO Points(telegramId, name, x, y, color) VALUES (?, ?, ?, ?, ?)')
				.bind(user.id, name, x, y, color)
				.run();

			return Response.json({ message: 'successful' });
		} catch (error) {
			console.log(error);
			return Response.json({ error: 'internal server error' }, { status: 500 });
		}
	},
};

function transformInitData(initData) {
	return Object.fromEntries(new URLSearchParams(initData));
}

async function validate(data, botToken) {
	const encoder = new TextEncoder();

	const checkString = Object.keys(data)
		.filter((key) => key !== 'hash')
		.map((key) => `${key}=${data[key]}`)
		.sort()
		.join('\n');

	const secretKey = await crypto.subtle.importKey('raw', encoder.encode('WebAppData'), { name: 'HMAC', hash: 'SHA-256' }, true, ['sign']);

	const secret = await crypto.subtle.sign('HMAC', secretKey, encoder.encode(botToken));

	const signatureKey = await crypto.subtle.importKey('raw', secret, { name: 'HMAC', hash: 'SHA-256' }, true, ['sign']);

	const signature = await crypto.subtle.sign('HMAC', signatureKey, encoder.encode(checkString));

	const hex = [...new Uint8Array(signature)].map((byte) => byte.toString(16).padStart(2, '0')).join('');

	return data.hash === hex;
}
