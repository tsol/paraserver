const maxParams = 7;
const maxIndexes = 4;

const composers = [
  (inputsCount, params) => {
    const modelMuls = [0.9, 1, 1.2, 1.3];

    const denseUnitsMuls = [
      [1, 2, 2.5, 3],
      [0, 0.9, 1.1, 1.2],
      [0, 0.75, 1.1, 0.25],
      [0, 0, 0.75, 0.9],
    ];

    const dropoutAfterPositions = [-1, 0, 1, 2];
    const dropoutRates = [0.1, 0.2, 0.3, 0.4];

    const layers = [];

    const modelMul = modelMuls[params.shift()];
    const dropoutAfterPosition = dropoutAfterPositions[params.shift()];
    const dropoutRate = dropoutRates[params.shift()];

    let nodesCount = inputsCount;

    for (let i = 0; i < denseUnitsMuls.length; i++) {
      const unitsMulBy = denseUnitsMuls[i][params[i]];

      if (unitsMulBy > 0) {
        nodesCount = Math.ceil(nodesCount * unitsMulBy * modelMul);
        if (nodesCount < 2) {
          console.log('composer early break', i);
          break;
        }
        layers.push({ type: 'dense', units: nodesCount });
      }

      if (dropoutAfterPosition === i && layers.length > 0)
        layers.push({ type: 'dropout', rate: dropoutRate });
    }

    return layers;
  },
];

module.exports = { maxParams, maxIndexes, composers };
