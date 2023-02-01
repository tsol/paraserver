const tf = require('@tensorflow/tfjs');
const { entryStats, fobj, fnum } = require('../reports/helper');

class Model {
  epochs = 150;
  validationSplit = 0.2;
  adamRate = 0.001;
  batchSize = 32;

  layers = [
    { type: 'dense', units: 24, activation: 'relu' },
    { type: 'dense', units: 48, activation: 'relu' },
    { type: 'dropout', rate: 0.4 },
    { type: 'dense', units: 12, activation: 'relu' },
  ];

  createInputParams(order) {
    const params = [
      [order.isLong ? 1 : 0],
      [
        Number(order.entryPrice),
        order.flags.emac9,
        order.flags.emac20,
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
    return tf.tensor(order.result === 'won' ? [1, 0] : [0, 1]);
  }

  createBatchLabelTensor(ordersArray) {
    return tf.stack(
      ordersArray.map((o) => this.createOneLabelTensor(o)),
      0
    );
  }

  createAndTrainModel(size, ordersArray) {
    this.model = tf.sequential();

    this.model.add(
      tf.layers.dense({
        inputShape: [size],
        units: size,
        activation: 'relu',
      })
    );

    this.layers.forEach((layer) => {
      switch (layer.type) {
        case 'dropout':
          this.model.add(tf.layers.dropout(layer));
          break;
        default:
          this.model.add(tf.layers.dense(layer));
          break;
      }
    });

    this.model.add(tf.layers.dense({ units: 2, activation: 'softmax' }));

    this.model.compile({
      optimizer: tf.train.adam(this.adamRate),
      loss: 'categoricalCrossentropy',
      metrics: ['accuracy'],
    });
    //    loss: 'meanSquaredError',
    // metrics: ['mae'],

    return this.train(ordersArray);
  }

  async train(ordersArray) {
    const input = this.createBatchInputTensor(ordersArray);
    const labels = this.createBatchLabelTensor(ordersArray);

    console.log('Training model...');

    const history = await this.model.fit(input, labels, {
      epochs: this.epochs,
      batchSize: this.batchSize,
      validationSplit: this.validationSplit,
      verbose: false,
      callbacks: {
        onEpochEnd: async (epoch, logs) => {
          if (epoch % 20 !== 0) return;
          console.log(
            `Epoch ${epoch}: loss = ${logs.loss.toFixed(3)}; ` +
              `accuracy = ${logs.acc.toFixed(3)}; ` +
              `val_loss = ${logs.val_loss.toFixed(3)}; ` +
              `val_accuracy = ${logs.val_acc.toFixed(3)}`
          );
        },
      },
    });

    return history;
  }

  testModel(testOrders) {
    const testData = this.createBatchInputTensor(testOrders);
    const testLabels = this.createBatchLabelTensor(testOrders);

    /*
    console.log('Test data: ');
    testData.print();

    console.log('Test labels: ');
    testLabels.print();
    */

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
