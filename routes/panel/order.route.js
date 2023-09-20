const router = require("express").Router();
const { PrismaClient } = require("@prisma/client");
const { orderJsonData, calcTotalPrice } = require("../../services/order.service");
const _ = require("lodash");
const getOneDayAgoDate = require("../../utils/getOneDayAgoDate");

const prisma = new PrismaClient();

router.get("/group", async (req, res, next) => {
  try {
    let { startDate = new Date(), endDate = new Date() } = req.query;
    let orderGroups = [];

    let groups = await prisma.order.groupBy({
      by: ["groupId", "tableId", "completed"],
      where: {
        restaurantId: req.restaurantId,
        orderDate: {
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
        // Orders
        let orders = await prisma.order.findMany({
          where: { groupId: group.groupId, restaurantId: req.restaurantId },
          orderBy: [{ orderDate: "desc" }],
          include: {
            orderProducts: {
              include: { paymentItem: { include: { payment: true } } },
            },
          },
        });
        let _orders = orders.map((order) => ({
          ...order.data,
          orderProducts: order.data.orderProducts.map((orderProduct) => ({
            ...orderProduct,
            paymentItem:
              order.orderProducts.find(({ id }) => id == orderProduct.id).paymentItem || null,
          })),
        }));
        orderGroups.push({
          updatedAt: orders[0].updatedAt,
          table,
          ...group,
          totalPrice: _orders
            .filter(({ status }) => status !== "CANCELLED" && status !== "RETURNED")
            .reduce((sum, { totalPrice }) => sum + totalPrice, 0),
          orders: _orders,
        });
      })
    );

    res.json({
      error: false,
      orderGroups: _.orderBy(orderGroups, ["updatedAt"], ["desc"]),
    });
  } catch (error) {
    console.error(error);
    res.json({ error: true });
  }
});

router.post("/group/:groupId", async (req, res, next) => {
  try {
    let { groupId } = req.params;
    let { completed, totalPrice, tableId, type } = req.body;

    let orders = await prisma.order.findMany({
      where: { groupId, restaurantId: req.restaurantId },
      include: { orderProducts: true },
    });
    if (completed !== orders.map((order) => order.completed).every((val) => val == true)) {
      if (completed) {
        await prisma.order.updateMany({
          where: { groupId },
          data: { completed: true, status: "COMPLATED" },
        });
        let { id: paymentId } = await prisma.payment.create({
          data: {
            totalPrice,
            groupId,
            tableId,
            restaurantId: req.restaurantId,
            type,
            paymentDate: new Date(),
          },
        });
        await Promise.all(
          orders
            .map((order) => ({ ...order.data }))
            .map(async (order) => {
              await Promise.all(
                order.orderProducts.map(async (orderProduct) => {
                  let { id: paymentItemId } = await prisma.paymentItem.create({
                    data: {
                      paymentId,
                      price: calcTotalPrice([orderProduct]),
                    },
                  });
                  await prisma.orderProduct.update({
                    where: { id: orderProduct.id },
                    data: { paymentItemId, status: "APPROVED" },
                  });
                  await prisma.stock.updateMany({
                    where: { orderProductId: orderProduct.id },
                    data: { status: type == "CANCELLED" ? "DELETED" : "ACTIVE" },
                  });
                })
              );

              await orderJsonData(order.id);
            })
        );
      } else {
        await prisma.order.updateMany({
          where: { groupId, restaurantId: req.restaurantId },
          data: { completed: false },
        });
        await prisma.orderProduct.updateMany({
          where: { order: { groupId } },
          data: { paymentItemId: null },
        });
        await prisma.stock.updateMany({
          where: { orderProduct: { order: { groupId } } },
          data: { status: "ACTIVE" },
        });
        await prisma.payment.updateMany({
          where: { groupId, restaurantId: req.restaurantId },
          data: { status: "DELETED" },
        });
        await prisma.paymentItem.updateMany({
          where: { payment: { groupId } },
          data: { status: "DELETED" },
        });
      }
    }

    res.json({ error: false });
  } catch (error) {
    console.error(error);
    res.json({ error: true });
  }
});

module.exports = router;
