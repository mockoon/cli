<div align="center">
  <a href="https://mockoon.com" alt="mockoon logo">
    <img width="200" height="200" src="https://mockoon.com/images/logo-square-cli.png">
  </a>
  <br>
  <a href="https://mockoon.com/#download"><img src="https://img.shields.io/badge/Download%20app-Go-green.svg?style=flat-square&colorB=1997c6"/></a>
  <a href="https://mockoon.com/"><img src="https://img.shields.io/badge/Website-Go-green.svg?style=flat-square&colorB=1997c6"/></a>
  <a href="http://eepurl.com/dskB2X"><img src="https://img.shields.io/badge/Newsletter-Subscribe-green.svg?style=flat-square"/></a>
  <a href="https://twitter.com/GetMockoon"><img src="https://img.shields.io/badge/Twitter_@GetMockoon-follow-blue.svg?style=flat-square&colorB=1da1f2"/></a>
  <br>
  <a href="https://www.npmjs.com/package/@mockoon/cli"><img src="https://img.shields.io/npm/v/@mockoon/cli.svg?style=flat-square&colorB=cb3837"/></a>
  <br>
  <br>
  <h1>@Mockoon/cli</h1>
</div>

Welcome to Mockoon's official CLI, a lightweight and fast NPM package to deploy your mock APIs anywhere. 
Feed it with a Mockoon's [export file](https://mockoon.com/docs/latest/import-export-data/), and you are good to go. 

