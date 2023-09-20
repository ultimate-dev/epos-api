const router = require("express").Router();
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

router.get("/", async (req, res, next) => {
  try {
    let tables = await prisma.table.findMany({
      where: { status: "ACTIVE", restaurantId: req.restaurantId },
    });

    res.json({
      error: false,
      tables,
    });
  } catch (error) {
    console.error(error);
    res.json({ error: true });
  }
});

module.exports = router;
