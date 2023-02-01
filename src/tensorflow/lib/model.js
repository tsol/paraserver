const tf = require('@tensorflow/tfjs');
const { entryStats, fobj } = require('../../reports/helper');

class Model {
  inputsSize = null;

  params = {
    verbose: 1,
    epochsMin: 14,
    epochsMax: 50,

    validationSplit: 0.2,
    adamRate: 0.001,
    batchSize: 64,
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

  constructor(setParams) {
    this.model = null;
    Object.entries(setParams).forEach(([key, value]) => {
      this.params[key] = value;
    });
  }

  verifyData(orders) {
    if (orders.length < 1) {
      console.error('No orders to train on!');
      return false;
    }
    const t = this.createOneInputTensor(orders[0]);
    this.inputsSize = t.size;
    t.dispose();

    // todo: this needs to run inputFn and labelFn on each order
    // and verify that there are no constant field across the set
    // cause that will  most likele mean an error in inputFn or
    // lack of neccessary flags / tags
    return true;
  }

  createNormalizedInputTensor(blocksArray) {
    return tf.tidy(() => {
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
    });
  }

  createOneInputTensor(order) {
    return this.createNormalizedInputTensor(this.params.inputsFn(order));
  }

  createBatchInputTensor(ordersArray) {
    return tf.stack(
      ordersArray.map((o) => this.createOneInputTensor(o)),
      0
    );
  }

  createOneLabelTensor(order) {
    return tf.tensor(this.params.labelFn(order));
  }

  createBatchLabelTensor(ordersArray) {
    return tf.stack(
      ordersArray.map((o) => this.createOneLabelTensor(o)),
      0
    );
  }

  createAndTrainModel(ordersArray) {
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

    return this.train(ordersArray);
  }

  async train(ordersArray) {
    tf.engine().startScope();

    let minLoss = Infinity;
    let minLossEpoch = 0;

    let maxAcc = 0;
    let maxAccEpoch = 0;

    const input = this.createBatchInputTensor(ordersArray);
    const labels = this.createBatchLabelTensor(ordersArray);

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

    await this.model.fit(input, labels, {
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
      await this.model.fit(input, labels, {
        epochs: this.params.epochsMax,
        batchSize: this.params.batchSize,
        validationSplit: this.params.validationSplit,
        shuffle: true,
        callbacks: [earlyStopping],
        verbose: this.params.verbose,
      });
    }

    tf.dispose(input);
    tf.dispose(labels);

    tf.engine().endScope();

    return { minLoss, minLossEpoch, maxAcc, maxAccEpoch };
  }

  testModel(testOrders) {
    if (testOrders.length === 0) throw new Error('test data empty');

    return tf.tidy(() => {
      const testData = this.createBatchInputTensor(testOrders);
      const testLabels = this.createBatchLabelTensor(testOrders);

      const evalOutput = this.model.evaluate(testData, testLabels);

      const loss = evalOutput[0].dataSync()[0];
      const acc = evalOutput[1].dataSync()[0];

      tf.dispose(testData);
      tf.dispose(testLabels);

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
    });
  }

  predict(order) {
    const tensor = this.createOneInputTensor(order).expandDims();
    const prediction = this.model.predict(tensor).dataSync();
    tensor.dispose();
    return prediction[0];
  }
}

module.exports = Model;
