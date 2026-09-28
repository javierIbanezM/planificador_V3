'use strict';

const app = require('./app');

const PORT = process.env.PORT || 8010;

app.listen(PORT, () => {
  console.log(`Planificador (Node) escuchando en http://localhost:${PORT}`);
});
