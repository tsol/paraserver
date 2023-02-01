const layerComposer = require('../lib/layersComposer');

// random integer between 0 and 4
const randomInt = (max) => Math.floor(Math.random() * max);

let params = [];

for (i = 0; i < layerComposer.maxParams; i++) {
  params.push(randomInt(layerComposer.maxIndexes));
}

//params = [2, 0, 3, 2, 1, 2, 2];

console.log(params);

const layers = layerComposer.composers[0](12, params);

console.log(layers);
