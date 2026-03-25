import { createApp } from "./index";
import { getRuntimeConfig } from "./env";
import { createDoctorSearchService } from "./search";
import { createSymptomValidationService } from "./validation";

const config = getRuntimeConfig();
const app = createApp({
	port: config.port,
	searchService: createDoctorSearchService(config),
	symptomValidationService: createSymptomValidationService(config),
	corsAllowedOrigins: config.corsAllowedOrigins,
});

export default {
	port: config.port,
	fetch: app.fetch,
};
