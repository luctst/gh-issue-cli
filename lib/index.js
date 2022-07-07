#!/usr/bin/env node
import chalk from 'chalk';
import input from '@inquirer/input';
import latestVersion from 'latest-version';
import parseArgvData from 'argv-user-input';
import { request } from 'https';
import { access, readFile } from 'fs/promises';
import { createWriteStream } from 'fs';
import { resolve } from 'path';
import { homedir } from 'os';
import { createRequire } from 'module';

(async function () {
  const require = createRequire(import.meta.url);
  const config = require('./config.json');
  const { version, name } = require('../package.json');

  const configFilePath = resolve(homedir(), config.CONFIG_FILE);
  const argv = parseArgvData();
  const defaultHeaderApi = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'luctst',
  };

  function requestPromise(path, hostname, ops) {
    return new Promise((resolv, reject) => {
      const requestOps = {
        hostname: hostname || 'api.github.com',
        method: 'GET',
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
              resolv(JSON.parse(d));
            });
        }
      );

      req.on('error', (err) => reject(err.message));
      req.end();
    });
  }

  async function logVersionAndName() {
    const lastVersion = await latestVersion('gh-issue-cli');
    return process.stdout.write(
      `${chalk.magenta(name, version)}, latest version ${chalk.yellow.underline(
        lastVersion
      )}\n`
    );
  }

  function logMessageError(content) {
    return process.stderr.write(chalk.red(content));
  }

  function logMessage(content) {
    return process.stdout.write(content);
  }

  async function getConfigFile() {
    await access(configFilePath);
    return JSON.parse(await readFile(configFilePath, { encoding: 'utf-8' }));
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

    if (tkFormated.startsWith(config.TOKEN_STARTS_WITH)) return true;
    return `Github token must start with ${chalk.yellow(config.TOKEN_STARTS_WITH)}`;
  }

  function validateGhUsername(value) {
    const usernameFormated = value.trim().toLowerCase();

    if (/^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i.test(usernameFormated)) return true;
    return `Github username bad format`;
  }

  function stringifyConfig(ghData, cf = config.CONFIG_SCHEMA) {
    const configKeys = Object.keys(cf);
    return JSON.stringify(
      configKeys.reduce((prev, next) => {
        const prevSpread = { ...prev };
        prevSpread[next] = ghData[next];

        return prevSpread;
      }, {})
    );
  }

  async function repoExist(repos, configData) {
    const result = await Promise.all(
      [...repos].map(async (repoName) => {
        const repo = await requestPromise(
          `/repos/${configData.gh_username}/${repoName}`,
          null,
          {
            headers: {
              ...defaultHeaderApi,
            },
            Authorization: `token ${configData.gh_token}`,
          }
        );

        if (repo.name) return repo.name;
        return undefined;
      })
    );

    return result.filter((repoName) => typeof repoName === 'string');
  }

  try {
    await logVersionAndName();
    const config = await getConfigFile();

    if (argv.commands.length) {
      const repos = await repoExist(argv.commands, config);
    }

    return true;
  } catch (error) {
    if (error.code === 'ENOENT') {
      logMessage(
        `\nNo config file founded, In order to create issues we will create a config file at this path with your github token inside ${chalk.yellow(
          configFilePath
        )}\n\n`
      );
      const token = await askInput('Enter Github token', validateToken);
      const username = await askInput('Enter Github username', validateGhUsername);
      const newConfig = stringifyConfig({ gh_token: token, gh_username: username });

      return createWriteStream(configFilePath)
        .on('error', (err) => logMessageError(err.message))
        .write(newConfig, 'utf-8', (er) => {
          if (er) {
            logMessage(er.message);
            return process.exit(-1);
          }

          logMessage(
            `Config file correctly generated at ${chalk.yellow(configFilePath)}`
          );
          return process.exit(0);
        });
    }

    logMessageError(error.message);
    return process.exit(-1);
  }
})();
