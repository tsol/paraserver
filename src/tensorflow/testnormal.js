const tf = require('@tensorflow/tfjs');

const tensor1 = tf.tensor2d([
  [1, 2],
  [3, 4],
]);
const tensor2 = tf.tensor2d([
  [5, 6],
  [7, 8],
]);
const concatenatedTensor = tf.concat([tensor1, tensor2], 1);

concatenatedTensor.print();

// Define the data
const candleData = tf.tensor2d([
  [100, 105, 110, 95, 1000],
  [105, 110, 115, 100, 2000],
  [110, 115, 120, 105, 1500],
  [115, 120, 125, 110, 2500],
]);

// Normalize the data
const min = candleData.min();
const max = candleData.max();
const normCandleData = candleData.sub(min).div(max.sub(min));

//const { min, max } = tf.data.minMax(candleData);
//const normCandleData = tf.data.normalization(candleData, min, max);

normCandleData.print();
