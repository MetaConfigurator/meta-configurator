import { UserConfig as UserConfig$2, ConfigEnv } from 'vite';
export { ConfigEnv, mergeConfig } from 'vite';
import { $ as ResolvedCoverageOptions, q as UserConfig$1, a2 as CoverageC8Options, a3 as CustomProviderOptions, a1 as CoverageIstanbulOptions, af as HtmlOptions, ag as FileOptions, ah as CloverOptions, ai as CoberturaOptions, aj as HtmlSpaOptions, ak as LcovOptions, al as LcovOnlyOptions, am as TeamcityOptions, an as TextOptions, ao as ProjectOptions, F as FakeTimerInstallOpts, P as ProjectConfig } from './types-e3c9754d.js';
import '@vitest/expect';
import '@vitest/snapshot';
import '@vitest/runner';
import '@vitest/runner/types';
import '@vitest/runner/utils';
import '@vitest/utils';
import 'tinybench';
import 'vite-node/client';
import '@vitest/snapshot/manager';
import 'node:worker_threads';
import 'vite-node';
import 'source-map';
import 'vite-node/server';
import 'node:fs';
import 'chai';

declare const defaultInclude: string[];
declare const defaultExclude: string[];
declare const coverageConfigDefaults: ResolvedCoverageOptions;
declare const config: {
    allowOnly: boolean;
    watch: boolean;
    globals: boolean;
    environment: "node";
    threads: boolean;
    clearMocks: boolean;
    restoreMocks: boolean;
    mockReset: boolean;
    include: string[];
    exclude: string[];
    testTimeout: number;
    hookTimeout: number;
    teardownTimeout: number;
    isolate: boolean;
    watchExclude: string[];
    forceRerunTriggers: string[];
    update: boolean;
    reporters: never[];
    silent: boolean;
    api: boolean;
    ui: boolean;
    uiBase: string;
    open: boolean;
    css: {
        include: never[];
    };
    coverage: {
        provider: "c8";
    } & CoverageC8Options & Required<Pick<({
        provider?: undefined;
    } & CoverageC8Options) | ({
        provider: "custom";
    } & CustomProviderOptions) | ({
        provider: "c8";
    } & CoverageC8Options) | ({
        provider: "istanbul";
    } & CoverageIstanbulOptions), "exclude" | "enabled" | "clean" | "cleanOnRerun" | "reportsDirectory" | "extension">> & {
        reporter: (["html", Partial<HtmlOptions>] | ["none", {}] | ["json", Partial<FileOptions>] | ["clover", Partial<CloverOptions>] | ["cobertura", Partial<CoberturaOptions>] | ["html-spa", Partial<HtmlSpaOptions>] | ["json-summary", Partial<FileOptions>] | ["lcov", Partial<LcovOptions>] | ["lcovonly", Partial<LcovOnlyOptions>] | ["teamcity", Partial<TeamcityOptions>] | ["text", Partial<TextOptions>] | ["text-lcov", Partial<ProjectOptions>] | ["text-summary", Partial<FileOptions>])[];
    };
    fakeTimers: FakeTimerInstallOpts;
    maxConcurrency: number;
    dangerouslyIgnoreUnhandledErrors: boolean;
    typecheck: {
        checker: "tsc";
        include: string[];
        exclude: string[];
    };
    slowTestThreshold: number;
};
declare const configDefaults: Required<Pick<UserConfig$1, keyof typeof config>>;

interface UserConfig extends UserConfig$2 {
    test?: UserConfig$2['test'];
}
interface UserWorkspaceConfig extends UserConfig$2 {
    test?: ProjectConfig;
}

type UserConfigFn = (env: ConfigEnv) => UserConfig | Promise<UserConfig>;
type UserConfigExport = UserConfig | Promise<UserConfig> | UserConfigFn;
type UserProjectConfigFn = (env: ConfigEnv) => UserWorkspaceConfig | Promise<UserWorkspaceConfig>;
type UserProjectConfigExport = UserWorkspaceConfig | Promise<UserWorkspaceConfig> | UserProjectConfigFn;
declare function defineConfig(config: UserConfigExport): UserConfigExport;
declare function defineProject(config: UserProjectConfigExport): UserProjectConfigExport;
declare function defineWorkspace(config: (string | (UserProjectConfigExport & {
    extends?: string;
}))[]): (string | (UserProjectConfigExport & {
    extends?: string | undefined;
}))[];

export { UserConfig, UserConfigExport, UserConfigFn, UserProjectConfigExport, UserProjectConfigFn, UserWorkspaceConfig, configDefaults, coverageConfigDefaults, defaultExclude, defaultInclude, defineConfig, defineProject, defineWorkspace };
