# Contributing to Mockoon-cli

> **[Guidelines from Mockoon's main repository](https://github.com/mockoon/mockoon/blob/master/CONTRIBUTING.md) must be followed.**
> **Specific guidelines below applies to this repository:**

## Application dependence

`@mockoon/cli` is a command line application using Mockoon [main application](https://github.com/mockoon/mockoon) data format to run mocks and [Mockoon's commons library](https://github.com/mockoon/commons).

Dependence between the three projects is high. 

Therefore, contributions to this repository may, most of the time, have a corresponding issue opened in the main application's repository and, a child issue in the commons library's repository when needed. 

## Contribution rules

The following rules apply to all contributions:

- Always search among the opened and closed issues. Assigned issues are already being worked on, and, most of the time, cannot be reassigned.
- Bug reports, enhancements, and features must be discussed with the maintainers regarding the implementation, changes to the UI, etc.
- Pull requests must refer to an open issue which must itself stem from a main repository's issue. Pull requests not solving existing issues may not be accepted.
- Issues and PR must follow the provided templates.

## Run the application in dev mode

- Clone the repository: `git@github.com:mockoon/cli.git`
- Run `npm install`.
- Run `npm run build`.
- Test commands with `./bin/run [command] [...args] [...flags]`.

## Work on your feature or bugfix

- Start your `feature` or `fix` from `main`
- Preferably squash your commits, except when it makes sense to keep them separate (one refactoring + feature development)
- Do not forget to add "Closes #xx" in one of the commit messages or in the pull request description (where xx is the GitHub issue number)

Branches naming convention:
- features and enhancements: `feature/name-or-issue-number`
- bug fixes: `fix/name-or-issue-number`

## Open a pull request

Open a pull request to be merge in the `main` branch. All branches should start from `main` and must be merged into `main`.
Ask maintainers to review the code and be prepared to rework your code if it does not match the style or do not follow the way it's usually done (typing, reducer, etc).
