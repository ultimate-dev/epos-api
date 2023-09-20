const router = require("express").Router();
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const prisma = new PrismaClient();

router.post("/login", async (req, res, next) => {
  try {
    let { admin = false } = req.query;
    let { email, password } = req.body;
    let user = await prisma.user.findFirst({
      where: {
        status: "ACTIVE",
        email,
        OR: admin ? [{ role: "ADMIN" }, { role: "SUPERADMIN" }] : [{ role: "USER" }],
      },
    });
    if (user) {
      let passwordCompare = await bcrypt.compare(password, user.password);

      if (passwordCompare) {
        user["letters"] = user.name[0] + user.surname[0];

        let token = await jwt.sign({ ...user, time: new Date() }, process.env.SECRET_KEY);
        res.json({
          error: false,
          user,
          token,
        });
      } else {
        res.json({
          error: true,
        });
      }
    } else {
      res.json({
        error: true,
      });
    }
  } catch (error) {
    res.json({
      error: true,
    });
  }
});

router.post("/verify", async (req, res, next) => {
  try {
    let { admin = false } = req.query;
    let { token } = req.body;
    if (token) {
      let decoded = await jwt.verify(token, process.env.SECRET_KEY);
      if (decoded) {
        let user = await prisma.user.findFirst({
          where: {
            status: "ACTIVE",
            email: decoded.email,
            OR: admin ? [{ role: "ADMIN" }, { role: "SUPERADMIN" }] : [{ role: "USER" }],
          },
        });
        if (user)
          res.json({
            error: false,
            user: decoded,
          });
        else {
          res.json({
            error: true,
          });
        }
      } else {
        res.json({
          error: true,
        });
      }
    } else {
      res.json({
        error: true,
      });
    }
  } catch (error) {
    res.json({
      error: true,
    });
  }
});
module.exports = router;
