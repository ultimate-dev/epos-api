const router = require("express").Router();
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

router.get("/", async (req, res, next) => {
  try {
    let categories = await prisma.category.findMany({
      where: { status: "ACTIVE", restaurantId: req.restaurantId },
      include: {
        tables: { select: { id: true }, where: { status: "ACTIVE" } },
        products: { select: { id: true }, where: { status: "ACTIVE" } },
        translations: {
          select: { code: true, translate: true, area: true },
        },
      },
    });

    res.json({
      error: false,
      categories,
    });
  } catch (error) {
    console.error(error);
    res.json({ error: true });
  }
});

module.exports = router;
