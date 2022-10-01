require('dotenv').config()
const { request, response } = require('express');
const express = require('express');
const app = express();
const mysql = require("mysql2");

const jsonParser = express.json();

const port = process.env.PORT;
const SECRET_KEY = process.env.SECRET_KEY;

const pool = mysql.createPool({
  connectionLimit: 10,
  host: process.env.DB_HOST,
  user: process.env.DB_USERNAME,
  database: process.env.DB_NAME,
  password: process.env.DB_PASS
});

app.disable('x-powered-by');
app.use(express.static('public'));
app.use('/api/', (req, res, next) => {
  if (!req.is('application/json') && req.method === 'POST') {
    return res.sendStatus(400);
  }
  next();
});

app.get("/", async (_, res) => {
  res.sendFile(__dirname + "/public/index.html");
});


function verifyToken(req, response, next) {
  const authHeader = req.headers['authorization'];
  if (authHeader == null) return response.sendStatus(401);
  if (!(authHeader === SECRET_KEY)) return response.sendStatus(403);
  next();
}

app.post('/api/save-weather/:device', [verifyToken, jsonParser], async (request, response) => {
  console.log(request.body);
  if (!request.body) return response.sendStatus(400);

  const device = request.params.device;
  const { t, h } = request.body;

  // validate
  if (!(t && h && device)) {
    return response.sendStatus(400);
  }

  pool.query(
    "INSERT INTO weather_stats (temperature, humidity, device) VALUES (?,?,?)",
    [t, h, device],
    function(err, _) {
      if(err) {
        console.log(err);
        return response.sendStatus(500);
      }
      response.sendStatus(200);
    }
  );
});

const getAll = (response) => {
  pool.query("SELECT temperature, humidity, date, device FROM weather_stats ORDER BY date",
  (err, rows) => {
    if (err) {
      console.error(err);
      return response.status(500).json({ err });
    }
    return response.status(200).json(rows, 200);
  });
};

const getAllByDevice = (device, response) => {
  pool.execute("SELECT temperature, humidity, date, device FROM weather_stats WHERE device = ?",
  [device],
  (err, rows) => {
    if (err) {
      console.error(err);
      return response.status(500).json({ err });
    }
    return response.status(200).json(rows, 200);
  });
};

const getAllByDeviceFromToNow = (device, from, response) => {
  pool.execute("SELECT temperature, humidity, date, device FROM weather_stats WHERE device = ? AND `date` >= ?",
  [device, date],
  (err, rows) => {
    if (err) {
      console.error(err);
      return response.status(500).json({ err });
    }
    return response.status(200).json(rows, 200);
  });
};

app.get('/api/show-weather', async (_, response) => {
  getAll(response);
});

app.get('/api/show-weather/:device', async (request, response) => {
  const { device } = request.params;
  if (device) {
    getAllByDevice(device, response);
  } else {
    return response.sendStatus(400);
  }
});

app.get('/api/show-weather/:device/:from', async (request, response) => {
  const { device, from } = request.params;
  if (device && from) {
    getAllByDeviceFromToNow(device, from, response);
  } else {
    return response.sendStatus(400);
  }
});

// app.get('/api/show-weather/:device/:from/:to', async (request, response) => {
//   const { device, from, to } = request.params;
//   if (!(device && from && to)) {
//     getAll(response);
//   } else if (device && !(from && to)) {
//     getAllByDevice(device, response);
//   }
// });

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});

