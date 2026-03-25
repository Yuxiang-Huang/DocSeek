import type { DoctorRow } from "./search";

export function querySearchDoctors(
	sql: Bun.SQL,
	vectorLiteral: string,
	limit: number,
): Promise<DoctorRow[]> {
	return sql<DoctorRow[]>`
		SELECT d.*,
			loc.latitude,
			loc.longitude
		FROM doctor_search_embeddings dse
		INNER JOIN doctors d ON d.id = dse.doctor_id
		LEFT JOIN doctor_locations dl ON dl.doctor_id = d.id AND dl.is_primary = true
		LEFT JOIN locations loc ON loc.id = dl.location_id
		WHERE dse.embedding IS NOT NULL
		ORDER BY dse.embedding <=> ${vectorLiteral}::vector
		LIMIT ${limit}
	`;
}
