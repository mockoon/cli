#!/bin/bash

mockoon-cli start "$@" -l 0.0.0.0
sleep infinity & wait $!