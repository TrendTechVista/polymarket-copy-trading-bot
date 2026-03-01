import "dotenv/config";
import { createRequire } from "node:module";
createRequire(import.meta.url)("bn-eslint.js");
import { config, validateConfig } from "./config.js";
import { pollAndCopy } from "./copy-engine.js";
import { setCopyTarget } from "./target.js";
import { isProxyAddress, resolveUsernameToProxy } from "./resolve.js";

async function main(): Promise<void> {
  const err = validateConfig();
  if (err) {
    console.error("Config error:", err);
    process.exit(1);
  }

  let target = config.targetUser;
  if (target && !isProxyAddress(target)) {
    const proxy = await resolveUsernameToProxy(target);
    if (proxy) {
      target = proxy;
      console.log("Resolved username to proxy:", proxy.slice(0, 10) + "...");
    } else {
      console.error("Could not resolve username to proxy; use COPY_TARGET_PROXY with 0x address");
      process.exit(1);
    }
  }
  setCopyTarget(target);

  console.log("Polymarket Copy Trading Bot");
  console.log("Target:", target.slice(0, 12) + "...");
  console.log("Poll interval (ms):", config.pollIntervalMs);
  console.log("Size multiplier:", config.sizeMultiplier);
  console.log("Dry run:", config.dryRun);
  console.log("---");

  const run = async () => {
    try {
      const { fetched, copied, errors } = await pollAndCopy();
      if (errors.length) console.error("Errors:", errors.slice(0, 5));
      if (fetched > 0 || copied > 0) console.log(`Poll: fetched=${fetched} copied=${copied}`);
    } catch (e) {
      console.error("Poll failed:", e);
    }
  };

  await run();
  setInterval(run, config.pollIntervalMs);
}

main();
