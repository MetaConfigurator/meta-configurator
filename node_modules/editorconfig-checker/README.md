# editorconfig-checker

![Logo](docs/logo.png)

[![Build Status](https://travis-ci.org/editorconfig-checker/editorconfig-checker.javascript.svg?branch=master)](https://travis-ci.org/editorconfig-checker/editorconfig-checker.javascript)
[![Greenkeeper badge](https://badges.greenkeeper.io/editorconfig-checker/editorconfig-checker.javascript.svg)](https://greenkeeper.io/)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://github.com/prettier/prettier)
[![Total alerts](https://img.shields.io/lgtm/alerts/g/editorconfig-checker/editorconfig-checker.javascript.svg?logo=lgtm&logoWidth=18)](https://lgtm.com/projects/g/editorconfig-checker/editorconfig-checker.javascript/alerts/)
[![Language grade: JavaScript](https://img.shields.io/lgtm/grade/javascript/g/editorconfig-checker/editorconfig-checker.javascript.svg?logo=lgtm&logoWidth=18)](https://lgtm.com/projects/g/editorconfig-checker/editorconfig-checker.javascript/context:javascript)

<a href="https://www.buymeacoffee.com/mstruebing" target="_blank"><img src="https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png" alt="Buy Me A Coffee" style="height: 41px !important;width: 174px !important;box-shadow: 0px 3px 2px 0px rgba(190, 190, 190, 0.5) !important;-webkit-box-shadow: 0px 3px 2px 0px rgba(190, 190, 190, 0.5) !important;" ></a>

## What?

This is a tool to check if your files consider your `.editorconfig` rules.
Most tools—like linters, for example—only test one filetype and need an extra configuration.
This tool only needs your `.editorconfig` to check all files.

![Example Screenshot](docs/screenshot.png)

## Important

This is only a wrapper for the core [editorconfig-checker](https://github.com/editorconfig-checker/editorconfig-checker).
You should have a look at this repository to know how this tool can be used and what possibilities/caveats are there.
This version can be used in the same way as the core as every argument is simply passed down to it.

## Installation

Installation via npm/yarn is recommended:

```shell
npm install --save-dev editorconfig-checker
yarn add --dev editorconfig-checker
```

Otherwise you could clone the repository and execute the script manually.

```shell
git clone https://github.com/editorconfig-checker/editorconfig-checker.javascript
cd editorconfig-checker.javascript
npm install
npm start
npm test
```

## Usage

There is an alias from `editorconfig-checker` to `ec` so you can exchange every occurrence of `editorconfig-checker` with `ec`.

If you installed it via npm you have a binary in your `node_modules/.bin` folder called `editorconfig-checker`.
Then you could create a script in your `package.json` like this:

```json
"scripts": {
  "lint:editorconfig": "editorconfig-checker"
}
```

Usage output:

```
USAGE:
  -config string
        config
  -debug
        print debugging information
  -disable-end-of-line
        disables the trailing whitespace check
  -disable-indent-size
        disables only the indent-size check
  -disable-indentation
        disables the indentation check
  -disable-insert-final-newline
        disables the final newline check
  -disable-trim-trailing-whitespace
        disables the trailing whitespace check
  -dry-run
        show which files would be checked
  -exclude string
        a regex which files should be excluded from checking - needs to be a valid regular expression
  -h    print the help
  -help
        print the help
  -ignore-defaults
        ignore default excludes
  -init
        creates an initial configuration
  -no-color
        dont print colors
  -v    print debugging information
  -verbose
        print debugging information
  -version
        print the version number
```

## Support

If you have any questions, suggestions or just want to chat join #editorconfig-checker on freenode(IRC).
If you don't have an IRC-client set up you can use the [freenode webchat](https://webchat.freenode.net/?channels=editorconfig-checker).
