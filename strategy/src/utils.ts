import * as fs from 'fs';
import * as path from 'path';
import yaml from 'js-yaml';
import { promisify } from 'util';

export function booleanOrLabels(value: string | boolean): boolean | string[] {
  if (value === 'true' || value === true) return true;
  if (value === 'false' || value === false) return false;
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

function loadConfig(p: string) {
  const config = [path.join(p, 'myst.yml'), path.join(p, 'curvenote.yml')].find((yml) =>
    fs.existsSync(yml),
  );
  if (!config) return null;
  const data = fs.readFileSync(config).toString();
  try {
    return yaml.load(data) as { project?: { id?: string } };
  } catch (error) {
    console.error(`Problem loading config file at: ${config}`);
  }
  return null;
}

type PathIds = Record<string, string | null>;

export function getIdsFromPaths(paths: string[]): PathIds {
  return Object.fromEntries(
    paths.map((p) => {
      const data = loadConfig(p);
      if (!data?.project?.id) return [p, null];
      return [p, data.project.id];
    }),
  );
}

export function ensureUniqueAndValidIds(pathIds: PathIds): boolean {
  const idsValid = Object.entries(pathIds).reduce((allValid, [p, id]) => {
    const valid = !!id && !!id.match(/^([a-zA-Z0-9_-]+)$/);
    if (!valid) {
      console.error(
        `Invalid id for path "${p}" (ID: \`${id}\`):\n - Must not be null or empty\n - Only includes "a-z A-Z 0-9 - _"`,
      );
    }
    return allValid && valid;
  }, true);

  // Early return if any ID is invalid
  if (!idsValid) return false;

  // Check for duplicate IDs
  const ids = Object.values(pathIds) as string[];
  const idCounts = ids.reduce(
    (acc, id) => {
      acc[id] = (acc[id] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const duplicates = Object.entries(idCounts).filter(([, count]) => count > 1);

  if (duplicates.length > 0) {
    duplicates.forEach(([id]) => {
      console.error(`The id "${id}" is repeated.`);
    });
    return false; // Indicate error due to duplicates
  }

  // If we reach here, all IDs are valid and unique
  return true;
}
