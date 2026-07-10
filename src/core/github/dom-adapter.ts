import { computeSHA256, GitHubSelectors } from "./utils";

export class GitHubDomAdapter {
  /**
   * Resolves a potentially partial or mismatched file path to the exact path
   * found in the GitHub DOM (file tree or diff headers).
   */
  static resolvePath(path: string): string {
    if (!path) return path;

    // Normalize slashes and case for robust comparison
    const normalize = (p: string) => {
      let normalized = p.replace(/\\/g, '/');
      if (normalized.startsWith('/')) {
        normalized = normalized.substring(1);
      }
      if (normalized.startsWith('a/') || normalized.startsWith('b/')) {
        normalized = normalized.substring(2);
      }
      return normalized.toLowerCase();
    };

    const normalizedInput = normalize(path);
    if (!normalizedInput) return path;

    // Extract all file paths from diff headers
    const actualPaths = Array.from(document.querySelectorAll('[data-file-path]'))
      .map(el => el.getAttribute('data-file-path'))
      .filter((val): val is string => !!val);

    // Extract all file paths from tree items (fallback)
    const treePaths = Array.from(document.querySelectorAll('li[role="treeitem"][id]'))
      .map(el => el.id)
      .filter(id => !!id);

    const allDomPaths = Array.from(new Set([...actualPaths, ...treePaths]));

    // 1. Exact normalized match
    for (const domPath of allDomPaths) {
      if (normalize(domPath) === normalizedInput) {
        return domPath;
      }
    }

    // 2. Suffix match (e.g. domPath ends with input path or vice-versa)
    for (const domPath of allDomPaths) {
      const normalizedDom = normalize(domPath);
      if (normalizedDom.endsWith(normalizedInput) || normalizedInput.endsWith(normalizedDom)) {
        return domPath;
      }
    }

    return path;
  }

  /**
   * Finds the container element for a given file path.
   */
  static async findFileContainer(path: string): Promise<HTMLElement | null> {
    const resolvedPath = this.resolvePath(path);
    const hash = await computeSHA256(resolvedPath);
    const selector = GitHubSelectors.fileContainer(hash);
    let container = document.querySelector<HTMLElement>(selector);

    if (!container) {
      // Fallback: Check if the file tree exists, maybe it's lazy loaded
      const treeItem = document.querySelector<HTMLElement>(GitHubSelectors.fileTreeItem(resolvedPath));
      if (treeItem) {
        treeItem.click();
      }
    }
    return container;
  }

  /**
   * Finds the exact line cell element (td) for a given path and line number.
   */
  static async findLineElement(path: string, line: number, side: 'right' | 'left' = 'right'): Promise<HTMLElement | null> {
    const container = await this.findFileContainer(path);
    if (!container) return null;

    const selector = side === 'right' 
      ? GitHubSelectors.lineNumberCellRight(line)
      : GitHubSelectors.lineNumberCellLeft(line);
      
    // GitHub's react-diff-view renders the line number and the text in separate cells
    // We return the actual TR containing both.
    let lineNumberCell = container.querySelector<HTMLElement>(selector);
    
    if (!lineNumberCell) {
      return null;
    }
    
    return lineNumberCell.closest('tr'); // Return the entire row
  }

  /**
   * Smoothly scrolls to a specific line in a file.
   */
  static async scrollToLine(path: string, line: number): Promise<boolean> {
    const row = await this.findLineElement(path, line);
    if (!row) {
      // Fallback: If line not found (e.g. collapsed), try scrolling to the file container
      const container = await this.findFileContainer(path);
      if (container) {
        this.centerElement(container);
        return true;
      }
      return false;
    }

    this.centerElement(row);
    return true;
  }

  /**
   * Centers the element vertically in the viewport, accounting for sticky headers and the bottom panel.
   */
  private static centerElement(element: HTMLElement) {
    const rect = element.getBoundingClientRect();
    const absoluteElementTop = rect.top + window.scrollY;
    
    // We have a bottom panel that takes 35vh. 
    // We want to center the code vertically within the remaining 65vh of the screen.
    const availableHeight = window.innerHeight * 0.65;
    const stickyHeaderHeight = 120; // approximate GitHub sticky header
    
    // Calculate the desired scroll position to put the element in the middle of the available viewing area
    const offset = stickyHeaderHeight + (availableHeight / 2) - (rect.height / 2);
    const targetScrollY = Math.max(0, absoluteElementTop - offset);
    
    window.scrollTo({
      top: targetScrollY,
      behavior: 'smooth'
    });
  }

