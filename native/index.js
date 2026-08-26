const path = require('node:path');

const addon = require(path.join(__dirname, '../build/Release/simulation_addon.node'));

module.exports = {
  modelIndividual: addon.modelIndividual
};