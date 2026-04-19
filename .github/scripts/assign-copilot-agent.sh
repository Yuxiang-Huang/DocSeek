#!/usr/bin/env bash
set -euo pipefail

ISSUE_NUM="${1:?issue number required}"
INSTRUCTIONS_FILE="${2:?instructions file required}"

: "${GH_TOKEN:?GH_TOKEN is required}"
: "${OWNER:?OWNER is required}"
: "${REPO_NAME:?REPO_NAME is required}"

BOT_ID=$(gh api graphql \
  -H "GraphQL-Features: issues_copilot_assignment_api_support" \
  -f query='
    query($owner: String!, $repo: String!) {
      repository(owner: $owner, name: $repo) {
        suggestedActors(capabilities: [CAN_BE_ASSIGNED], first: 100) {
          nodes {
            login
            ... on Bot { id }
          }
        }
      }
    }' \
  -f owner="${OWNER}" \
  -f repo="${REPO_NAME}" \
  --jq '.data.repository.suggestedActors.nodes[]
        | select(.login == "copilot-swe-agent") | .id')

if [ -z "${BOT_ID}" ]; then
  echo "ERROR: copilot-swe-agent not found in suggestedActors."
  exit 1
fi

ISSUE_NODE_ID=$(gh api graphql \
  -f query='
    query($owner: String!, $repo: String!, $number: Int!) {
      repository(owner: $owner, name: $repo) {
        issue(number: $number) { id }
      }
    }' \
  -f owner="${OWNER}" \
  -f repo="${REPO_NAME}" \
  -F number="${ISSUE_NUM}" \
  --jq '.data.repository.issue.id')

INSTRUCTIONS=$(tr '\n' ' ' < "${INSTRUCTIONS_FILE}")

gh api graphql \
  -H "GraphQL-Features: issues_copilot_assignment_api_support,coding_agent_model_selection" \
  -f query='
    mutation($issueId: ID!, $botIds: [ID!]!, $instructions: String!) {
      updateIssue(input: {
        id: $issueId,
        assigneeIds: $botIds,
        agentAssignment: {
          customInstructions: $instructions
        }
      }) {
        issue { number }
      }
    }' \
  -f issueId="${ISSUE_NODE_ID}" \
  -F botIds[]="${BOT_ID}" \
  -f instructions="${INSTRUCTIONS}"

echo "Copilot assigned to issue #${ISSUE_NUM}."
