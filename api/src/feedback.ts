type FeedbackParams = {
	doctorId: number;
	rating: number;
	comment?: string;
};

export type FeedbackService = (params: FeedbackParams) => Promise<void>;

type FeedbackRuntimeConfig = {
	databaseUrl: string;
};

export function validateRating(rating: unknown): number {
	if (!Number.isInteger(rating) || (rating as number) < 1 || (rating as number) > 5) {
		throw new Error("rating must be an integer between 1 and 5");
	}
	return rating as number;
}

export function createFeedbackService(config: FeedbackRuntimeConfig): FeedbackService {
	const sql = new Bun.SQL(config.databaseUrl);

	return async ({ doctorId, rating, comment }) => {
		await sql`
			INSERT INTO feedback (doctor_id, rating, comment)
			VALUES (${doctorId}, ${rating}, ${comment ?? null})
		`;
	};
}
