import { execSync } from 'node:child_process';

execSync('tsc --noEmit', { stdio: 'inherit' });
execSync('esbuild src/main.ts --bundle --platform=node --format=esm --outfile=dist/main.js --banner:js="#!/usr/bin/env node" --packages=external', { stdio: 'inherit' });
