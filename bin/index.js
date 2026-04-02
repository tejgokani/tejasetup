#!/usr/bin/env node

import { runProgram } from '../src/cli/program.js';

try {
  await runProgram();
} catch (err) {
  console.error(err);
  process.exitCode = 1;
}
