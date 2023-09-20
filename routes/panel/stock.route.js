const router = require("express").Router();
const { PrismaClient } = require("@prisma/client");
const _ = require("lodash");
const prisma = new PrismaClient();
const getOneDayAgoDate = require("../../utils/getOneDayAgoDate");

router.get("/", async (req, res, next) => {
  try {
    let { startDate = new Date(), endDate = new Date() } = req.query;
    let stocks = await prisma.stock.findMany({
      where: {
        OR: [{ status: "ACTIVE" }, { status: "PASSIVE" }],
        restaurantId: req.restaurantId,
        ingredient: { status: "ACTIVE" },
        stockCode: { status: "ACTIVE" },
        createdAt: {
          gte: getOneDayAgoDate(new Date(startDate), 1),
          lte: getOneDayAgoDate(new Date(endDate), 0),
        },
      },
      orderBy: { updatedAt: "desc" },
      include: {
        ingredient: true,
        ingredientStock: {
          include: { product: true, modifierProduct: { include: { modifierGroup: true } } },
        },
        stockCode: true,
        orderProduct: true,
      },
    });

    let _stocks = [];

    await Promise.all(
      stocks.map(async (stock) => {
        let group = await prisma.stock.aggregate({
          where: {
            ingredientId: stock.ingredientId,
            status: stock.status,
            stockCodeId: stock.stockCodeId,
            createdAt: { lte: stock.createdAt },
          },
          _sum: { quantity: true },
        });
        _stocks.push({ ...stock, total: group._sum.quantity });
      })
    );

    res.json({
      error: false,
      stocks: _stocks,
    });
  } catch (error) {
    console.error(error);
    res.json({ error: true });
  }
});

router.put("/", async (req, res, next) => {
  try {
    let { quantity, ingredientId, stockCodeId, status } = req.body;
    await prisma.stock.create({
      data: {
        status,
        quantity: parseFloat(quantity),
        ingredientId,
        stockCodeId,
        restaurantId: req.restaurantId,
      },
    });
    res.json({ error: false });
  } catch (error) {
    console.log(error);
    res.json({ error: true });
  }
});
router.post("/:id", async (req, res, next) => {
  try {
    let { id } = req.params;
    let { quantity, ingredientId, stockCodeId, status } = req.body;
    await prisma.stock.update({
      where: { id: parseInt(id) },
      data: {
        quantity: parseFloat(quantity),
        ingredientId,
        stockCodeId,
        status,
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
    await prisma.stock.update({
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
//
router.get("/group", async (req, res, next) => {
  try {
    let stockGroups = await prisma.stock.groupBy({
      by: ["ingredientId", "stockCodeId", "status"],
      _sum: { quantity: true },
      where: {
        OR: [{ status: "ACTIVE" }, { status: "PASSIVE" }],
        restaurantId: req.restaurantId,
        ingredient: { status: "ACTIVE" },
        stockCode: { status: "ACTIVE" },
      },
      orderBy: { _sum: { quantity: "asc" } },
    });

    let _stockGroups = [];
    await Promise.all(
      stockGroups.map(async (stockGroup) => {
        let ingredient = await prisma.ingredient.findFirst({
          where: { id: stockGroup.ingredientId },
        });
        let stocks = await prisma.stock.findMany({
          where: {
            OR: [{ status: "ACTIVE" }, { status: "PASSIVE" }],
            ingredient: { status: "ACTIVE" },
            stockCode: { status: "ACTIVE" },
            ingredientId: stockGroup.ingredientId,
            stockCodeId: stockGroup.stockCodeId,
            status: stockGroup.status,
            restaurantId: req.restaurantId,
          },
          orderBy: { createdAt: "asc" },
        });

        let stockCode = await prisma.stockCode.findFirst({ where: { id: stockGroup.stockCodeId } });
        _stockGroups.push({
          ...stockGroup,
          quantity: stockGroup._sum.quantity,
          ingredient,
          stockCode,
          stocks,
        });
      })
    );

    res.json({
      error: false,
      stockGroups: _.orderBy(_stockGroups, ["quantity"], ["asc"]),
    });
  } catch (error) {
    console.error(error);
    res.json({ error: true });
  }
});
// Code
router.get("/code", async (req, res, next) => {
  try {
    let stockCodes = await prisma.stockCode.findMany({
      where: {
        status: "ACTIVE",
        restaurantId: req.restaurantId,
      },
    });

    res.json({
      error: false,
      stockCodes,
    });
  } catch (error) {
    console.error(error);
    res.json({ error: true });
  }
});
router.put("/code", async (req, res, next) => {
  try {
    let { name } = req.body;
    await prisma.stockCode.create({
      data: {
        name,
        restaurantId: req.restaurantId,
      },
    });

    res.json({ error: false });
  } catch (error) {
    console.log(error);
    res.json({ error: true });
  }
});
router.post("/code/:id", async (req, res, next) => {
  try {
    let { id } = req.params;
    let { name } = req.body;
    await prisma.stockCode.update({
      where: { id: parseInt(id) },
      data: {
        name,
      },
    });

    res.json({ error: false });
  } catch (error) {
    console.error(error);
    res.json({ error: true });
  }
});
router.delete("/code/:id", async (req, res, next) => {
  try {
    let { id } = req.params;
    await prisma.stockCode.update({
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
