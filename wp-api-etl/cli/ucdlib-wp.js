#! /usr/bin/env node
import { Command } from 'commander';

const program = new Command();
program
  .name('ucdlib-wp-main')
  .version('0.0.1')
  .command('find', 'Query for posts')

program.parse(process.argv);
