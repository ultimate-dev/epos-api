const router = require("express").Router();
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

router.get("/", async (req, res, next) => {
  try {
    let restaurants = await prisma.restaurant.findMany({
      where: req.decoded.restaurantId
        ? { status: "ACTIVE", id: req.restaurantId, supplierId: req.supplierId }
        : { status: "ACTIVE", supplierId: req.supplierId },
    });
    res.json({
      error: false,
      restaurants,
    });
  } catch (error) {
    console.error(error);
    res.json({ error: true });
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    let { id } = req.params;
    let restaurant = await prisma.restaurant.findFirst({ where: { id: parseInt(id) } });
    res.json({
      error: false,
      restaurant,
    });
  } catch (error) {
    console.error(error);
    res.json({ error: true });
  }
});

router.post("/:id", async (req, res, next) => {
  try {
    let { id } = req.params;
    let { name, logo, banner, locale } = req.body;
    console.log(typeof banner);
    await prisma.restaurant.update({
      where: { id: parseInt(id) },
      data: {
        name,
        logo,
        banner,
        locale,
      },
    });

    res.json({ error: false });
  } catch (error) {
    console.error(error);
    res.json({ error: true });
  }
});

module.exports = router;
