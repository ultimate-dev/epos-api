const router = require("express").Router();
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

router.get("/stock", async (req, res, next) => {
  try {
    let ingredientStocks = await prisma.ingredientStock.findMany({
      where: {
        AND: [
          { OR: [{ status: "ACTIVE" }, { status: "PASSIVE" }] },
          {
            OR: [
              { product: { restaurantId: req.restaurantId } },
              {
                modifierProduct: { modifierGroup: { product: { restaurantId: req.restaurantId } } },
              },
            ],
          },
        ],
      },
    });
    res.json({
      error: false,
      ingredientStocks,
    });
  } catch (error) {
    console.error(error);
    res.json({ error: true });
  }
});

router.put("/stock", async (req, res, next) => {
  try {
    let { quantity, ingredientId, stockCodeId, productId, modifierProductId } = req.body;

    await prisma.ingredientStock.create({
      data: {
        quantity: parseFloat(quantity),
        ingredientId,
        stockCodeId,
        productId,
        modifierProductId,
      },
    });

    res.json({ error: false });
  } catch (error) {
    console.error(error);
    res.json({ error: true });
  }
});

router.post("/stock/:id", async (req, res, next) => {
  try {
    let { id } = req.params;
    let { quantity, ingredientId, stockCodeId, productId, modifierProductId } = req.body;

    await prisma.ingredientStock.update({
      where: { id: parseInt(id) },
      data: {
        quantity: parseFloat(quantity),
        ingredientId,
        stockCodeId,
        productId,
        modifierProductId,
      },
    });

    res.json({ error: false });
  } catch (error) {
    console.error(error);
    res.json({ error: true });
  }
});

router.delete("/stock/:id", async (req, res, next) => {
  try {
    let { id } = req.params;
    await prisma.ingredientStock.update({
      where: { id: parseInt(id) },
      data: { status: "DELETED" },
    });

    res.json({
      error: false,
    });
  } catch (error) {
    console.error(error);
    res.json({ error: true });
  }
});

router.get("/", async (req, res, next) => {
  try {
    let ingredients = await prisma.ingredient.findMany({
      where: {
        OR: [{ status: "ACTIVE" }, { status: "PASSIVE" }],
        restaurantId: req.restaurantId,
      },
    });
    res.json({
      error: false,
      ingredients,
    });
  } catch (error) {
    console.error(error);
    res.json({ error: true });
  }
});

router.put("/", async (req, res, next) => {
  try {
    let { name, status, barcode, quantityType } = req.body;

    await prisma.ingredient.create({
      data: {
        name,
        status,
        barcode,
        quantityType,
        restaurantId: req.restaurantId,
      },
    });

    res.json({ error: false });
  } catch (error) {
    console.error(error);
    res.json({ error: true });
  }
});

router.post("/:id", async (req, res, next) => {
  try {
    let { id } = req.params;
    let { name, status, barcode, quantityType } = req.body;

    await prisma.ingredient.update({
      where: { id: parseInt(id) },
      data: {
        name,
        status,
        barcode,
        quantityType,
      },
    });

    res.json({ error: false });
  } catch (error) {
    console.error(error);
    res.json({ error: true });
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    let { id } = req.params;
    await prisma.ingredient.update({
      where: { id: parseInt(id) },
      data: { status: "DELETED" },
    });

    res.json({
      error: false,
    });
  } catch (error) {
    console.error(error);
    res.json({ error: true });
  }
});

module.exports = router;
