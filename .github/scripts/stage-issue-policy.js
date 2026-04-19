#!/usr/bin/env node

const fs = require("node:fs");

const STAGES = {
	implementation: {
		titlePrefix: "Implementation",
	},
	tests: {
		titlePrefix: "Tests",
	},
	"dev-spec": {
		titlePrefix: "Dev spec",
	},
};

function getArg(name) {
	const prefix = `--${name}=`;
	const inline = process.argv.find((arg) => arg.startsWith(prefix));
	if (inline) {
		return inline.slice(prefix.length);
	}

	const index = process.argv.indexOf(`--${name}`);
	return index === -1 ? "" : process.argv[index + 1] || "";
}

function readFileArg(name) {
	const file = getArg(name);
	return file && fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
}

function stageBody({
	stage,
	parentNumber,
	parentTitle,
	parentBody,
	implementationIssue,
	testsIssue,
	devSpecIssue,
}) {
	const stageName = STAGES[stage]?.titlePrefix || "Stage";
	return `<!-- docseek-stage: ${stage} -->
<!-- docseek-parent-story: ${parentNumber} -->
<!-- docseek-implementation-issue: ${implementationIssue} -->
<!-- docseek-tests-issue: ${testsIssue} -->
<!-- docseek-dev-spec-issue: ${devSpecIssue} -->

## ${stageName} stage

Parent user story: #${parentNumber}

Stage issues:
- Implementation: #${implementationIssue}
- Tests: #${testsIssue}
- Dev spec: #${devSpecIssue}

## Original user story

### Title

${parentTitle}

### Body

${parentBody || "_No body provided._"}

## Stage task

${stageTask(stage)}
`;
}

function stageTask(stage) {
	if (stage === "implementation") {
		return [
			"Implement only the original user story acceptance criteria.",
			"Do not add or modify tests or docs.",
			"Open a PR from the deterministic implementation branch and close this stage issue.",
		].join("\n");
	}

	if (stage === "tests") {
		return [
			"Add automated tests for the merged implementation PR.",
			"Do not modify implementation code except where a test exposes a required fix.",
			"Open a PR from the deterministic tests branch and close this stage issue.",
		].join("\n");
	}

	return [
		"Write or update the development specification for the original user story.",
		"Use the merged implementation and tests as context.",
		"Open a PR from the deterministic dev-spec branch and close this stage issue.",
	].join("\n");
}

function main() {
	const command = process.argv[2];

	if (command === "body") {
		const body = stageBody({
			stage: getArg("stage"),
			parentNumber: getArg("parent-number"),
			parentTitle: getArg("parent-title"),
			parentBody: readFileArg("parent-body-file"),
			implementationIssue: getArg("implementation-issue"),
			testsIssue: getArg("tests-issue"),
			devSpecIssue: getArg("dev-spec-issue"),
		});
		fs.writeFileSync(getArg("output-file"), body);
		return;
	}
}

if (require.main === module) {
	main();
}

module.exports = {
	stageBody,
};
