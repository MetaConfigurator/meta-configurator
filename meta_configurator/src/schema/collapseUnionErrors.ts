import type {ErrorObject} from 'ajv';

const UNION_KEYWORDS = new Set(['oneOf', 'anyOf']);

const isUnionSummary = (e: ErrorObject): boolean => UNION_KEYWORDS.has(e.keyword);

type BranchItem = {kind: 'leaf'; message: string} | {kind: 'innerSummary'; index: number};

/**
 * True when `errorPath` sits inside another summary that is itself nested strictly
 * inside `outerSummaryPath`. Used to skip errors that belong to a deeper summary and
 * will be picked up when we recurse into that deeper summary instead.
 */
function isUnderDeeperSummary(
  errorPath: string,
  outerSummaryPath: string,
  allSummaryPaths: readonly string[]
): boolean {
  return allSummaryPaths.some(
    p =>
      p !== outerSummaryPath &&
      p.startsWith(outerSummaryPath + '/') &&
      errorPath.startsWith(p + '/')
  );
}

/**
 * Groups the immediate sub-errors of one summary by branch index. Each sub-error is
 * tagged as either a leaf (a regular schema violation) or an innerSummary (a nested
 * oneOf/anyOf that gets recursed into during formatting).
 */
function directBranchesOf(
  summary: ErrorObject,
  errors: readonly ErrorObject[],
  allSummaryPaths: readonly string[]
): Map<number, BranchItem[]> {
  const branchPrefix = summary.schemaPath + '/';
  const branches = new Map<number, BranchItem[]>();

  errors.forEach((e, i) => {
    if (e === summary) return;
    if (!e.schemaPath.startsWith(branchPrefix)) return;
    if (isUnderDeeperSummary(e.schemaPath, summary.schemaPath, allSummaryPaths)) return;

    const branchSeg = e.schemaPath.slice(branchPrefix.length).split('/', 1)[0];
    if (branchSeg === undefined) return;
    const branchIdx = Number.parseInt(branchSeg, 10);
    if (!Number.isFinite(branchIdx) || branchIdx < 0) return;

    const item: BranchItem = isUnionSummary(e)
      ? {kind: 'innerSummary', index: i}
      : {kind: 'leaf', message: e.message ?? 'invalid'};
    appendTo(branches, branchIdx, item);
  });

  return branches;
}

function appendTo<K, V>(map: Map<K, V[]>, key: K, value: V): void {
  let bucket = map.get(key);
  if (!bucket) {
    bucket = [];
    map.set(key, bucket);
  }
  bucket.push(value);
}

const INDENT_STEP = '  ';
const BULLET_PREFIX = '  • '; // one level of indent followed by the bullet character

/** Indents every line of the given multi-line text by one level. */
function indent(text: string): string {
  return text
    .split('\n')
    .map(line => INDENT_STEP + line)
    .join('\n');
}

/**
 * Recursively formats one summary as a multi-line tree of bullet points. Each branch
 * becomes one bullet labelled "variant <hierarchicalNumber>: ..."; a branch that
 * contains an inner summary embeds the inner summary's header on the same bullet line
 * and indents its own bullets one level deeper. The originating oneOf/anyOf keyword
 * is preserved at every level.
 */
function formatSummary(
  summaryIdx: number,
  numberingPrefix: string,
  errors: readonly ErrorObject[],
  allSummaryPaths: readonly string[]
): string {
  const summary = errors[summaryIdx]!;
  const branches = directBranchesOf(summary, errors, allSummaryPaths);

  const bulletLines: string[] = [];
  for (const [branchIdx, items] of [...branches.entries()].sort(([a], [b]) => a - b)) {
    const variantLabel = `variant ${numberingPrefix}${branchIdx + 1}`;
    bulletLines.push(...formatBranchBullets(variantLabel, items, errors, allSummaryPaths));
  }

  return [`does not match any ${summary.keyword} variant:`, ...bulletLines].join('\n');
}

/**
 * Returns the bullet lines that represent one branch of a summary. A branch may
 * contribute a single leaf bullet (joining any multi-keyword failures with "; ") and/or
 * one bullet per inner summary it contains.
 */
function formatBranchBullets(
  variantLabel: string,
  items: readonly BranchItem[],
  errors: readonly ErrorObject[],
  allSummaryPaths: readonly string[]
): string[] {
  const bullets: string[] = [];
  const leafMessages = items
    .filter((it): it is Extract<BranchItem, {kind: 'leaf'}> => it.kind === 'leaf')
    .map(it => it.message);
  if (leafMessages.length > 0) {
    bullets.push(`${BULLET_PREFIX}${variantLabel}: ${leafMessages.join('; ')}`);
  }
  for (const item of items) {
    if (item.kind !== 'innerSummary') continue;
    const innerNumbering = variantLabel.replace(/^variant /, '') + '.';
    const innerText = formatSummary(item.index, innerNumbering, errors, allSummaryPaths);
    const [innerHeader, ...innerBody] = innerText.split('\n');
    bullets.push(`${BULLET_PREFIX}${variantLabel}: ${innerHeader}`);
    for (const line of innerBody) bullets.push(indent(line));
  }
  return bullets;
}

/**
 * The subset of summaries that are not nested inside any other union summary.
 * Each top-level summary becomes one annotation; everything underneath is absorbed.
 */
function topLevelSummaryIndices(
  summaryIndices: readonly number[],
  errors: readonly ErrorObject[]
): number[] {
  const allPaths = summaryIndices.map(i => errors[i]!.schemaPath);
  return summaryIndices.filter(i => {
    const path = errors[i]!.schemaPath;
    return !allPaths.some(p => p !== path && path.startsWith(p + '/'));
  });
}

/**
 * Collapses each oneOf/anyOf cluster of AJV errors into a single summary error whose
 * message walks the variant tree with hierarchical numbering ("variant 1.2.1") and
 * parentheses delimiting each nested union, with the originating oneOf/anyOf keyword
 * preserved at every level. The function is idempotent.
 */
export function collapseUnionErrors(errors: ErrorObject[]): ErrorObject[] {
  const summaryIndices: number[] = [];
  errors.forEach((e, i) => {
    if (isUnionSummary(e)) summaryIndices.push(i);
  });
  if (summaryIndices.length === 0) return errors;

  const allSummaryPaths = summaryIndices.map(i => errors[i]!.schemaPath);
  const replacements = new Map<number, ErrorObject>();

  for (const topIdx of topLevelSummaryIndices(summaryIndices, errors)) {
    const summary = errors[topIdx]!;
    const branches = directBranchesOf(summary, errors, allSummaryPaths);
    if (branches.size === 0) continue; // nothing to enrich; leave the summary alone
    replacements.set(topIdx, {
      ...summary,
      message: formatSummary(topIdx, '', errors, allSummaryPaths),
    });
  }

  if (replacements.size === 0) return errors;

  // anything strictly inside a replaced top-level summary is absorbed and dropped
  const replacedPathPrefixes = [...replacements.keys()].map(i => errors[i]!.schemaPath + '/');
  const dropped = new Set<number>();
  errors.forEach((e, i) => {
    if (replacements.has(i)) return;
    if (replacedPathPrefixes.some(p => e.schemaPath.startsWith(p))) dropped.add(i);
  });

  return errors.map((e, i) => replacements.get(i) ?? e).filter((_, i) => !dropped.has(i));
}
