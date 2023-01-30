import * as hpjs from 'hyperparameters';
import _ from 'lodash';

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const trainNewModel = require('./trainee');

async function optimize(path, space, attempts, trainData, testData) {
  const modelOpt = async (space, { trainData, testData }) => {
    const res = await trainNewModel(space, trainData, testData);
    if (res.diffq < 0.5) return { res, loss: 100, status: hpjs.STATUS_FAIL };
    const loss = _.get(res, path);
    console.log('**** VALUE:', loss, space);
    return { res, loss, status: hpjs.STATUS_OK };
  };

  return hpjs.fmin(modelOpt, space, hpjs.search.randomSearch, attempts, {
    rng: new hpjs.RandomState(654321),
    trainData,
    testData,
  });
}

export default optimize;
