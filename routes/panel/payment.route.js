const router = require("express").Router();
const { PrismaClient } = require("@prisma/client");
const _ = require("lodash");
const getOneDayAgoDate = require("../../utils/getOneDayAgoDate");

const prisma = new PrismaClient();

router.get("/group", async (req, res, next) => {
  try {
    let { startDate, endDate } = req.query;
    let paymentGroups = [];

    let groups = await prisma.payment.groupBy({
      by: ["groupId", "tableId"],
      where: {
        NOT: { groupId: null },
        restaurantId: req.restaurantId,
        status: "ACTIVE",
        paymentDate: {
          gte: getOneDayAgoDate(new Date(startDate), 1),
          lte: getOneDayAgoDate(new Date(endDate), 0),
        },
      },
    });


    await Promise.all(
      groups.map(async (group) => {
        // Table
        let table = await prisma.table.findFirst({
          where: { id: group.tableId },
          include: { category: true },
        });
        // Payments
        let payments = await prisma.payment.findMany({
          where: { groupId: group.groupId, restaurantId: req.restaurantId, status: "ACTIVE" },
          orderBy: [{ paymentDate: "desc" }],
          include: {
            table: { include: { category: true } },
            paymentItems: {
              where: { status: "ACTIVE" },
              include: { orderProducts: { include: { product: true, order: true } } },
            },
            expenseType: true,
          },
        });
        let _payments = [];
        await Promise.all(
          payments.map((payment) => {
            _payments.push({
              ...payment,
              paymentItems: [
                ...payment.paymentItems.map((paymentItem) => ({
                  ...paymentItem,
                  orderProducts: [
                    ...paymentItem.orderProducts.map((orderProduct, index) => ({
                      ...orderProduct.order.data.orderProducts[index],
                      order: orderProduct.order.data,
                    })),
                  ],
                })),
              ],
            });
          })
        );

        paymentGroups.push({
          paymentDate: _payments[0].paymentDate,
          ...group,
          totalPrice: _payments
            .filter(({ type }) => type !== "CANCELLED" && type !== "RETURNED")
            .reduce((sum, { totalPrice }) => sum + totalPrice, 0),
          table,
          payments: _payments,
        });
      })
    );

    res.json({
      error: false,
      paymentGroups: _.orderBy(paymentGroups, ["paymentDate"], ["desc"]),
    });
  } catch (error) {
    console.error(error);
    res.json({ error: true });
  }
});

router.get("/expense", async (req, res, next) => {
  try {
    let { startDate = new Date(), endDate = new Date() } = req.query;
    let expenses = await prisma.payment.findMany({
      where: {
        restaurantId: req.restaurantId,
        status: "ACTIVE",
        paymentDate: {
          gte: getOneDayAgoDate(new Date(startDate), 1),
          lte: getOneDayAgoDate(new Date(endDate), 0),
        },
        NOT: { expenseType: null },
      },
      orderBy: [{ createdAt: "desc" }],
      include: { expenseType: true },
    });

    res.json({
      error: false,
      expenses,
    });
  } catch (error) {
    console.error(error);
    res.json({ error: true });
  }
});

router.put("/expense", async (req, res, next) => {
  try {
    let { expenseTypeId, type, paymentDate, totalPrice, description } = req.body;
    await prisma.payment.create({
      data: {
        expenseTypeId: parseInt(expenseTypeId),
        totalPrice: -1 * Math.abs(parseFloat(totalPrice)),
        type,
        paymentDate: new Date(paymentDate),
        description: description || null,
        restaurantId: req.restaurantId,
      },
    });

    res.json({ error: false });
  } catch (error) {
    console.log(error);
    res.json({ error: true });
  }
});

router.post("/expense/:id", async (req, res, next) => {
  try {
    let { id } = req.params;
    let { expenseTypeId, type, paymentDate, totalPrice, description } = req.body;
    await prisma.payment.update({
      where: { id },
      data: {
        expenseTypeId: parseInt(expenseTypeId),
        totalPrice: -1 * Math.abs(parseFloat(totalPrice)),
        type,
        paymentDate: new Date(paymentDate),
        description: description || null,
      },
    });

    res.json({ error: false });
  } catch (error) {
    console.error(error);
    res.json({ error: true });
  }
});

router.delete("/expense/:id", async (req, res, next) => {
  try {
    let { id } = req.params;
    await prisma.payment.update({
      where: { id },
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

router.get("/expense/type", async (req, res, next) => {
  try {
    let expenseTypes = await prisma.expenseType.findMany({
      where: { restaurantId: req.restaurantId, status: "ACTIVE" },
      orderBy: [{ createdAt: "desc" }],
    });

    res.json({
      error: false,
      expenseTypes,
    });
  } catch (error) {
    console.error(error);
    res.json({ error: true });
  }
});

router.put("/expense/type", async (req, res, next) => {
  try {
    let { name } = req.body;
    await prisma.expenseType.create({
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

router.post("/expense/type/:id", async (req, res, next) => {
  try {
    let { id } = req.params;
    let { name } = req.body;
    await prisma.expenseType.update({
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

router.delete("/expense/type/:id", async (req, res, next) => {
  try {
    let { id } = req.params;
    await prisma.expenseType.update({
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
