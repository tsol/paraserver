const Model = require('./model');

const tf = require('@tensorflow/tfjs');

const { fobj, fnum } = require('../reports/helper');

async function trainNewModel(opts, trainOrders, testOrders) {
  console.log('*** NEW OPTIMIZATION', opts);

  const model = new Model(opts);

  if (!model.verifyData(trainOrders)) {
    throw new Exception('Data verification failed!');
  }

  console.time('Training');

  const { minLoss, minLossEpoch, maxAcc, maxAccEpoch } =
    await model.createAndTrainModel(trainOrders);

  console.timeEnd('Training');

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

  const { loss, acc, totalStats, bottomStats, topStats, top10, diffq } =
    model.testModel(testOrders);

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

  tf.disposeVariables();
  tf.dispose(model.model);

  const leak = tf.memory();
  console.log('Leaked Tensors:', leak.numTensors, 'Kb:', leak.numBytes / 1024);

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

module.exports = trainNewModel;
