import { createApp } from "./index";
import { getRuntimeConfig } from "./env";
import { createDoctorSearchService, createGetDoctorService } from "./search";
import { createFeedbackService } from "./feedback";
import { createSymptomValidationService } from "./validation";

const config = getRuntimeConfig();
const app = createApp({
	port: config.port,
	searchService: createDoctorSearchService(config),
	getDoctorService: createGetDoctorService(config),
	feedbackService: createFeedbackService(config),
	symptomValidationService: createSymptomValidationService(config),
	corsAllowedOrigins: config.corsAllowedOrigins,
});

export default {
	port: config.port,
	fetch: app.fetch,
};
