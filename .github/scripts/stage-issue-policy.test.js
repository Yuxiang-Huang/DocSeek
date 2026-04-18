const assert = require("node:assert/strict");
const test = require("node:test");

const {
	closingIssue,
	marker,
	stageBody,
} = require("./stage-issue-policy");

test("stage body carries the original story content and all stage markers", () => {
	const body = stageBody({
		stage: "implementation",
		parentNumber: "7",
		parentTitle: "Save physicians",
		parentBody: "As a patient, I want to save doctors.",
		implementationIssue: "8",
		testsIssue: "9",
		devSpecIssue: "10",
	});

	assert.equal(marker(body, "docseek-stage"), "implementation");
	assert.equal(marker(body, "docseek-parent-story"), "7");
	assert.equal(marker(body, "docseek-implementation-issue"), "8");
	assert.equal(marker(body, "docseek-tests-issue"), "9");
	assert.equal(marker(body, "docseek-dev-spec-issue"), "10");
	assert.match(body, /As a patient, I want to save doctors\./);
});

test("extracts closing issue references from PR bodies", () => {
	assert.equal(closingIssue("Summary\n\nCloses #42\nRelated to #7"), "42");
});
