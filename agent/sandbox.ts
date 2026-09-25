import { defineSandbox } from "eve/sandbox";
import { JustBashSandbox } from "eve/sandbox/just-bash";

/**
 * Every eve agent has a sandbox, but this one never uses it: the tools research
 * over HTTP and talk to Postgres from the app runtime. just-bash is a pure-JS
 * shell and filesystem, so it satisfies the requirement without starting a VM or
 * container.
 */
export const environment = JustBashSandbox.environment();
export default defineSandbox(() => environment.open());
