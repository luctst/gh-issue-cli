<div align="center">
  <br>
  <br>
  <p>
    <b>gh-issue-cli</b>
  </p>
  <p>
    <i>Create an github issue from your terminal 🔫</i>
  </p>
  <p>

[![NPM version](https://img.shields.io/npm/v/gh-issue-cli?style=flat-square)](https://img.shields.io/npm/v/gh-issue-cli?style=flat-square)
[![Package size](https://img.shields.io/bundlephobia/min/gh-issue-cli)](https://img.shields.io/bundlephobia/min/gh-issue-cli)
[![Dependencies](https://img.shields.io/david/luctst/gh-issue-cli.svg?style=popout-square)](https://david-dm.org/luctst/gh-issue-cli)
[![devDependencies Status](https://david-dm.org/luctst/gh-issue-cli/dev-status.svg?style=flat-square)](https://david-dm.org/luctst/gh-issue-cli?type=dev)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://github.com/prettier/prettier)
[![Twitter](https://img.shields.io/twitter/follow/luctstt.svg?label=Follow&style=social)](https://twitter.com/luctstt)

  </p>
</div>

---

**Content**

* [Features](##features)
* [Install](##install)
* [Usage](##usage)
* [Contributing](##contributing)
* [Maintainers](##maintainers)

## Features ✨
* Create issue for Github repository.
* Easy-to-use interface.

## Install 🐙
```bash
npm i -g gh-issue-cli
```

## Usage 💡
NPX:
```bash
npx gh-issue-cli [commands] <options>
```

```
$ gh-issue-cli react vue

  Usage
    $ gh-issue-cli [commands] <options>
  
  Commands
    config,           Create actions on config file, if no options is declared read the config file.
    [repository-name] Enter one or many repository where you have access to create issues on it.

  Options
    --read             Available with the config command, read and return the configuration file.
    --update           Available with config command, update the config file with new data.

  Examples
    $ gh-issue-cli config
    $ gh-issue-cli config --update
    $ gh-issue-cli --read
    $ gh-issue-cli node meow
    $ gh-issue-cli luctst-cli
```

## Contributing 🍰
Please make sure to read the [Contributing Guide]() before making a pull request.

Thank you to all the people who already contributed to this project!

## Maintainers 👷
List of maintainers, replace all `href`, `src` attributes by your maintainers datas.
<table>
  <tr>
    <td align="center"><a href="https://lucastostee.now.sh/"><img src="https://avatars3.githubusercontent.com/u/22588842?s=460&v=4" width="100px;" alt="Tostee Lucas"/><br /><sub><b>Tostee Lucas</b></sub></a><br /><a href="#" title="Code">💻</a></td>
  </tr>
</table>

## License ⚖️
@MIT

---
<div align="center">
	<b>
		<a href="https://www.npmjs.com/package/get-good-readme">File generated with get-good-readme module</a>
	</b>
</div>