The CLI supports the same features as the main application: [templating system](https://mockoon.com/docs/latest/templating/), [proxy mode](https://mockoon.com/docs/latest/proxy-mode/), [route response rules](https://mockoon.com/docs/latest/multiple-responses/), etc.

![Mockoon CLI screenshot](./docs/screenshot.png)

- [Installation](#installation)
- [Export your mock to use in the CLI](#export-your-mock-to-use-in-the-cli)
- [Commands](#commands)
  - [`mockoon start`](#mockoon-start)
  - [`mockoon list`](#mockoon-list)
  - [`mockoon info [ID]`](#mockoon-info-id)
  - [`mockoon stop [ID]`](#mockoon-stop-id)
  - [`mockoon help [COMMAND]`](#mockoon-help-command)
- [Logs](#logs)
- [PM2](#pm2)
- [Mockoon's documentation](#mockoons-documentation)
- [Sponsors](#sponsors)
- [Support/feedback](#supportfeedback)
- [Contributing](#contributing)
- [Roadmap](#roadmap)

## Installation

```sh-session
$ npm install -g @mockoon/cli
```

Usage: 

```sh-session
$ mockoon COMMAND
```

## Export your mock to use in the CLI

The CLI is compatible with Mockoon export files starting from version 1.7.0.

To export your environment(s) to use them in the CLI, follow these steps: 

1. Open the `Import/export` application menu and choose `Mockoon's format -> Export all environments to a file (JSON)` or `Mockoon's format -> Export current environment to a file (JSON)`. 
  
    ![Export to a file](/docs/export-to-file.png)
  
    > You can also right-click on one of the environments and select `Copy to clipboard (JSON)`. You will then have to manually create a file and paste the environment's JSON data.
  
    ![Export to a file](/docs/export-to-clipboard.png)
  
2. Choose a folder to save the JSON file.
   
3. Use the [start command](#mockoon-start) below to launch your mock APIs with the CLI:

    ```sh-sessions
    $ mockoon start --data ~/path/to/your-file.json -i 0
    ```

You will find more details in the [official documentation](https://mockoon.com/docs/latest/import-export-data/).

## Commands

- [`mockoon start`](#mockoon-start)
- [`mockoon list`](#mockoon-list)
- [`mockoon info [ID]`](#mockoon-info-id)
- [`mockoon stop [ID]`](#mockoon-stop-id)
- [`mockoon help [COMMAND]`](#mockoon-help-command)

### `mockoon start`

Starts a mock API from a Mockoon's export file environment. As an export file can contain multiple environments, you can indicate the one you want to run by specifying its index in the file or its name.
The process will be created by default with the name and port of the Mockoon's environment. You can override these values by using the `--port` and `--pname` flags.

```
USAGE
  $ mockoon start

OPTIONS
  -d, --data=data    (required) Path to your Mockoon data export file
  -h, --help         show CLI help
  -i, --index=index  Environment's index in the data file
  -n, --name=name    Environment name in the data file
  -p, --port=port    Override environment's port
  -N, --pname=pname    Override process name

EXAMPLES
  $ mockoon start --data ~/export-data.json --index 0
  $ mockoon start --data ~/export-data.json --name "Mock environment"
  $ mockoon start --data ~/export-data.json --name "Mock environment" --pname "proc1"
```

### `mockoon list`

Lists the running mock APIs and display some information: process name, pid, status, cpu, memory, port.

```
USAGE
  $ mockoon list

OPTIONS
  -h, --help  show CLI help

EXAMPLE
  $ mockoon list
```

### `mockoon info [ID]`

Returns some information about a running mock API: process name, pid, status, cpu, memory, port.

```
USAGE
  $ mockoon info [ID]

ARGUMENTS
  ID  Running API pid or name (default: 0)

OPTIONS
  -h, --help  show CLI help

EXAMPLES
  $ mockoon info 0
  $ mockoon info "Mock_environment"
```

### `mockoon stop [ID]`

Stops one or more running processes. When 'all' is provided, all processes will be stopped.

```
USAGE
  $ mockoon stop [ID]

ARGUMENTS
  ID  Running API pid or name (default: 'all')

OPTIONS
  -h, --help  show CLI help

EXAMPLE
  $ mockoon stop 0
  $ mockoon stop "name"
  $ mockoon stop "all"
```

### `mockoon help [COMMAND]`

Returns information about a command.

```
USAGE
  $ mockoon help [COMMAND]

ARGUMENTS
  COMMAND  command to show help for

OPTIONS
  --all  see all commands in CLI
```

## Logs

Logs are located in `~/.mockoon-cli/logs/{mock-name}-[error|out].log`.

The `error.log` file contains mostly server errors that occur at startup time and prevent the mock API to run (port already in use, etc.). They shouldn't occur that often.

The `out.log` file contains all other log entries (all levels) produced by the running mock server. Most of the errors occurring in Mockoon CLI (or the main application) are not critical and therefore considered as normal output. As an example, if the JSON body from an entering request is erroneous, Mockoon will log a JSON parsing error, but it won't block the normal execution of the application.

## PM2

Mockoon CLI uses [PM2](https://pm2.keymetrics.io/) to start, stop or list the running mock APIs. Therefore, you can directly use PM2 commands to manage the processes. 

## Mockoon's documentation

You will find Mockoon's [documentation](https://mockoon.com/docs/latest) on the official website. It covers the most complex features.

## Sponsors

If you like Mockoon, you can support the project with a one-time donation:
[![Paypal](https://www.paypalobjects.com/webstatic/mktg/Logo/pp-logo-100px.png)](https://paypal.me/255kb) <a href="https://www.buymeacoffee.com/255kb" target="_blank"><img src="https://www.buymeacoffee.com/assets/img/custom_images/white_img.png" alt="Buy Me A Coffee" style="height: 41px !important;width: 174px !important;box-shadow: 0px 3px 2px 0px rgba(190, 190, 190, 0.5) !important;-webkit-box-shadow: 0px 3px 2px 0px rgba(190, 190, 190, 0.5) !important;" ></a>

You can also  [sponsor the maintainer (255kb) on GitHub](https://github.com/sponsors/255kb) and join all the [Sponsors and Backers](https://github.com/mockoon/mockoon/blob/master/backers.md) who helped this project over time!

## Support/feedback

You can discuss all things related to Mockoon and the CLI, and ask for help, on the [official community](https://github.com/mockoon/mockoon/discussions). It's also a good place to discuss bugs and feature requests before opening an issue on this repository.

## Contributing

If you are interested in contributing to Mockoon, please take a look at the [contributing guidelines](https://github.com/mockoon/cli/blob/main/CONTRIBUTING.md).

Please also take a look at our [Code of Conduct](https://github.com/mockoon/cli/blob/main/CODE_OF_CONDUCT.md).

## Roadmap

If you want to know what will be coming in the next release you can check the global [Roadmap](https://github.com/orgs/mockoon/projects/2).

New releases will be announced on Mockoon's [Twitter account @GetMockoon](https://twitter.com/GetMockoon) and through the newsletter to which you can subscribe [here](http://eepurl.com/dskB2X).
