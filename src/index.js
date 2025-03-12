const corsHeaders = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
	'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export default {
	async fetch(request, env, ctx) {
		try {
			if (request.method === 'OPTIONS') {
				// handle preflight CORS requests
        return new Response(null, {
          status: 204,
          headers: corsHeaders,
        })
			}

			if (request.method === 'GET') {
				const { results } = await env.DB.prepare('SELECT name, color, x, y FROM Points').all();
				return response(results, 200);
			}

			const { initData, color, x, y } = await request.json();
			const data = transformInitData(initData || '');
			const user = JSON.parse(data.user);

			const isValid = await validate(data, env.BOT_TOKEN);
			if (!isValid) {
				return response({ error: 'هش نامعتبر' }, 403);
			}

			const { results } = await env.DB.prepare('SELECT * FROM Points WHERE (x = ? AND y = ?) OR telegramId = ?')
        .bind(x, y, user.id)
        .all();
			if (results.length > 0) {
				return response({ error: 'مجاز به ارسال دوباره نیستید' }, 403);
			}
			if (color >= 8 || color < 0) {
				return response({ error: 'رنگ نامعتبر' }, 400);
			}

			const name = [user.first_name, user.last_name].filter(Boolean).join(' ');
			await env.DB.prepare('INSERT INTO Points(telegramId, name, x, y, color) VALUES (?, ?, ?, ?, ?)')
				.bind(user.id, name, x, y, color)
				.run();

			return response({ message: 'successful' }, 200);
		} catch (error) {
			console.log(error);
			return response({ error: 'internal server error' }, 500);
		}
	},
};

function response(message, status) {
	return Response.json(message, { status, headers: corsHeaders });
}

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
