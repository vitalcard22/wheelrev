require('dotenv').config();
const express = require('express');
const cors = require('cors');
const carsRouter = require('./routes/cars');
const ordersRouter = require('./routes/orders');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'wheelrev-backend' });
});

app.use('/api/cars', carsRouter);
app.use('/api/orders', ordersRouter);

app.listen(PORT, () => {
  console.log(`WheelRev backend running on port ${PORT}`);
});
