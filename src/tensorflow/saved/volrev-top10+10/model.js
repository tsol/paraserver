const tf = require('@tensorflow/tfjs');
const { entryStats, fobj } = require('../reports/helper');

class Model {
  epochsMin = 14;
  epochsMax = 150;

  validationSplit = 0.2;
  adamRate = 0.001;
  batchSize = 64;
  logEvery = 5;

  loss = 'categoricalCrossentropy';
  metrics = ['accuracy']; //  ['mae'], ['mse'], ['mape'], ['cosine']
  labelFn = (order) => (order.result === 'won' ? [1, 0] : [0, 1]);
  outLayer = { units: 2, activation: 'softmax' };

  // loss = 'meanSquaredError';
  // metrics = ['mae'];
  // labelFn = (order) => order.gainPercent;
  // outLayer = { units: 1, activation: 'relu' };

  layers = [
    { type: 'dense', units: 24, activation: 'relu' },
    { type: 'dense', units: 48, activation: 'relu' },
    { type: 'dense', units: 24, activation: 'relu' },
    { type: 'dropout', rate: 0.4 },
    { type: 'dense', units: 12, activation: 'relu' },
  ];

  createInputParams(order) {
    const params = [
      [order.isLong ? 1 : 0],
      [
        Number(order.entryPrice),
        order.flags.emac9,
        order.flags.emac21,
        order.flags.emac50,
        order.flags.emac100,
        order.flags.emac200,
      ],
      [order.flags.rsi14 / 100],
      //[order.flags.atr14],
      //[order.flags.hl_trend.bias],
      [(order.flags.macd.h + 100) / 200],
      [
        order.tags['LR.T'].value,
        order.tags['LR.S'].value,
        order.tags['LR.M'].value,
      ],
    ];

    return params;
  }

  constructor(candleReadCache) {
    this.model = null;
    this.candles = candleReadCache;
    console.log('Running with', tf.getBackend());
  }

  createNormalizedInputTensor(blocksArray) {
    const normalizedTensors = blocksArray.map((block) => {
      const t = tf.tensor1d(block);
      if (block.length === 1) {
        return t;
      }
      const min = t.min();
      const max = t.max();
      const divBy = max.sub(min);

      if (divBy.dataSync()[0] === 0) return tf.fill(t.shape, 0);

      return t.sub(min).div(divBy);
    });

    return tf.concat(normalizedTensors, 0);
  }

  async saveModel(modelSavePath) {
    await this.model.save(`file://${modelSavePath}`);
    console.log(`Saved model to path: ${modelSavePath}`);
  }

  loadModel(name) {}

  createOneInputTensor(order) {
    return this.createNormalizedInputTensor(this.createInputParams(order));
  }

  createBatchInputTensor(ordersArray) {
    return tf.stack(
      ordersArray.map((o) => this.createOneInputTensor(o)),
      0
    );
  }

  createOneLabelTensor(order) {
    return tf.tensor(this.labelFn(order));
  }

  createBatchLabelTensor(ordersArray) {
    return tf.stack(
      ordersArray.map((o) => this.createOneLabelTensor(o)),
      0
    );
  }

  createAndTrainModel(size, ordersArray) {
    this.model = tf.sequential();

    let wasFirst = false;

    this.layers.forEach((layer) => {
      switch (layer.type) {
        case 'dropout':
          this.model.add(tf.layers.dropout(layer));
          break;
        default:
          const denseLayer = { ...layer };
          if (!wasFirst) {
            wasFirst = true;
            denseLayer.inputShape = [size];
          }
          this.model.add(tf.layers.dense(denseLayer));
          break;
      }
    });

    this.model.add(tf.layers.dense(this.outLayer));

    this.model.compile({
      optimizer: tf.train.adam(this.adamRate),
      loss: this.loss,
      metrics: this.metrics,
    });

    return this.train(ordersArray);
  }

  async train(ordersArray) {
    const input = this.createBatchInputTensor(ordersArray);
    const labels = this.createBatchLabelTensor(ordersArray);

    console.log('Training model...');

    const earlyStopping = tf.callbacks.earlyStopping({
      monitor: 'val_loss',
      minDelta: 0.001,
      patience: 5,
      mode: 'min',
      verbose: 1000,
    });

    let minLoss = Infinity;
    let minLossEpoch = 0;

    let maxAcc = 0;
    let maxAccEpoch = 0;

    const onEpochEnd = (epoch, logs) => {
      if (logs.val_loss < minLoss) {
        minLoss = logs.val_loss;
        minLossEpoch = epoch;
      }

      if (logs.val_acc > maxAcc) {
        maxAcc = logs.val_acc;
        maxAccEpoch = epoch;
      }

      if (epoch % this.logEvery !== 0) return;
      console.log(`epoch ${epoch}`, fobj(logs, 5));
    };

    const history1 = await this.model.fit(input, labels, {
      epochs: this.epochsMin,
      batchSize: this.batchSize,
      validationSplit: this.validationSplit,
      shuffle: true,
      callbacks: { onEpochEnd },
      verbose: 0,
    });

    const history2 = await this.model.fit(input, labels, {
      epochs: this.epochs,
      batchSize: this.batchSize,
      validationSplit: this.validationSplit,
      shuffle: true,
      callbacks: [earlyStopping],
      verbose: 1,
    });

    console.log('Min loss: ', minLoss, 'at epoch', minLossEpoch);
    console.log('Max acc: ', maxAcc, 'at epoch', maxAccEpoch);

    return [history1, history2];
  }

  testModel(testOrders) {
    const testData = this.createBatchInputTensor(testOrders);
    const testLabels = this.createBatchLabelTensor(testOrders);

    // console.log('Test data: ');
    // testData.print();

    // console.log('Test labels: ');
    // testLabels.print();

    const evalOutput = this.model.evaluate(testData, testLabels);

    console.log(
      'Loss:    ',
      evalOutput[0].dataSync()[0],
      'Accuracy:',
      evalOutput[1].dataSync()[0]
    );

    const testResult = [];
    for (const order of testOrders) {
      const res = this.predict(order);
      testResult.push([res, order]);
    }

    const testResultOrders = testResult
      .sort((a, b) => b[0] - a[0])
      .map(([score, order]) => order);

    const testResultScores = testResult
      .sort((a, b) => b[0] - a[0])
      .map(([score, order]) => score);

    // console.log('testResultScores: ', testResultScores);

    const totalStats = entryStats(testResultOrders);
    const topStats = entryStats(
      testResultOrders.slice(0, testResultOrders.length / 2)
    );
    const bottomStats = entryStats(
      testResultOrders.slice(
        testResultOrders.length / 2,
        testResultOrders.length
      )
    );

    const top10 = entryStats(
      testResultOrders.slice(0, Math.floor(testResultOrders.length * 0.1))
    );

    console.log('total:     ', fobj(totalStats));
    console.log('bottom 50: ', fobj(bottomStats));
    console.log('top 50:    ', fobj(topStats));
    console.log('top 10:    ', fobj(top10));

    const differentScores = {};
    for (const score of testResultScores) {
      differentScores[score] = true;
    }

    console.log(
      'Diff ',
      Object.keys(differentScores).length,
      ' / ',
      testOrders.length
    );
  }

  predict(order) {
    const tensor = this.createOneInputTensor(order).expandDims();
    const prediction = this.model.predict(tensor).dataSync();
    return prediction[0];
  }
}

module.exports = Model;
