#!/usr/bin/env node
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const buildNewModel = require('./lib/modelBuilder');
const yargs = require('yargs');
const { obj2str } = require('./lib/helpers');
const TH = require('../helpers/time');

import runOptimize from './lib/optimizer.mjs';

const argv = commandLineParams();

//console.log(argv);

(async () => {
  const module = await import(argv.file);
  const params = module.default;

  const [trainOrders, testOrders] = await params.getData();
  console.log(
    'Orders: TRAIN =',
    trainOrders.length,
    'TEST =',
    testOrders.length,
    'TEST since =',
    TH.ls(testOrders[0].time)
  );

  switch (argv['_'][0]) {
    case 'opt':
      await cmdOptimize(params, argv, trainOrders, testOrders);
      break;
    case 'build':
      await cmdBuild(params, argv, trainOrders, testOrders);
      break;
  }
})();

async function cmdBuild(params, argv, trainOrders, testOrders) {
  let buildParams = params.build ?? {};

  if (argv.param) {
    let correctJson = argv.param.replace(
      /(['"])?([a-z0-9A-Z_]+)(['"])?:/g,
      '"$2": '
    );
    const argvParams = JSON.parse(correctJson);
    buildParams = { ...buildParams, ...argvParams };
    console.log('Building with params:', argvParams);
  }

  buildParams.verbose = 1;

  const res = await buildNewModel(buildParams, trainOrders, testOrders);
}

async function cmdOptimize(params, argv, trainOrders, testOrders) {
  if (argv.iterations) params.optimize.iterations = argv.iterations;

  console.time('Optimizing');

  const opt = await runOptimize(
    params.optimize.for,
    params.optimize.space,
    params.optimize.iterations,
    params.optimize.builds,
    params.build ?? {},
    trainOrders,
    testOrders
  );
  console.timeEnd('Optimizing');

  console.log('Max:', obj2str(opt.argmax));
  console.log('Min:', obj2str(opt.argmin));
}

function commandLineParams() {
  return yargs
    .command('opt [file]', 'run optimizer', (yargs) => {
      yargs
        .positional('file', {
          describe: 'file exporting { getData(), optimize }',
          type: 'string',
          demandOption: true,
        })
        .demandOption(['file']);
    })
    .option('iterations', {
      alias: 'i',
      type: 'number',
      description: 'override optimizer iterations',
    })
    .command('build [file] [param]', 'build a model', (yargs) => {
      yargs
        .positional('file', {
          describe: 'file exporting { getData() }',
          type: 'string',
          demandOption: true,
        })
        .demandOption(['file']);
      yargs.positional('param', {
        describe: 'JSON sting of build parameters\nEx: { epochsMin: 48 }',
        type: 'string',
        demandOption: true,
      });
    })

    .detectLocale(false)
    .strict(true)
    .demandCommand(1, "Either 'build' or 'opt' required")
    .showHelpOnFail(true)
    .help().argv;
}
