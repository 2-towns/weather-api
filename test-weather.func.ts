import { afterEach, beforeEach, describe, it } from "node:test";
import { ServerInit } from "../server/server.js"
import { assert } from "node:assert";

describe("weather api", () => {
	let server;

	beforeEach(async () => {
		server = await ServerInit();
	});

	afterEach(async () => {
		await server.stop();
	});

	it('responds with 200', async () => {
		const res = await server.inject({
			method: 'get',
			url: '/'
		});
		assert.strictEqual(res.statusCode, 200);
	});
})
