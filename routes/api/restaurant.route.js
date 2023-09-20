const router = require("express").Router();
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

router.get("/", async (req, res, next) => {
  try {
    let restaurant = await prisma.restaurant.findFirst({
      where: { status: "ACTIVE", id: req.restaurantId },
    });

    res.json({
      error: false,
      restaurant,
    });
  } catch (error) {
    console.error(error);
    res.json({ error: true });
  }
});

module.exports = router;
