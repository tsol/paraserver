import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const tf = require('@tensorflow/tfjs');
const { entryStats, fobj } = require('../../reports/helper');

import { createOneInputTensor } from './modelTensors.mjs';

export const modelDefaults = {
  verbose: 1,
  epochsMin: 14,
  epochsMax: 50,

  validationSplit: 0.2,
  adamRate: 0.001,
  batchSize: 32,
  logEveryEpoch: 10,

  loss: 'categoricalCrossentropy', // 'meanSquaredError'
  metrics: ['accuracy'], //  ['mae'], ['mse'], ['mape'], ['cosine']
  labelFn: (order) => (order.result === 'won' ? [1, 0] : [0, 1]),
  outLayer: { units: 2, activation: 'softmax' },

  layers: [
    { type: 'dense', units: 24, activation: 'relu' },
    { type: 'dense', units: 48, activation: 'relu' },
    { type: 'dense', units: 24, activation: 'relu' },
    { type: 'dropout', rate: 0.4 },
    { type: 'dense', units: 12, activation: 'relu' },
  ],

  inputsFn: (order) => [
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
    [(order.flags.macd.h + 100) / 200],
    [
      order.tags['LR.T'].value,
      order.tags['LR.S'].value,
      order.tags['LR.M'].value,
    ],
  ],

  esMonitor: 'val_loss',
  esDelta: 0.001,
  esPatience: 1,
  esMode: 'min',
};

export default class Model {
  inputsSize = null;
  params = null;

  constructor(setParams) {
    this.model = null;
    this.params = { ...modelDefaults, ...setParams };
  }

  setInputsSize(size) {
    this.inputsSize = size;
  }

  getInputsSize() {
    return this.inputsSize;
  }

  setLayers(layers) {
    this.params.layers = layers;
    if (this.params.verbose > 0) console.log('Composed layers:', layers);
  }

  createModel() {
    if (!this.inputsSize) throw new Error('must model->verifyData() first');

    this.model = tf.sequential();

    let wasFirst = false;

    this.params.layers.forEach((layer) => {
      switch (layer.type) {
        case 'dropout':
          this.model.add(tf.layers.dropout(layer));
          break;
        default:
          const denseLayer = { ...layer };
          if (!wasFirst) {
            wasFirst = true;
            denseLayer.inputShape = [this.inputsSize];
          }
          this.model.add(tf.layers.dense(denseLayer));
          break;
      }
    });

    this.model.add(tf.layers.dense(this.params.outLayer));

    this.model.compile({
      optimizer: tf.train.adam(this.params.adamRate),
      loss: this.params.loss,
      metrics: this.params.metrics,
    });

    return true;
  }

  async trainModel(inputTensorBatch, labelTensorBatch) {
    // tf.engine().startScope();

    let minLoss = Infinity;
    let minLossEpoch = 0;

    let maxAcc = 0;
    let maxAccEpoch = 0;

    const earlyStopping = tf.callbacks.earlyStopping({
      monitor: this.params.esMonitor,
      minDelta: this.params.esDelta,
      patience: this.params.esPatience,
      mode: this.params.esMode,
      verbose: this.params.verbose,
    });

    const onEpochEnd = (epoch, logs) => {
      if (logs.val_loss < minLoss) {
        minLoss = logs.val_loss;
        minLossEpoch = epoch;
      }

      if (logs.val_acc > maxAcc) {
        maxAcc = logs.val_acc;
        maxAccEpoch = epoch;
      }

      if (!this.params.verbose || epoch % this.params.logEveryEpoch !== 0)
        return;
      console.log(`epoch ${epoch}`, fobj(logs, 5));
    };

    await this.model.fit(inputTensorBatch, labelTensorBatch, {
      epochs: this.params.esMonitor
        ? this.params.epochsMin
        : this.params.epochsMax,
      batchSize: this.params.batchSize,
      validationSplit: this.params.validationSplit,
      shuffle: true,
      callbacks: { onEpochEnd },
      verbose: this.params.verbose,
    });

    if (this.params.esMonitor) {
      await this.model.fit(inputTensorBatch, labelTensorBatch, {
        epochs: this.params.epochsMax,
        batchSize: this.params.batchSize,
        validationSplit: this.params.validationSplit,
        shuffle: true,
        callbacks: [earlyStopping],
        verbose: this.params.verbose,
      });
    }

    // tf.engine().endScope();

    return { minLoss, minLossEpoch, maxAcc, maxAccEpoch };
  }

  testModel(testInputTensorBatch, testLabelTensorBatch, testOrders) {
    const evalOutput = this.model.evaluate(
      testInputTensorBatch,
      testLabelTensorBatch
    );

    const loss = evalOutput[0].dataSync()[0];
    const acc = evalOutput[1].dataSync()[0];

    // todo: possible remake this somehow to only tensors?
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

    const differentScores = {};
    for (const score of testResultScores) {
      differentScores[score] = true;
    }

    const diffq = Object.keys(differentScores).length / testOrders.length;

    return {
      loss,
      acc,
      totalStats,
      bottomStats,
      topStats,
      top10,
      diffq,
    };
  }

  predict(order) {
    const tensor = createOneInputTensor(
      order,
      this.params.inputsFn
    ).expandDims();
    const prediction = this.model.predict(tensor).dataSync();
    tensor.dispose();
    return prediction[0];
  }

  dispose() {
    tf.dispose(this.model);
  }
}
