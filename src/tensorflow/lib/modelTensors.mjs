import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const tf = require('@tensorflow/tfjs');

export function createNormalizedInputTensor(inputGrouppedArray) {
  return tf.tidy(() => {
    const normalizedTensors = inputGrouppedArray.map((block) => {
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

export function createOneInputTensor(order, inputsFn) {
  return createNormalizedInputTensor(inputsFn(order));
}

export function createBatchInputTensor(ordersArray, inputsFn) {
  return tf.stack(
    ordersArray.map((o) => createOneInputTensor(o, inputsFn)),
    0
  );
}

export function createOneLabelTensor(order, labelFn) {
  return tf.tensor(labelFn(order));
}

export function createBatchLabelTensor(ordersArray, labelFn) {
  return tf.stack(
    ordersArray.map((o) => createOneLabelTensor(o, labelFn)),
    0
  );
}

export function createTensors(trainOrders, testOrders, inputFn, labelFn) {
  tf.engine().startScope();

  const res = {
    trainInputs: createBatchInputTensor(trainOrders, inputFn),
    trainLabels: createBatchLabelTensor(trainOrders, labelFn),
    testInputs: createBatchInputTensor(testOrders, inputFn),
    testLabels: createBatchLabelTensor(testOrders, labelFn),
  };

  return res;
}

export function cleanupTensors(tenorsCreatetObj) {
  tenorsCreatetObj.trainInputs.dispose();
  tenorsCreatetObj.trainLabels.dispose();
  tenorsCreatetObj.testInputs.dispose();
  tenorsCreatetObj.testLabels.dispose();
  tf.disposeVariables();

  tf.engine().endScope();

  const leak = tf.memory();

  if (leak.numTensors > 10)
    console.log(
      '   leak:',
      leak.numTensors,
      'tns, ',
      fnum(leak.numBytes / 1024, 3),
      'kb'
    );
}
