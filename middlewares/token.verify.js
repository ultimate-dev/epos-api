const jwt = require("jsonwebtoken");
module.exports = (req, res, next) => {
  let token = req.headers["authorization"];
  if (token) {
    jwt.verify(token.split(" ")[1], process.env.SECRET_KEY, (err, decoded) => {
      if (!err) {
        req.decoded = decoded;
        req.restaurantId = decoded.restaurantId || parseInt(req.headers["restaurant_id"]);
        req.supplierId = decoded.supplierId;
        next();
      } else {
        res.json({ error: true, message: "Token is Incorrect" });
      }
    });
  } else {
    res.json({ error: true, message: "Token Not Found" });
  }
};
