/**
 * Computes the SHA-256 hash of a string, returning a hex representation.
 * GitHub uses this to generate the diff- IDs for file containers.
 */
export async function computeSHA256(message: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return hashHex;
}

/**
 * Common, stable selectors for the React-based GitHub PR DOM.
 */
export const GitHubSelectors = {
  // Tree view file navigator
  fileTreeItem: (path: string) => `li[role="treeitem"][id="${path}"]`,

  // The actual file diff container
  fileContainer: (hash: string) => `div[id="diff-${hash}"]`,

  // Line number cell on the right side of the diff
  lineNumberCellRight: (line: number) => `td[data-line-number="${line}"][data-diff-side="right"]`,

  // Line number cell on the left side of the diff
  lineNumberCellLeft: (line: number) => `td[data-line-number="${line}"][data-diff-side="left"]`,

  // The text cell for a specific line
  lineTextCell: (hash: string, line: number, side: 'L' | 'R' = 'R') =>
    `td[data-line-anchor="diff-${hash}${side}${line}"]`,

  // The button to expand a diff chunk
  expandButton: 'button.ExpandableHunkHeaderDiffLine-module__expand-button-line__Nw5Pq, button[aria-label^="Expand"]'
};
