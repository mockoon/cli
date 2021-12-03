export const DOCKER_TEMPLATE = `FROM node:14-alpine

RUN npm install -g @mockoon/cli@{{{version}}}
COPY {{{filePath}}} ./data

# Build runner script
RUN echo "mockoon-cli start \\"\\$@\\" -l 0.0.0.0; sleep infinity & wait \\$!" > mockoon-runner.sh

# Do not run as root.
RUN adduser --shell /bin/sh --disabled-password --gecos "" mockoon
RUN chown -R mockoon ./mockoon-runner.sh
RUN chown -R mockoon ./data
USER mockoon

EXPOSE {{{port}}}

ENTRYPOINT sh mockoon-runner.sh -d data -c {{{args}}}
# Usage: docker run -p <host_port>:<container_port> mockoon-test`;
