#!/usr/bin/env node
import chalk from 'chalk';
import input from '@inquirer/input';
import checkbox from '@inquirer/checkbox';
import latestVersion from 'latest-version';
import parseArgvData from 'argv-user-input';
import { request } from 'https';
import { access, readFile } from 'fs/promises';
import { createWriteStream } from 'fs';
import { resolve } from 'path';
import { homedir } from 'os';
import { createRequire } from 'module';
import { inspect } from 'util';

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

  function requestPromise(path, method, hostname, ops) {
    return new Promise((resolv, reject) => {
      const requestOps = {
        hostname: hostname || 'api.github.com',
        method: method || 'GET',
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

      if (method !== 'GET') req.write(JSON.stringify(ops.body));
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
    return process.stdout.write(`\n${content}\n`);
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
          'GET',
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

  function askIssueData(repos = []) {
    logMessage(`Create issue for ${chalk.yellow(repos.join(', '))} repos`);
    let i = 0;
    const answers = [];

    return async function inner() {
      if (i === repos.length) {
        return answers;
      }

      const title = await input({
        message: `Enter issue title for ${chalk.yellow(
          repos[i]
        )} repository - ${chalk.cyan('Required')}`,
        validate(v) {
          return !!v.length;
        },
      });
      const body = await input({
        message: `Enter issue body for ${chalk.yellow(
          repos[i]
        )} repository - ${chalk.cyan('Optional')}`,
      });

      answers.push({ title, body, repoName: repos[i] });
      i += 1;

      return inner();
    };
  }

  async function createIssues(issuesData, cf) {
    logMessage('Start create issue, this operation can take some times');
    const response = await Promise.all(
      [...issuesData].map(async (issueData) => {
        const resultApi = await requestPromise(
          `/repos/${cf.gh_username}/${issueData.repoName}/issues`,
          'POST',
          null,
          {
            headers: {
              Authorization: `token ${cf.gh_token}`,
              'User-Agent': cf.gh_username,
            },
            body: issueData,
          }
        );
        
        if (resultApi.message) {
          return false;
        }

        return {
          repo: issueData.repoName,
          issueUrl: resultApi.html_url,
        };
      })
    );

    if (response.every((res) => !res)) {
      return logMessageError('Oups, something wrong try again.. Check your config is correct by enter the config command with the --update option.');
    }

    logMessage('Issue correctly created !');
    response.forEach((r) => logMessage(`* Issue url - ${chalk.yellow(r.issueUrl)}`));
    return true;
  }

  function logConfig(configObj) {
    logMessage('Config file:');
    return logMessage(inspect(configObj, false, null, true));
  }

  function askUpdateConfig(cfg) {
    const c = { ...cfg };
    const newConfig = {};
    const configKeys = Object.keys(cfg);
    let y = 0;

    return async function i() {
      if (y === configKeys.length) return newConfig;

      const newConfigValue = await input({
        message: `Enter new value for ${chalk.yellow(configKeys[y])}`,
        default: c[configKeys[y]],
      });

      newConfig[configKeys[y]] = newConfigValue;
      y += 1;
      return i();
    };
  }

  async function selectRepos(ghToken, ghUsername) {
    return (
      await requestPromise('/user/repos?per_page=100&sort=pushed', 'GET', null, {
        headers: {
          Authorization: `token ${ghToken}`,
          'User-Agent': ghUsername,
        },
      })
    ).map((repo) => ({ name: repo.name, value: repo.name }));
  }

  function writeConfigFile(configPath, data, message, repos = [], stopProcess = true) {
    return createWriteStream(configPath)
      .on('error', (err) => logMessageError(err.message))
      .write(data, 'utf-8', async (er) => {
        let reposList;
        const cfg = JSON.parse(data);

        if (er) {
          logMessage(er.message);
          return process.exit(-1);
        }

        logMessage(
          message || `Config file correctly generated at ${chalk.yellow(configFilePath)}`
        );

        if (stopProcess) process.exit(0);

        if (repos.length) {
          reposList = await repoExist(repos, cfg);
        } else {
          const reposValidated = await selectRepos(cfg.gh_token, cfg.gh_username);
          reposList = await checkbox({
            message: 'Select repos to create issue',
            choices: reposValidated,
          });
        }

        const issues = await askIssueData(reposList)();
        return createIssues(issues, cfg);
      });
  }

  try {
    await logVersionAndName();
    const conf = await getConfigFile();
    let repos;

    if (argv.commands.length) {
      if (argv.commands.includes('config')) {
        if (argv.options.read) {
          return logConfig(conf);
        }

        if (argv.options.update) {
          const newConfig = await askUpdateConfig(conf)();
          return writeConfigFile(
            configFilePath,
            stringifyConfig(newConfig),
            'Config file updated'
          );
        }

        return logConfig(conf);
      }

      repos = await repoExist(argv.commands, conf);
    } else {
      const allRepos = await selectRepos(conf.gh_token, conf.gh_username);
      repos = await checkbox({
        message: 'Select repos to create issue',
        choices: allRepos,
      });
    }

    if (!repos.length) {
      return logMessageError('The repositories entered are not available');
    }

    const issueData = await askIssueData(repos)();
    return createIssues(issueData, conf);
  } catch (error) {
    if (error.code === 'ENOENT') {
      logMessage(
        `\nNo config file founded, In order to create issues we will create a config file at this path with your github token inside ${chalk.yellow(
          configFilePath
        )}\n\n`
      );
      const token = await askInput('Enter Github token', validateToken);
      const username = await askInput('Enter Github username', validateGhUsername);
      return writeConfigFile(
        configFilePath,
        stringifyConfig({ gh_token: token, gh_username: username }),
        null,
        argv.commands,
        false
      );
    }

    logMessageError(error.message);
    return process.exit(-1);
  }
})();
