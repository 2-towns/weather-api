import Hapi from "@hapi/hapi";
import assert from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import { Right } from "purify-ts";
import { ServerInit, ServerStop } from "../server/server.js";
import { WeatherHash } from "./weather.js";
import { TemperatureRepository } from "./weather.repository.js";

const mask = () => Math.round(Math.random() * 255)
const randomIp = () => mask() + "." + mask() + "." + mask() + "." + mask()

describe("weather api", () => {
	let server: Hapi.Server;

	beforeEach(async () => {
		server = await ServerInit();
	});

	afterEach(async () => {
		await ServerStop();
	});

	it('responds with 404 when the request is not found', async () => {
		const res = await server.inject({
			method: 'get',
			url: '/',
		});

		assert.equal(res.statusCode, 404);
		assert.deepEqual(JSON.parse(res.payload), {
			statusCode: 404,
			error: "Not Found",
			message: "the path is not found"
		})
	});

	it('responds with 400 when the request is not a valid json', async () => {
		const res = await server.inject({
			method: 'post',
			url: '/weather',
			payload: "bad"
		});

		assert.equal(res.statusCode, 400);
		assert.deepEqual(JSON.parse(res.payload), {
			statusCode: 400,
			message: "Invalid request payload JSON format",
			error: "Bad Request"
		})
	});

	it('responds with 422 when the payload is not valid', async () => {
		const res = await server.inject({
			method: 'post',
			url: '/weather',
			payload: {
				city: "",
				date: new Date().toISOString()
			},
		});

		assert.deepEqual(JSON.parse(res.payload), {
			error: 'Unprocessable Entity',
			message: 'Invalid fields: city',
			statusCode: 422,
		});
	})

	it('responds with 200 and stores in cache when the payload is valid', async () => {
		const payload = {
			city: "Lille",
			date: "2024-02-22T14:48:00.000Z"
		}

		const res = await server.inject({
			method: 'post',
			url: '/weather',
			headers: {
				"x-real-ip": randomIp()
			},
			payload,
		});

		assert.deepEqual(JSON.parse(res.payload), {
			celcius: 29.18,
			fahrenheit: 84.52
		});

		const temperature = TemperatureRepository.getCacheValue(WeatherHash(payload))

		assert.deepEqual(temperature, Right({
			celcius: 29.18,
			fahrenheit: 84.52
		}));
	})

	it('responds with 200 with the data from cache', async () => {
		const payload = {
			city: "Lille",
			date: new Date().toISOString()
		}

		TemperatureRepository.setCacheValue(WeatherHash(payload), { celcius: 10, fahrenheit: 50 })

		let fromCache = false

		server.events.on("request", (request, event, tags) => {
			if ((event as any).data.message == "got data from cache") {
				fromCache = true
			}
		})

		const res = await server.inject({
			method: 'post',
			url: '/weather',
			headers: {
				"x-real-ip": randomIp()
			},
			payload,
		});

		assert.ok(fromCache)
		assert.deepEqual(JSON.parse(res.payload), {
			celcius: 10,
			fahrenheit: 50
		});
	})

	it('responds with 429 when the rate limit is reached', async () => {
		const payload = {
			city: "Lille",
			date: new Date().toISOString()
		}

		const ip = randomIp()

		const callApi = () => server.inject({
			method: 'post',
			url: '/weather',
			headers: {
				"x-real-ip": ip
			},
			payload,
		});

		// Cache the first  class
		await callApi()

		// Run 4 class to reach the limit
		await Promise.all([callApi(), callApi(), callApi(), callApi()])

		const res = await callApi()

		assert.deepEqual(JSON.parse(res.payload), {
			error: 'Too Many Requests',
			message: 'Requests limit reached.',
			statusCode: 429
		});
	})
})
