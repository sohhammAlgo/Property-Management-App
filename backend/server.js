const express = require('express');
const app = express();
require('dotenv').config();
const PORT = process.env.PORT || 5000;
// const {initsocket} = require('./socket');

app.use(express.json());

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});