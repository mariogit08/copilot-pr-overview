import { Octokit } from "@octokit/rest";
import { PRContext } from "../types";

export const buildPRContext = async (
  owner: string, 
  repo: string, 
  pullNumber: number,
  token?: string
): Promise<PRContext> => {
  const octokit = new Octokit({ auth: token });
  
  const { data: pr } = await octokit.pulls.get({
    owner,
    repo,
    pull_number: pullNumber,
  });

  const { data: diff } = await octokit.pulls.get({
    owner,
    repo,
    pull_number: pullNumber,
    headers: {
      accept: "application/vnd.github.v3.diff",
    },
  });

  const rawDiff = typeof diff === 'string' ? diff : '';
  
  // Basic heuristic-based extraction for context enrichment
  const addedEndpoints = Array.from(new Set(rawDiff.match(/\+.*(app\.get|router\.post|@GetMapping|@PostMapping)/g) || [])).slice(0, 10);
  const dbChanges = Array.from(new Set(rawDiff.match(/\+.*(CREATE TABLE|ALTER TABLE|migration)/gi) || [])).slice(0, 10);

  // Simple compression: truncate long diffs to avoid token limits
  let compressedDiff = rawDiff;
  const MAX_DIFF_LENGTH = 12000;
  if (compressedDiff.length > MAX_DIFF_LENGTH) {
    compressedDiff = compressedDiff.substring(0, MAX_DIFF_LENGTH) + "\n...[Diff Truncated]...";
  }

  return {
    owner,
    repo,
    pullNumber,
    title: pr.title,
    description: pr.body || "No description provided.",
    latestCommitSha: pr.head.sha,
    diffStats: {
      addedEndpoints,
      removedEndpoints: [],
      dbChanges,
      configChanges: []
    },
    compressedDiff
  };
};
