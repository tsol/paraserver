const Model = require('./model');

const tf = require('@tensorflow/tfjs');
const layersComposer = require('./layersComposer');
const { fobj, fnum } = require('../../reports/helper');

const modelDefaults = {
  verbose: 0,
  logEveryEpoch: 10,
};

const builderDefaults = {
  layersComposerIndex: null, // use which composer from layersComposer (null - dont use)
  lc_m: 1, // composer all model multiplier index
  lc_dp: 0, // dropout layer position index
  lc_dr: 0, // dropout layer rate index
  lc_l1: 1, // layer 1 index
  lc_l2: 1, // layer 2 index
  lc_l3: 0, // layer 3 index
  lc_l4: 0, // layer 4 index
};

async function buildNewModel(opts, trainOrders, testOrders) {
  const model = new Model({ ...modelDefaults, ...opts });

  if (!model.verifyData(trainOrders)) {
    throw new Exception('Data verification failed!');
  }

  opts = { ...builderDefaults, ...opts };

  const { layersComposerIndex } = opts;

  if (layersComposerIndex !== undefined && layersComposerIndex !== null) {
    const { lc_m, lc_dp, lc_dr, lc_l1, lc_l2, lc_l3, lc_l4 } = opts;
    const layers = layersComposer.composers[layersComposerIndex](
      model.getInputsSize(),
      [lc_m, lc_dp, lc_dr, lc_l1, lc_l2, lc_l3, lc_l4]
    );
    model.setLayers(layers);
  }

  if (opts.verbose > 0) console.time('Training');

  const { minLoss, minLossEpoch, maxAcc, maxAccEpoch } =
    await model.createAndTrainModel(trainOrders);

  if (opts.verbose > 0) console.timeEnd('Training');

  if (opts.verbose > 0)
    displayTrainStats({ minLoss, minLossEpoch, maxAcc, maxAccEpoch });

  const { loss, acc, totalStats, bottomStats, topStats, top10, diffq } =
    model.testModel(testOrders);

  const wrBoost = calcWinrateImprovement({
    totalStats,
    bottomStats,
    topStats,
    top10,
  });

  if (opts.verbose > 0)
    displayTestStats({
      loss,
      acc,
      totalStats,
      bottomStats,
      topStats,
      top10,
      diffq,
      wrBoost,
    });

  tf.disposeVariables();
  tf.dispose(model.model);

  const leak = tf.memory();

  if (leak.numTensors > 10)
    console.log(
      '   leak:',
      leak.numTensors,
      'tns, ',
      fnum(leak.numBytes / 1024, 3),
      'kb'
    );

  return {
    minLoss,
    minLossEpoch,
    maxAcc,
    maxAccEpoch,
    loss,
    acc,
    totalStats,
    bottomStats,
    topStats,
    top10,
    diffq,
    wrBoost,
  };
}

function calcWinrateImprovement({ totalStats, bottomStats, topStats, top10 }) {
  // bottom, total, top, top10
  let coef = 1;
  const improve1 = totalStats.ratio - bottomStats.ratio;
  if (improve1 <= 0) coef -= 0.25;
  const improve2 = topStats.ratio - totalStats.ratio;
  if (improve2 <= 0) coef -= 0.25;
  const improve3 = top10.ratio - topStats.ratio;
  if (improve3 <= 0) coef -= 0.25;

  return ((improve1 + improve2 + improve3) / 3) * coef;
}

function displayTrainStats({ minLoss, minLossEpoch, maxAcc, maxAccEpoch }) {
  console.log(
    'Min loss:',
    fnum(minLoss, 3),
    'at',
    minLossEpoch,
    'Max acc:',
    fnum(maxAcc, 3),
    'at',
    maxAccEpoch
  );
}

function displayTestStats({
  loss,
  acc,
  totalStats,
  bottomStats,
  topStats,
  top10,
  diffq,
  wrBoost,
}) {
  console.log('bottom 50: ', fobj(bottomStats));
  console.log('total:     ', fobj(totalStats));
  console.log('top 50:    ', fobj(topStats));
  console.log('top 10:    ', fobj(top10));

  console.log(
    'Loss:',
    fnum(loss, 3),
    'Accurancy:',
    fnum(acc, 3),
    'Diffq:',
    fnum(diffq, 3),
    'WR boost:',
    fnum(wrBoost, 3)
  );
}

module.exports = buildNewModel;
