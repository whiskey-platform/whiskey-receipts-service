const path = require('path');
const { generate } = require('openapi-typescript-validator');

generate({
  schemaFile: path.join(__dirname, 'openapi.yaml'),
  schemaType: 'yaml',
  directory: path.join(__dirname, '/generated'),
});
