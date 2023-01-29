const tf = require('@tensorflow/tfjs');

class Model {
  testItems = 100;
  epochs = 100;
  validationSplit = 0.2;
  adamRate = 0.001;
  batchSize = 16;

  layers = [{ units: 64, activation: 'relu' }];
  layers = [{ units: 20, activation: 'relu' }];

  createInputParams(order, candlesArray) {
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

  constructor() {
    this.model = null;
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

  createOneInputTensor(order, candlesArray) {
    return this.createNormalizedInputTensor(
      this.createInputParams(order, candlesArray)
    );
  }

  createBatchInputTensor(ordersArray, candlesArray) {
    return tf.stack(
      ordersArray.map((o) => this.createOneInputTensor(o, candlesArray)),
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

  createAndTrainModel(size, ordersArray, candlesArray) {
    this.model = tf.sequential();

    this.model.add(
      tf.layers.dense({
        inputShape: [size],
        units: size,
        activation: 'relu',
      })
    );

    this.layers.forEach((layer) => this.model.add(tf.layers.dense(layer)));

    this.model.add(tf.layers.dense({ units: 2, activation: 'softmax' }));

    this.model.compile({
      optimizer: tf.train.adam(this.adamRate),
      loss: 'categoricalCrossentropy',
      metrics: ['accuracy'],
    });
    //    loss: 'meanSquaredError',
    // metrics: ['mae'],

    return this.train(ordersArray, candlesArray);
  }

  async train(ordersArray, candlesArray) {
    const input = this.createBatchInputTensor(ordersArray, candlesArray);
    const labels = this.createBatchLabelTensor(ordersArray);

    console.log('Training model...');

    const history = await this.model.fit(input, labels, {
      epochs: this.epochs,
      batchSize: this.batchSize,
      validationSplit: this.validationSplit,
      verbose: false,
      callbacks: {
        onEpochEnd: async (epoch, logs) => {
          console.log(
            `Epoch ${epoch}: loss = ${logs.loss.toFixed(3)}; ` +
              `accuracy = ${logs.acc.toFixed(3)}; ` +
              `val_loss = ${logs.val_loss.toFixed(3)}; ` +
              `val_accuracy = ${logs.val_acc.toFixed(3)}`
          );
        },
      },
    });

    const testOrders = ordersArray.slice(-1 * this.testItems);

    const testData = this.createBatchInputTensor(testOrders, candlesArray);
    const testLabels = this.createBatchLabelTensor(testOrders);

    console.log('Test data: ');
    testData.print();

    console.log('Test labels: ');
    testLabels.print();

    const evalOutput = this.model.evaluate(testData, testLabels);

    let testResult = [];

    for (const order of testOrders) {
      const tensor = this.createOneInputTensor(
        order,
        candlesArray
      ).expandDims();
      const prediction = await this.model.predict(tensor).data();
      testResult.push([prediction[0], order, prediction]);
    }

    testResult = testResult.sort((a, b) => b[0] - a[0]);
    testResult.forEach((r) => {
      console.log(
        `  ${r[0].toFixed(3)} - ${r[1].result}, ${
          r[1].strategy
        }, ${r[1].getType()} `
      );
    });

    console.log(
      `\nEvaluation result:\n` +
        `  Loss = ${evalOutput[0].dataSync()[0].toFixed(3)}; ` +
        `Accuracy = ${evalOutput[1].dataSync()[0].toFixed(3)}`
    );

    return history;
  }

  async predict(order, candlesArray) {}
}

module.exports = Model;
