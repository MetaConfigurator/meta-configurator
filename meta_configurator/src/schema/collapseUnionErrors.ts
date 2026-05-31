import type {ErrorObject} from 'ajv';

const UNION_KEYWORDS = new Set(['oneOf', 'anyOf']);

const isUnionSummary = (e: ErrorObject): boolean => UNION_KEYWORDS.has(e.keyword);

type BranchItem = {kind: 'leaf'; message: string} | {kind: 'innerSummary'; index: number};

type Branches = {
  items: Map<number, BranchItem[]>;
  absorbedErrorIndices: Set<number>;
};

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

function branchIndexUnderSummary(error: ErrorObject, summary: ErrorObject): number | undefined {
  const branchPrefix = summary.schemaPath + '/';
  if (!error.schemaPath.startsWith(branchPrefix)) return undefined;

  const branchSeg = error.schemaPath.slice(branchPrefix.length).split('/', 1)[0];
  const branchIdx = Number.parseInt(branchSeg ?? '', 10);
  return Number.isFinite(branchIdx) && branchIdx >= 0 ? branchIdx : undefined;
}

function branchItemFromError(error: ErrorObject, index: number): BranchItem {
  return isUnionSummary(error)
    ? {kind: 'innerSummary', index}
    : {kind: 'leaf', message: error.message ?? 'invalid'};
}

function addBranchItem(
  result: Branches,
  branchIdx: number,
  item: BranchItem,
  absorbedErrorIdx: number
): void {
  appendTo(result.items, branchIdx, item);
  result.absorbedErrorIndices.add(absorbedErrorIdx);
}

/**
 * Groups the immediate sub-errors of one summary by branch index. Each sub-error is
 * tagged as either a leaf (a regular schema violation) or an innerSummary (a nested
 * oneOf/anyOf that gets recursed into during formatting).
 */
function branchesOf(
  summaryIdx: number,
  errors: readonly ErrorObject[],
  allSummaryPaths: readonly string[]
): Branches {
  const result: Branches = {items: new Map(), absorbedErrorIndices: new Set()};

  collectSchemaPathBranchErrors(result, summaryIdx, errors, allSummaryPaths);
  collectReferencedBranchErrors(result, summaryIdx, errors, allSummaryPaths);

  return result;
}

function collectSchemaPathBranchErrors(
  result: Branches,
  summaryIdx: number,
  errors: readonly ErrorObject[],
  allSummaryPaths: readonly string[]
): void {
  const summary = errors[summaryIdx]!;

  errors.forEach((e, i) => {
    if (e === summary) return;
    if (isUnderDeeperSummary(e.schemaPath, summary.schemaPath, allSummaryPaths)) return;

    const branchIdx = branchIndexUnderSummary(e, summary);
    if (branchIdx === undefined) return;
    addBranchItem(result, branchIdx, branchItemFromError(e, i), i);
  });
}

function collectReferencedBranchErrors(
  result: Branches,
  summaryIdx: number,
  errors: readonly ErrorObject[],
  allSummaryPaths: readonly string[]
): void {
  const referencedErrors = referencedBranchErrorIndices(summaryIdx, errors, allSummaryPaths);
  if (referencedErrors.length === 0) return;

  const branchIdx = nextBranchIndex(result.items);
  for (const errorIdx of referencedErrors) {
    const error = errors[errorIdx]!;
    addBranchItem(result, branchIdx, {kind: 'leaf', message: error.message ?? 'invalid'}, errorIdx);
  }
}

function nextBranchIndex(branches: Map<number, BranchItem[]>): number {
  return branches.size > 0 ? Math.max(...branches.keys()) + 1 : 0;
}

function referencedBranchErrorIndices(
  summaryIdx: number,
  errors: readonly ErrorObject[],
  allSummaryPaths: readonly string[]
): number[] {
  const summary = errors[summaryIdx]!;
  const branchPrefix = summary.schemaPath + '/';
  const result: number[] = [];

  for (let i = summaryIdx - 1; i >= 0; i--) {
    const error = errors[i]!;

    if (error.instancePath !== summary.instancePath) break;
    if (isUnionSummary(error)) break;
    if (error.schemaPath.startsWith(branchPrefix)) continue;
    if (allSummaryPaths.some(p => error.schemaPath.startsWith(p + '/'))) break;

    result.unshift(i);
  }

  return result;
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
  const branches = branchesOf(summaryIdx, errors, allSummaryPaths).items;

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
    .map(it => it.message)
    .filter((message, index, messages) => messages.indexOf(message) === index);
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
 * message walks the variant tree with hierarchical numbering ("variant 1.2.1").
 * The originating oneOf/anyOf keyword is preserved at every level. The function is
 * idempotent.
 */
export function collapseUnionErrors(errors: ErrorObject[]): ErrorObject[] {
  const summaryIndices: number[] = [];
  errors.forEach((e, i) => {
    if (isUnionSummary(e)) summaryIndices.push(i);
  });
  if (summaryIndices.length === 0) return errors;

  const allSummaryPaths = summaryIndices.map(i => errors[i]!.schemaPath);
  const replacements = new Map<number, ErrorObject>();
  const replacementBranches = new Map<number, Branches>();

  for (const topIdx of topLevelSummaryIndices(summaryIndices, errors)) {
    const summary = errors[topIdx]!;
    const branches = branchesOf(topIdx, errors, allSummaryPaths);
    if (branches.items.size === 0) continue; // nothing to enrich; leave the summary alone
    replacementBranches.set(topIdx, branches);
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
  for (const branches of replacementBranches.values()) {
    for (const i of branches.absorbedErrorIndices) {
      dropped.add(i);
    }
  }

  return errors.map((e, i) => replacements.get(i) ?? e).filter((_, i) => !dropped.has(i));
}
