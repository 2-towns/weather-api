import Hapi from "@hapi/hapi";
import assert from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import { Right } from "purify-ts";
import { Server } from "../server/server.js";
import { TemperatureRepository } from "./temperature.repository.js";
import { Weather } from "./weather.js";

const mask = () => Math.round(Math.random() * 255)
const randomIp = () => mask() + "." + mask() + "." + mask() + "." + mask()

describe("weather api", () => {
	let server: Hapi.Server;

	beforeEach(async () => {
		server = await Server.init();
	});

	afterEach(async () => {
		await Server.stop();
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

	it('responds with 422 when the payload is not valid', async () => {
		const params = new URLSearchParams({
			city: '',
			date: new Date().toISOString(),
		});

		const res = await server.inject({
			method: 'get',
			url: '/weather?' + params.toString(),
		});

		assert.deepEqual(JSON.parse(res.payload), {
			error: 'Unprocessable Entity',
			message: 'Invalid fields: city',
			statusCode: 422,
		});
	})

	it('responds with 200 and stores in cache when the payload is valid', async () => {
		const payload = {
			city: "San francisco",
			date: "2024-02-22T14:48:00.000Z"
		}
		const params = new URLSearchParams(payload)

		const res = await server.inject({
			method: 'get',
			url: '/weather?' + params,
			headers: {
				"x-real-ip": randomIp()
			},
		});

		assert.deepEqual(JSON.parse(res.payload), {
			celcius: 17.06,
			fahrenheit: 62.71
		});

		const temperature = TemperatureRepository.getCacheValue(Weather.hash(payload))

		assert.deepEqual(temperature, Right({
			celcius: 17.06,
			fahrenheit: 62.71
		}));
	})

	it('use the api when the cache is outdated', async () => {
		const payload = {
			city: "San francisco",
			date: "2024-02-22T14:48:00.000Z"
		}

		const expired = new Date()
		expired.setMinutes(expired.getMinutes() - 11)

		TemperatureRepository.setCacheValue(Weather.hash(payload), {
			celcius: 10,
			fahrenheit: 50,
			expiration: expired.toISOString()
		})

		let fromCache = false

		server.events.on("request", (_, event) => {
			if ((event as any).data.message == "got data from cache") {
				fromCache = true
			}
		})

		const params = new URLSearchParams(payload)

		await server.inject({
			method: 'get',
			url: '/weather?' + params,
			headers: {
				"x-real-ip": randomIp()
			},
		});

		assert.ok(!fromCache)
	})

	it('responds with 200 with the data from cache', async () => {
		const payload = {
			city: "San francisco",
			date: new Date().toISOString()
		}

		const params = new URLSearchParams(payload)

		TemperatureRepository.setCacheValue(Weather.hash(payload), { celcius: 10, fahrenheit: 50 })

		let fromCache = false

		server.events.on("request", (_, event) => {
			if ((event as any).data.message == "got data from cache") {
				fromCache = true
			}
		})

		const res = await server.inject({
			method: 'get',
			url: '/weather?' + params,
			headers: {
				"x-real-ip": randomIp()
			},
		});

		assert.ok(fromCache)
		assert.deepEqual(JSON.parse(res.payload), {
			celcius: 10,
			fahrenheit: 50
		});
	})

	it('responds with 429 when the rate limit is reached', async () => {
		const payload = {
			city: "San francisco",
			date: new Date().toISOString()
		}

		TemperatureRepository.setCacheValue(Weather.hash(payload), { celcius: 10, fahrenheit: 50 })

		const params = new URLSearchParams(payload)

		const ip = randomIp()

		const callApi = () => server.inject({
			method: 'get',
			url: '/weather?' + params,
			headers: {
				"x-real-ip": ip
			},
		});

		await callApi()
		await callApi()
		await callApi()
		await callApi()
		await callApi()

		const res = await callApi()

		assert.deepEqual(JSON.parse(res.payload), {
			error: 'Too Many Requests',
			message: 'Requests limit reached.',
			statusCode: 429
		});
	})
})
