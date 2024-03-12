import { describe, expect, it, vi, beforeEach } from 'vitest';
import memfs from 'memfs';
import {
  booleanOrLabels,
  hasIntersection,
  getIntersection,
  resolvePaths,
  filterPathsAndIdentifyUnknownChanges,
} from './utils.js';

vi.mock('fs', () => memfs.fs);

beforeEach(() => memfs.vol.reset());

describe('utility tests', () => {
  it('getIntersection', () => {
    expect(getIntersection(['a', 'b'], ['b', 'c'])).toEqual(new Set(['b']));
  });
  it('hasIntersection', () => {
    expect(hasIntersection(['a', 'b'], ['b', 'c'])).toBe(true);
    expect(hasIntersection(['a', 'b'], ['x', 'c'])).toBe(false);
  });
  it('booleanOrLabels', () => {
    expect(booleanOrLabels('true')).toBe(true);
    expect(booleanOrLabels('one, two')).toEqual(['one', 'two']);
  });
  it('resolvePaths', async () => {
    memfs.vol.fromJSON({
      'papers/.git/blah.bin': '',
      'papers/_build/blah.bin': '',
      'papers/paper-1/x.tex': '',
      'papers/paper-2/x.tex': '',
      'posters/poster-1/x.tex': '',
      'posters/poster-2/x.tex': '',
      'another/deep/folder/x.tex': '',
    });
    expect(await resolvePaths('.', 'papers/*')).toEqual(['papers/paper-1', 'papers/paper-2']);
    expect(await resolvePaths('.', 'papers/*, another/deep/folder, papers/_build')).toEqual([
      'papers/paper-1',
      'papers/paper-2',
      'another/deep/folder',
      'papers/_build', // Can explicitly add ignored folders
    ]);
    expect(await resolvePaths('posters', '*')).toEqual(['posters/poster-1', 'posters/poster-2']);
    expect(await resolvePaths('posters', '*')).toEqual(['posters/poster-1', 'posters/poster-2']);
  });

  it('filterPathsAndIdentifyUnknownChanges', () => {
    expect(
      filterPathsAndIdentifyUnknownChanges(
        ['posters/poster-1', 'posters/poster-2'],
        ['posters/poster-1/temp.tex'],
      ),
    ).toEqual({
      filteredPaths: ['posters/poster-1'],
      unknownChangedFiles: [],
    });
    expect(
      filterPathsAndIdentifyUnknownChanges(
        ['posters/poster-1', 'posters/poster-2'],
        ['posters/poster-1/temp.tex', 'posters/poster-2/temp.tex', '.git/temp.bin'],
      ),
    ).toEqual({
      filteredPaths: ['posters/poster-1', 'posters/poster-2'],
      unknownChangedFiles: ['.git/temp.bin'],
    });
  });
});
