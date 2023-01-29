const tf = require('@tensorflow/tfjs');

const srcData = [
  [10, 20, 30, 40, 50],
  [20, 30, 40, 50, 60],
  [30, 40, 50, 60, 70],
  [40, 50, 60, 70, 80],
  [50, 60, 70, 80, 90],
  [60, 70, 80, 90, 100],
  [1000, 1010, 1020, 1030, 1040],
];

const dataLen = 4;

const srcIn = srcData.map((item) => item.slice(0, dataLen));
const srcLbl = srcData.map((item) => item.slice(dataLen, dataLen + 1));

const data = tf.tensor(srcIn);
const labels = tf.tensor(srcLbl);

const testData = tf.tensor(srcIn);
const testLabels = tf.tensor(srcLbl);

const testArray = [
  ...srcIn,
  ...srcIn.map((i) => i.map((v) => v + 5)),
  ...srcIn.map((i) => i.map((v) => v + 1002)),
];

const model = tf.sequential();

model.add(
  tf.layers.dense({
    inputShape: [dataLen],
    units: dataLen,
    activation: 'relu',
  })
);

model.add(tf.layers.dense({ units: 8, activation: 'relu' }));
model.add(tf.layers.dense({ units: 1 }));

const optimizer = tf.train.adam(0.001);
model.compile({
  optimizer: optimizer,
  loss: 'meanSquaredError',
  metrics: ['mae'],
});

(async () => {
  const history = await model.fit(data, labels, {
    epochs: 5000,
    batchSize: 32,
    validationSplit: 0.2,
    verbose: false,
  });

  const evalOutput = model.evaluate(testData, testLabels);

  console.log(
    `\nEvaluation result:\n` +
      `  Loss = ${evalOutput[0].dataSync()[0].toFixed(3)}; ` +
      `Accuracy = ${evalOutput[1].dataSync()[0].toFixed(3)}`
  );

  for (const item of testArray) {
    const tensor = tf.tensor([item]);
    const prediction = await model.predict(tensor).data();
    console.log('Prediction: ', item, ' = ', prediction);
  }
})();
