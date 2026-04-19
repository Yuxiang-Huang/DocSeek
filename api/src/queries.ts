import type { DoctorRow, SearchFilters } from "./search";

export type QuerySearchDoctorFilters = {
	locationContains?: string | null;
	onlyAcceptingNewPatients?: boolean | null;
};

export function queryGetDoctorById(
	sql: Bun.SQL,
	doctorId: number,
): Promise<DoctorRow[]> {
	return sql<DoctorRow[]>`
		SELECT d.id, d.source_provider_id, d.npi, d.full_name, d.first_name, d.middle_name,
			d.last_name, d.suffix, d.primary_specialty, d.accepting_new_patients,
			d.profile_url, d.ratings_url, d.book_appointment_url, d.primary_location,
			d.primary_phone, d.created_at, d.next_available,
			NULL::float AS match_score,
			NULL::text AS matched_specialty,
			loc.latitude,
			loc.longitude
		FROM doctors d
		LEFT JOIN doctor_locations dl ON dl.doctor_id = d.id AND dl.is_primary = true
		LEFT JOIN locations loc ON loc.id = dl.location_id
		WHERE d.id = ${doctorId}
		LIMIT 1
	`;
}

export function querySearchDoctors(
	sql: Bun.SQL,
	vectorLiteral: string,
	limit: number,
	filters: SearchFilters = {},
): Promise<DoctorRow[]> {
	const locationFilter =
		typeof filters.location === "string" && filters.location.trim()
			? filters.location.trim()
			: null;
	const onlyAccepting = filters.onlyAcceptingNewPatients === true ? true : null;

	return sql<DoctorRow[]>`
		SELECT d.id, d.source_provider_id, d.npi, d.full_name, d.first_name, d.middle_name,
			d.last_name, d.suffix, d.primary_specialty, d.accepting_new_patients,
			d.profile_url, d.ratings_url, d.book_appointment_url, d.primary_location,
			d.primary_phone, d.created_at, d.next_available,
			1 - (dse.embedding <=> ${vectorLiteral}::vector) AS match_score,
			REPLACE(dse.content, 'Specialty: ', '') AS matched_specialty,
			loc.latitude,
			loc.longitude
		FROM doctor_search_embeddings dse
		INNER JOIN doctors d ON d.id = dse.doctor_id
		LEFT JOIN doctor_locations dl ON dl.doctor_id = d.id AND dl.is_primary = true
		LEFT JOIN locations loc ON loc.id = dl.location_id
		WHERE dse.embedding IS NOT NULL
		AND (${locationFilter}::text IS NULL OR d.primary_location ILIKE '%' || ${locationFilter} || '%')
		AND (${onlyAccepting}::boolean IS NULL OR d.accepting_new_patients = true)
		ORDER BY dse.embedding <=> ${vectorLiteral}::vector
		LIMIT ${limit}
	`;
}