  /**
   * Gets the bounding client rect of a line, ensuring we track its exact coordinates.
   */
  static async getLineRect(path: string, startLine: number, endLine: number): Promise<DOMRect | null> {
    const startRow = await this.findLineElement(path, startLine);
    if (!startRow) return null;
    
    // If it's a single line, return its rect
    if (startLine === endLine) {
      return startRow.getBoundingClientRect();
    }
    
    // For a range, find the end row and combine rects
    let endRow = await this.findLineElement(path, endLine);
    if (!endRow) {
      // Fallback: search backwards to find the last visible line in the range
      for (let line = endLine - 1; line >= startLine; line--) {
        endRow = await this.findLineElement(path, line);
        if (endRow) break;
      }
    }
    
    if (!endRow) return startRow.getBoundingClientRect();
    
    const startRect = startRow.getBoundingClientRect();
    const endRect = endRow.getBoundingClientRect();
    
    return new DOMRect(
      startRect.left,
      startRect.top,
      Math.max(startRect.width, endRect.width),
      (endRect.bottom - startRect.top)
    );
  }

  /**
   * Gets the bounding client rect of the line number cell specifically.
   */
  static async getLineNumberRect(path: string, line: number, side: 'right' | 'left' = 'right'): Promise<DOMRect | null> {
    const container = await this.findFileContainer(path);
    if (!container) return null;

    const selector = side === 'right' 
      ? GitHubSelectors.lineNumberCellRight(line)
      : GitHubSelectors.lineNumberCellLeft(line);
      
    const lineNumberCell = container.querySelector<HTMLElement>(selector);
    
    if (!lineNumberCell) {
      return null;
    }
    
    return lineNumberCell.getBoundingClientRect();
  }

  /**
   * Finds the exact DOM Ranges for a text snippet spanning multiple elements.
   * This is used by the modern Custom Highlight API.
   */
  static async getSnippetRanges(path: string, startLine: number, endLine: number, snippet: string): Promise<Range[]> {
    if (!snippet) return [];
    
    let result = await this.searchSnippetRanges(path, startLine, endLine, snippet);
    if (result.length > 0) return result;

    // Fallback 1: Expand search radius by 20 lines to account for LLM hallucinations
    const expandedStart = Math.max(1, startLine - 20);
    const expandedEnd = endLine + 20;
    result = await this.searchSnippetRanges(path, expandedStart, expandedEnd, snippet);
    if (result.length > 0) return result;
    
    // Fallback 2: If we couldn't find the exact snippet, we can create a range that wraps the entire line
    try {
      const fallbackRow = await this.findLineElement(path, startLine);
      if (fallbackRow) {
        const container = fallbackRow.querySelector('.diff-text-inner') || 
                          fallbackRow.querySelector('.blob-code-inner') || 
                          fallbackRow.querySelector('.diff-text') || 
                          fallbackRow.querySelector('.blob-code');
        if (container) {
          const range = document.createRange();
          range.selectNodeContents(container);
          return [range];
        }
      }
    } catch (e) {
      console.error("Fallback range error:", e);
    }
    
    return [];
  }

  private static async searchSnippetRanges(path: string, startLine: number, endLine: number, snippet: string): Promise<Range[]> {
    const normalizeText = (t: string) => t.replace(/[\s\u200B-\u200D\uFEFF]+/g, '');
    const noSpaceSnippet = normalizeText(snippet);
    const nodes: { node: Node, start: number, end: number }[] = [];
    let fullText = "";

    for (let line = startLine; line <= endLine; line++) {
      const row = await this.findLineElement(path, line);
      if (!row) continue;
      
      const codeContainer = row.querySelector('.diff-text-inner') || 
                            row.querySelector('.blob-code-inner') || 
                            row.querySelector('.diff-text') || 
                            row.querySelector('.blob-code');
      if (!codeContainer) continue;

      const walker = document.createTreeWalker(codeContainer, NodeFilter.SHOW_TEXT, null);
      let node;
      while ((node = walker.nextNode())) {
        const text = node.nodeValue || "";
        nodes.push({ node, start: fullText.length, end: fullText.length + text.length });
        fullText += text;
      }
      
      // Append a newline character between lines to keep word separation
      fullText += "\n";
    }
    
    let noSpaceFullText = "";
    const indexMap: number[] = [];
    
    for (let i = 0; i < fullText.length; i++) {
      if (!/[\s\u200B-\u200D\uFEFF]/.test(fullText[i])) {
        noSpaceFullText += fullText[i];
        indexMap.push(i);
      }
    }
    
    let noSpaceStartIndex = noSpaceFullText.indexOf(noSpaceSnippet);
    if (noSpaceStartIndex === -1) {
      noSpaceStartIndex = noSpaceFullText.toLowerCase().indexOf(noSpaceSnippet.toLowerCase());
    }
    
    // Fallback: Ultra-robust alphanumeric match (ignores punctuation, slashes, quotes, etc.)
    if (noSpaceStartIndex === -1) {
      const alphaSnippet = noSpaceSnippet.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
      if (alphaSnippet.length > 5) { // Only do this if we have a reasonable amount of text
        let alphaFullText = "";
        const alphaIndexMap: number[] = [];
        for (let i = 0; i < noSpaceFullText.length; i++) {
          if (/[a-zA-Z0-9]/.test(noSpaceFullText[i])) {
            alphaFullText += noSpaceFullText[i].toLowerCase();
            alphaIndexMap.push(i);
          }
        }
        
        const alphaStartIndex = alphaFullText.indexOf(alphaSnippet);
        if (alphaStartIndex !== -1) {
          noSpaceStartIndex = alphaIndexMap[alphaStartIndex];
        }
      }
    }
    
    if (noSpaceStartIndex !== -1) {
      const startIndex = indexMap[noSpaceStartIndex];
      const lastCharIndex = noSpaceStartIndex + noSpaceSnippet.length - 1;
      const endIndex = indexMap[lastCharIndex] + 1;
      
      const startNodeInfo = nodes.find(n => startIndex >= n.start && startIndex < n.end);
      const endNodeInfo = nodes.find(n => endIndex > n.start && endIndex <= n.end);
      
      if (startNodeInfo && endNodeInfo) {
        try {
          const range = document.createRange();
          range.setStart(startNodeInfo.node, startIndex - startNodeInfo.start);
          
          const endOffset = endIndex - endNodeInfo.start;
          const maxEndOffset = endNodeInfo.node.nodeValue?.length || 0;
          range.setEnd(endNodeInfo.node, Math.min(endOffset, maxEndOffset));
          
          return [range];
        } catch (e) {
          console.error("Range error:", e);
        }
      }
    }
    return [];
  }

