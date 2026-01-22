#!/usr/bin/env node

import { Command } from 'commander';
import { StartCommand } from './cli/StartCommand';

const program = new Command();

program
  .name('streaming-daemon')
  .description('Streaming Enhancement Daemon')
  .version('0.1.0');

program.addCommand(new StartCommand().getCommand());

program.parse(process.argv);
