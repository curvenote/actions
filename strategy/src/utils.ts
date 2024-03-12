import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';

export function booleanOrLabels(value: string): boolean | string[] {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return value.split(',').map((s) => s.trim());
}

export function getIntersection(a: string[], b: string[]) {
  const setA = new Set(a);
  const intersect = new Set();
  b.forEach((v) => {
    if (setA.has(v)) intersect.add(v);
  });
  return intersect;
}

export function hasIntersection(a: string[], b: string[]) {
  return getIntersection(a, b).size > 0;
}

const readdir = promisify(fs.readdir);

export async function resolvePaths(baseDir: string, pattern: string): Promise<string[]> {
  const paths: string[] = [];
  const patterns = pattern
    .split(',')
    .map((p) => p.trim())
    .filter((p) => !!p); // Split and trim the pattern
  for (const p of patterns) {
    if (p.endsWith('/*') || p === '*') {
      // Check if pattern ends with /*
      const dirPath = path.join(baseDir, p.replace(/\/?\*$/, '')); // Remove '/*' or '*' and prepare dir path
      try {
        const entries = await readdir(dirPath, { withFileTypes: true });
        // Filter for directories and map to full path
        entries.forEach((entry) => {
          if (!entry.name.startsWith('.') && !entry.name.startsWith('_') && entry.isDirectory()) {
            paths.push(path.join(dirPath, entry.name));
          }
        });
      } catch (error) {
        console.error(`Error reading directory ${dirPath}: ${error}`);
      }
    } else if (p.includes('*')) {
      throw new Error('Only simple glob patterns ending with `/*` or `*` are supported.');
    } else {
      // Check if the specific path is a directory and add it
      try {
        const stat = await fs.promises.stat(path.join(baseDir, p));
        if (stat.isDirectory()) {
          paths.push(path.join(baseDir, p));
        }
      } catch (error) {
        console.error(`Error accessing path ${p}: ${error}`);
      }
    }
  }

  return paths;
}

/**
 * Filter the paths by the changed files, and mention any unknown changed files.
 *
 * @param paths The directories that are expected to have changes in them
 * @param changedFiles The list of changed files
 * @returns
 *   `filteredPaths`: Paths from your input that have corresponding changes in changedFiles.
 *   `unknownChangedFiles`: Files that were changed but don't fall under the directories specified by your paths input.
 */
export function filterPathsAndIdentifyUnknownChanges(
  paths: string[],
  changedFiles: string[],
): { filteredPaths: string[]; unknownChangedFiles: string[] } {
  // Extract base paths from changedFiles
  const basePaths = changedFiles.map((file) => {
    const parts = file.split('/');
    parts.pop(); // Remove the file name, keep the directory path
    return parts.join('/'); // Rejoin to form the base path
  });

  // Deduplicate basePaths
  const uniqueBasePaths = Array.from(new Set(basePaths));

  // Filter paths that are included in the basePaths from changedFiles
  const filteredPaths = paths.filter((p) =>
    uniqueBasePaths.some((basePath) => p.startsWith(basePath)),
  );

  // Identify changed files that are outside the specified paths
  const unknownChangedFiles = changedFiles.filter((file) => {
    // Check if this file's base path does not start with any of the paths
    return !paths.some((p) => file.startsWith(p));
  });

  return { filteredPaths, unknownChangedFiles };
}
