#!/usr/bin/env node
import chalk from 'chalk';
import input from '@inquirer/input';
import { request } from 'https';
import { access } from 'fs/promises';
import { resolve } from 'path';
import { homedir } from 'os';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const config = require("./config.json");
const { version, name } = require('../package.json');

(async function () {
  function requestPromise(path, hostname, ops) {
    return new Promise((resolv, reject) => {
      const requestOps = {
        hostname: hostname || 'api.github.com',
        method: 'GET',
        // headers: {
        //   'User-Agent': 'luctst',
        // },
        ...(ops && { ...ops }),
      };
      const req = request(
        {
          ...requestOps,
          path,
        },
        (res) => {
          let d = '';

          res
            .on('data', (chunk) => {
              d = d.concat(chunk.toString());
            })
            .on('end', () => {
              console.log(d);
              resolv(JSON.parse(d))
            });
        }
      );

      req.on('error', (err) => reject(err.message));
      req.end();
    });
  }

  async function logVersionAndName() {
    const packageData = await requestPromise(
      '/luctst-cli',
      'registry.npm.org',
      {
      }
    );
    return process.stdout.write(`${chalk.magenta(name, version)}`);
  }

  function logMessageError(content) {
    return process.stderr.write(chalk.red(content));
  }

  function logMessage(content) {
    return process.stdout.write(content);
  }

  function getConfigFile() {
    return access(resolve(homedir(), config.CONFIG_FILE));
  }

  function askInput(message, validate) {
    return input({
      message,
      filter(v) {
        return v.trim().toLowerCase();
      },
      ...(validate && { validate }),
    });
  }

  function validateToken(token) {
    const tkFormated = token.trim().toLowerCase();

    if (tkFormated.startsWith('gh')) return true;
    return `Github token must start with ${chalk.yellow('gh')}`;
  }

  try {
    logVersionAndName();
    await getConfigFile();
  } catch (error) {
    if (error.code === 'ENOENT') {
      logMessage(`\nNo config file founded, In order to create issues we will create a config file at this path with your github token inside ${chalk.yellow(resolve(homedir(), config.CONFIG_FILE))}\n\n`);
      const token = await askInput('Enter Github token', validateToken);
    }

    logMessageError(error.message);
    return process.exit(-1);
  }
})();
