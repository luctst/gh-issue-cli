#!/usr/bin/env node
import chalk from 'chalk';
import { access } from "fs/promises";
import { resolve } from "path";
import { homedir } from 'os';
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const config = require("./config.json");

(async function () {
  function requestPromise(path, hostname, ops) {
    return new Promise((resolv, reject) => {
      const requestOps = {
        ...(ops && {...ops}),
        hostname: hostname || "api.github.com",
        method: "GET",
        headers: {
          "User-Agent": "luctst",
        },
      };
      const req = request(
        {
          ...requestOps,
          path,
        },
        (res) => {
          let d = "";

          res
            .on("data", (chunk) => {
              d = d.concat(chunk.toString());
            })
            .on("end", () => resolv(JSON.parse(d)));
        }
      );

      req.on("error", (err) => reject(err.message));
      req.end();
    });
  }

  function writeErrorAndStopProcess(content) {
    process.stderr.write(chalk.red(content));
    process.exit(-1);
  }

  function getConfigFile() {
    return access(resolve(homedir(), config.CONFIG_FILE));
  }

  try {
    await getConfigFile();
  } catch (error) {
    if (error.code === 'ENOENT') {

    }

    return writeErrorAndStopProcess(error.message);
  }
})()