import { Cache } from "./rate-limiter/rate-limiter.repository.js";
import { Server } from "./server/server.js";

await Cache.start()

await Server.start()

process.on('unhandledRejection', async (err) => {
	await Server.stop()
	console.error(err)
	process.exit(1);
});
