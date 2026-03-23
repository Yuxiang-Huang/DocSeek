import { createApp } from "./index";
import { getRuntimeConfig } from "./env";
import { createDoctorSearchService } from "./search";

const config = getRuntimeConfig();
const app = createApp({
	port: config.port,
	searchService: createDoctorSearchService(config),
});

export default {
	port: config.port,
	fetch: app.fetch,
};