  /**
   * Finds the exact line number where a text snippet is located within the step bounds.
   */
  static async getSnippetLine(path: string, startLine: number, endLine: number, snippet: string): Promise<number | null> {
    if (!snippet) return null;
    
    let result = await this.searchSnippetLine(path, startLine, endLine, snippet);
    if (result !== null) return result;

    // Fallback: Expand search radius by 20 lines to account for LLM hallucinations
    const expandedStart = Math.max(1, startLine - 20);
    const expandedEnd = endLine + 20;
    result = await this.searchSnippetLine(path, expandedStart, expandedEnd, snippet);
    if (result !== null) return result;

    return startLine; // Fallback to startLine if not found
  }

  private static async searchSnippetLine(path: string, startLine: number, endLine: number, snippet: string): Promise<number | null> {
    const normalizeText = (t: string) => t.replace(/[\s\u200B-\u200D\uFEFF]+/g, '');
    const noSpaceSnippet = normalizeText(snippet);
    let fullText = "";
    const lineMap: { startIndex: number, endIndex: number, line: number }[] = [];

    for (let line = startLine; line <= endLine; line++) {
      const row = await this.findLineElement(path, line);
      if (!row) continue;
      
      const codeContainer = row.querySelector('.diff-text-inner') || 
                            row.querySelector('.blob-code-inner') || 
                            row.querySelector('.diff-text') || 
                            row.querySelector('.blob-code');
      if (!codeContainer) continue;

      const lineStart = fullText.length;
      
      const walker = document.createTreeWalker(codeContainer, NodeFilter.SHOW_TEXT, null);
      let node;
      while ((node = walker.nextNode())) {
        fullText += node.nodeValue || "";
      }
      fullText += "\n";
      
      lineMap.push({ startIndex: lineStart, endIndex: fullText.length, line });
    }
    
    let noSpaceFullText = "";
    const indexMap: number[] = [];
    
    for (let i = 0; i < fullText.length; i++) {
      if (!/[\s\u200B-\u200D\uFEFF]/.test(fullText[i])) {
        noSpaceFullText += fullText[i];
        indexMap.push(i);
      }
    }
    
    let noSpaceStartIndex = noSpaceFullText.indexOf(noSpaceSnippet);
    if (noSpaceStartIndex === -1) {
      noSpaceStartIndex = noSpaceFullText.toLowerCase().indexOf(noSpaceSnippet.toLowerCase());
    }
    
    // Fallback: Ultra-robust alphanumeric match (ignores punctuation, slashes, quotes, etc.)
    if (noSpaceStartIndex === -1) {
      const alphaSnippet = noSpaceSnippet.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
      if (alphaSnippet.length > 5) { // Only do this if we have a reasonable amount of text
        let alphaFullText = "";
        const alphaIndexMap: number[] = [];
        for (let i = 0; i < noSpaceFullText.length; i++) {
          if (/[a-zA-Z0-9]/.test(noSpaceFullText[i])) {
            alphaFullText += noSpaceFullText[i].toLowerCase();
            alphaIndexMap.push(i);
          }
        }
        
        const alphaStartIndex = alphaFullText.indexOf(alphaSnippet);
        if (alphaStartIndex !== -1) {
          noSpaceStartIndex = alphaIndexMap[alphaStartIndex];
        }
      }
    }
    
    if (noSpaceStartIndex !== -1) {
      const startIndex = indexMap[noSpaceStartIndex];
      
      const lineInfo = lineMap.find(m => startIndex >= m.startIndex && startIndex < m.endIndex);
      if (lineInfo) {
        return lineInfo.line;
      }
    }
    return null;
  }
}
