import { EitherAsync, Left, Right } from "purify-ts";
import { createClient } from 'redis';
import { RATE_PERIOD_IN_SEC } from "../config/config.js";
import { HttpError } from "../errors/errors.js";

let client: ReturnType<typeof createClient>

export async function StartRedis() {
	client = await createClient()
		.on('error', err => console.log('Redis Client Error', err))
		.connect();
}


export function StopRedis() {
	return client.quit()
}

export type RateLimitRepository = {
	// Increment the api calls and retrieve the last 
	// value. 
	// The key will expire in Redis if there is no call 
	// during X seconds. 
	increment(ip: string): EitherAsync<HttpError, number>
}

export const score = (date: Date = new Date()) => date.getTime()

// Database abstraction to retrieve the data
export const RateLimitRepository = {
	increment: (ip: string) => EitherAsync.fromPromise<HttpError, number>(
		() =>
			client.multi()
				.zAdd(ip, { value: score() + "", score: score() })
				.expire(ip, RATE_PERIOD_IN_SEC)
				.zCount(ip, score() - RATE_PERIOD_IN_SEC * 1000, score())
				.exec()
				.then(data => Right((data[2] || 0) as number))
				.catch(e => Left(new HttpError(500, "Something went wrong.", e)))

	)
}
