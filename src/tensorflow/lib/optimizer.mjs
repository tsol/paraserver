import * as hpjs from 'hyperparameters';
import _ from 'lodash';

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { obj2str } = require('./helpers');

const buildNewModel = require('./modelBuilder');

async function runOptimize(
  path,
  space,
  iterations,
  builds,
  defaultParams,
  trainData,
  testData
) {
  console.log('*** OPTIMIZING FOR:', path);
  let iCount = 0;

  const modelOpt = async (space, { defaultParams, trainData, testData }) => {
    const buildParams = { ...defaultParams, ...space };

    const times = builds || 1;
    let sum = 0;

    for (let i = 0; i < times; i++) {
      const res = await buildNewModel(buildParams, trainData, testData);
      if (res.diffq < 0.5) return { res, loss: 100, status: hpjs.STATUS_FAIL };
      const val = _.get(res, path);
      sum += val;
      console.log(' -', val);
    }

    const loss = sum / times;

    console.log(`** OPT ${iCount++}:`, loss.toFixed(4), obj2str(space));
    return { loss, status: hpjs.STATUS_OK };
  };

  return hpjs.fmin(modelOpt, space, hpjs.search.randomSearch, iterations, {
    rng: new hpjs.RandomState(654321),
    defaultParams,
    trainData,
    testData,
  });
}

export default runOptimize;
