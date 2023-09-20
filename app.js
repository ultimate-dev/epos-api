/**
 * Dependencies
 */
const express = require("express");
const createError = require("http-errors");
const morgan = require("morgan");
const cors = require("cors");
require("dotenv").config();

/**
 * App
 */
const app = express();

/**
 * Middlewares
 */
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));
app.use("/public", express.static(__dirname + "/public"));

/**
 * Start Page
 */
app.get("/", async (req, res, next) => {
  res.send({ message: "Hello World" });
});

/**
 * Routes
 */
app.use("/auth", require("./routes/auth.route"));
// Api Routes
app.use(`/api`, require("./middlewares/token.verify"));
app.use(`/api/restaurant`, require("./routes/api/restaurant.route"));
app.use(`/api/category`, require("./routes/api/category.route"));
app.use(`/api/table`, require("./routes/api/table.route"));
app.use(`/api/product`, require("./routes/api/product.route"));
app.use(`/api/order`, require("./routes/api/order.route"));
app.use(`/api/payment`, require("./routes/api/payment.route"));
app.use(`/api/case`, require("./routes/api/case.route"));
// Panel Routes
app.use(`/panel`, require("./middlewares/token.verify"));
app.use(`/panel/upload`, require("./routes/panel/upload.route"));
app.use(`/panel/account`, require("./routes/panel/account.route"));
app.use(`/panel/restaurant`, require("./routes/panel/restaurant.route"));
app.use(`/panel/product`, require("./routes/panel/product.route"));
app.use(`/panel/table`, require("./routes/panel/table.route"));
app.use(`/panel/category`, require("./routes/panel/category.route"));
app.use(`/panel/modifier`, require("./routes/panel/modifier.route"));
app.use(`/panel/ingredient`, require("./routes/panel/ingredient.route"));
app.use(`/panel/translation`, require("./routes/panel/translation.route"));
app.use(`/panel/order`, require("./routes/panel/order.route"));
app.use(`/panel/payment`, require("./routes/panel/payment.route"));
app.use(`/panel/case`, require("./routes/panel/case.route"));
app.use(`/panel/stock`, require("./routes/panel/stock.route"));
app.use(`/panel/trash`, require("./routes/panel/trash.route"));

/**
 * Http 404 Error
 */
app.use((req, res, next) => {
  next(createError.NotFound());
});

/**
 * Http 500 Error
 */
app.use((err, req, res, next) => {
  res.status(err.status || 500);
  res.send({
    status: err.status || 500,
    message: err.message,
  });
});

module.exports = app;
