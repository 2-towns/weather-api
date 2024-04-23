import assert from "node:assert";
import { describe, it } from "node:test";
import { EitherAsync, Left, Right } from "purify-ts";
import { HttpError } from "../errors/errors.js";
import { RateLimiter } from "./rate-limiter.js";

describe('rate limiter', () => {
	it("returns an error when checking the ip and the repository fails", async () => {
		const increment = (_: string) => EitherAsync.liftEither(
			Left(new HttpError(500, "Something went wrong."))
		)

		const result = await RateLimiter.check("127.0.0.1", increment).run()

		assert.deepEqual(result, Left(new HttpError(500, "Something went wrong.")))
	})


	it("returns an error when checking the api and the repository returns a count more than the limit", async () => {
		const increment = (_: string) => EitherAsync.liftEither(Right(2))

		const limit = 1
		const result = await RateLimiter.check("127.0.0.1", increment, limit).run()

		assert.deepEqual(result, Left(new HttpError(429, "Requests limit reached.")))
	})


	it("does not return error when the rate limit is not reached", async () => {
		const increment = (_: string) => EitherAsync.liftEither(Right(1))

		const limit = 2
		const result = await RateLimiter.check("127.0.0.1", increment, limit).run()

		assert.deepEqual(result, Right(1))
	})
})
