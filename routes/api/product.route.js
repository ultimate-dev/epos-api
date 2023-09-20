const router = require("express").Router();
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

router.get("/", async (req, res, next) => {
  try {
    let products = await prisma.product.findMany({
      where: { status: "ACTIVE", restaurantId: req.restaurantId },
      include: {
        ingredientStocks: {
          where: { status: "ACTIVE", ingredient: { status: "ACTIVE" } },
          include: {
            ingredient: {
              include: { translations: { select: { code: true, translate: true, area: true } } },
            },
          },
        },
        modifierGroups: {
          where: { status: "ACTIVE" },
          include: {
            modifierProducts: {
              where: { status: "ACTIVE" },
              include: {
                translations: {
                  select: { code: true, translate: true, area: true },
                },
              },
            },
            translations: {
              select: { code: true, translate: true, area: true },
            },
          },
        },
        translations: { select: { code: true, translate: true, area: true } },
      },
    });

    res.json({
      error: false,
      products,
    });
  } catch (error) {
    console.error(error);
    res.json({ error: true });
  }
});

module.exports = router;
