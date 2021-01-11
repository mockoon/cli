#!/bin/bash

mockoon-cli start "$@"
sleep infinity & wait $!