export const DOCKER_TEMPLATE =
`FROM node:14-alpine

RUN npm install -g @mockoon/cli
COPY {{{filePath}}} ./data

# Build runner script
RUN echo "mockoon start \\"\\$@\\"; sleep infinity & wait \\$!" > mockoon-runner.sh

# Do not run as root.
RUN adduser --shell /bin/sh --disabled-password --gecos "" mockoon
RUN chown -R mockoon ./mockoon-runner.sh
RUN chown -R mockoon ./data
USER mockoon

EXPOSE {{{port}}}

ENTRYPOINT sh mockoon-runner.sh -d data {{{attributes}}}`;
