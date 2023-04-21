import { normalize } from 'pathe';
import cac from 'cac';
import c from 'picocolors';
import { v as version, s as startVitest, d as divider } from './vendor-cli-api.70680cd5.js';
import './vendor-constants.538d9b49.js';
import './vendor-coverage.a585b712.js';
import './vendor-index.75f2b63d.js';
import 'node:console';
import 'local-pkg';
import './vendor-index.fad2598b.js';
import 'std-env';
import '@vitest/runner/utils';
import '@vitest/utils';
import './vendor-global.6795f91f.js';
import 'vite';
import 'node:path';
import 'node:url';
import 'node:process';
import 'node:fs';
import 'path';
import 'os';
import 'util';
import 'stream';
import 'events';
import 'fs';
import './vendor-_commonjsHelpers.76cdd49e.js';
import 'vite-node/utils';
import 'vite-node/client';
import '@vitest/snapshot/manager';
import './vendor-paths.84fc7a99.js';
import 'node:v8';
import 'node:child_process';
import './vendor-index.7dcbfa46.js';
import 'node:worker_threads';
import 'node:os';
import 'tinypool';
import 'node:perf_hooks';
import './vendor-tasks.042d6084.js';
import 'node:module';
import 'node:crypto';
import './vendor-index.c1e09929.js';
import 'node:buffer';
import 'child_process';
import 'assert';
import 'buffer';
import 'node:util';
import 'node:fs/promises';
import 'source-map';
import 'module';
import 'acorn';
import 'acorn-walk';
import 'magic-string';
import 'strip-literal';
import 'vite-node/server';
import 'node:readline';
import 'readline';

const cli = cac("vitest");
cli.version(version).option("-r, --root <path>", "Root path").option("-c, --config <path>", "Path to config file").option("-u, --update", "Update snapshot").option("-w, --watch", "Enable watch mode").option("-t, --testNamePattern <pattern>", "Run tests with full names matching the specified regexp pattern").option("--dir <path>", "Base directory to scan for the test files").option("--ui", "Enable UI").option("--open", "Open UI automatically (default: !process.env.CI))").option("--api [api]", "Serve API, available options: --api.port <port>, --api.host [host] and --api.strictPort").option("--threads", "Enabled threads (default: true)").option("--single-thread", "Run tests inside a single thread, requires --threads (default: false)").option("--silent", "Silent console output from tests").option("--isolate", "Isolate environment for each test file (default: true)").option("--reporter <name>", "Specify reporters").option("--outputFile <filename/-s>", "Write test results to a file when supporter reporter is also specified, use cac's dot notation for individual outputs of multiple reporters").option("--coverage", "Enable coverage report").option("--run", "Disable watch mode").option("--mode <name>", "Override Vite mode (default: test)").option("--globals", "Inject apis globally").option("--dom", "Mock browser api with happy-dom").option("--browser [options]", "Run tests in the browser (default: false)").option("--environment <env>", "Specify runner environment, if not running in the browser (default: node)").option("--passWithNoTests", "Pass when no tests found").option("--logHeapUsage", "Show the size of heap for each test").option("--allowOnly", "Allow tests and suites that are marked as only (default: !process.env.CI)").option("--dangerouslyIgnoreUnhandledErrors", "Ignore any unhandled errors that occur").option("--shard <shard>", "Test suite shard to execute in a format of <index>/<count>").option("--changed [since]", "Run tests that are affected by the changed files (default: false)").option("--sequence <options>", "Define in what order to run tests (use --sequence.shuffle to run tests in random order)").option("--segfaultRetry <times>", "Return tests on segment fault (default: 0)", { default: 0 }).option("--no-color", "Removes colors from the console output").option("--inspect", "Enable Node.js inspector").option("--inspect-brk", "Enable Node.js inspector with break").option("--test-timeout <time>", "Default timeout of a test in milliseconds (default: 5000)").help();
cli.command("run [...filters]").action(run);
cli.command("related [...filters]").action(runRelated);
cli.command("watch [...filters]").action(watch);
cli.command("dev [...filters]").action(watch);
cli.command("bench [...filters]").action(benchmark);
cli.command("typecheck [...filters]").action(typecheck);
cli.command("[...filters]").action((filters, options) => start("test", filters, options));
cli.parse();
async function runRelated(relatedFiles, argv) {
  argv.related = relatedFiles;
  argv.passWithNoTests ?? (argv.passWithNoTests = true);
  await start("test", [], argv);
}
async function watch(cliFilters, options) {
  options.watch = true;
  await start("test", cliFilters, options);
}
async function run(cliFilters, options) {
  options.run = true;
  await start("test", cliFilters, options);
}
async function benchmark(cliFilters, options) {
  console.warn(c.yellow("Benchmarking is an experimental feature.\nBreaking changes might not follow semver, please pin Vitest's version when using it."));
  await start("benchmark", cliFilters, options);
}
async function typecheck(cliFilters = [], options = {}) {
  console.warn(c.yellow("Testing types with tsc and vue-tsc is an experimental feature.\nBreaking changes might not follow semver, please pin Vitest's version when using it."));
  await start("typecheck", cliFilters, options);
}
function normalizeCliOptions(argv) {
  if (argv.root)
    argv.root = normalize(argv.root);
  else
    delete argv.root;
  if (argv.config)
    argv.config = normalize(argv.config);
  else
    delete argv.config;
  if (argv.dir)
    argv.dir = normalize(argv.dir);
  else
    delete argv.dir;
  return argv;
}
async function start(mode, cliFilters, options) {
  try {
    const ctx = await startVitest(mode, cliFilters.map(normalize), normalizeCliOptions(options));
    if (!(ctx == null ? void 0 : ctx.shouldKeepServer()))
      await (ctx == null ? void 0 : ctx.exit());
    return ctx;
  } catch (e) {
    console.error(`
${c.red(divider(c.bold(c.inverse(" Unhandled Error "))))}`);
    console.error(e);
    console.error("\n\n");
    process.exit(1);
  }
}
