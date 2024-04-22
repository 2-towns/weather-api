import { StartRedis } from "./rate-limiter/rate-limiter.repository.js";
import { ServerStart, ServerStop } from "./server/server.js";

await StartRedis()

await ServerStart()

process.on('unhandledRejection', async (err) => {
	await ServerStop()
	console.error(err)
	process.exit(1);
});
