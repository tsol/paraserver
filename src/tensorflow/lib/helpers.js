function dataSplit(data, split) {
  const trainSize = Math.floor(data.length * (1 - split));
  const trainData = data.slice(0, trainSize);
  const testData = data.slice(trainSize, data.length);
  return [trainData, testData];
}

module.exports = { dataSplit };
