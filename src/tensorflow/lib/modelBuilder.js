const Model = require('./model');

const tf = require('@tensorflow/tfjs');
const layersComposer = require('./layersComposer');
const { fobj, fnum } = require('../../reports/helper');

async function buildNewModel(opts, trainOrders, testOrders) {
  const model = new Model({ verbose: 0, logEveryEpoch: 100, ...opts });

  if (!model.verifyData(trainOrders)) {
    throw new Exception('Data verification failed!');
  }

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

  if (opts.verbose > 0)
    displayTestStats({
      loss,
      acc,
      totalStats,
      bottomStats,
      topStats,
      top10,
      diffq,
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
  };
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
}) {
  console.log(
    'Loss:',
    fnum(loss, 3),
    'Accurancy:',
    fnum(acc, 3),
    'Diffq:',
    fnum(diffq, 3)
  );

  console.log('total:     ', fobj(totalStats));
  console.log('bottom 50: ', fobj(bottomStats));
  console.log('top 50:    ', fobj(topStats));
  console.log('top 10:    ', fobj(top10));
}

module.exports = buildNewModel;
