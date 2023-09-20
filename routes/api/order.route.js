const router = require("express").Router();
const { PrismaClient } = require("@prisma/client");
const { v4: uuidv4 } = require("uuid");
const getOneDayAgoDate = require("../../utils/getOneDayAgoDate");
const { orderJsonData } = require("../../services/order.service");

const prisma = new PrismaClient();

router.get("/", async (req, res, next) => {
  try {
    let orders = await prisma.order.findMany({
      where: {
        restaurantId: req.restaurantId,
        orderDate: { gte: getOneDayAgoDate(new Date(), 1), lte: getOneDayAgoDate(new Date(), 0) },
        completed: false,
      },
      include: {
        orderProducts: {
          where: { count: { gt: 0 } },
          include: {
            modifierSelections: {
              select: { id: true, modifierGroupId: true, modifierProductId: true },
              where: { status: "ACTIVE" },
            },
          },
        },
      },
      orderBy: { orderDate: "desc" },
    });

    res.json({
      error: false,
      orders,
    });
  } catch (error) {
    console.error(error);
    res.json({ error: true });
  }
});

router.get("/post", async (req, res, next) => {
  try {
    let { startDate = new Date(), endDate = new Date() } = req.query;

    let orders = await prisma.order.findMany({
      where: {
        restaurantId: req.restaurantId,
        orderDate: {
          gte: getOneDayAgoDate(new Date(startDate), 1),
          lte: getOneDayAgoDate(new Date(endDate), 0),
        },
      },
      orderBy: { orderDate: "desc" },
    });
    let _orders = [];
    await Promise.all(
      orders.map(async (order) => {
        _orders.push({
          ...order.data,
        });
      })
    );

    res.json({
      error: false,
      orders: _orders,
    });
  } catch (error) {
    console.error(error);
    res.json({ error: true });
  }
});

router.post("/", async (req, res, next) => {
  try {
    const io = res.app.get("io");

    let { id, tableId, note, status, totalPrice = 0, orderProducts = [] } = req.body;

    let newOrder = { id };
    if (id) {
      await prisma.order.update({
        where: { id },
        data: { note, status, totalPrice },
      });
    } else {
      let groupId = uuidv4();
      let refOrder = await prisma.order.findFirst({
        where: {
          tableId,
          completed: false,
          orderDate: { gte: getOneDayAgoDate(new Date(), 1), lte: getOneDayAgoDate(new Date(), 0) },
        },
      });
      newOrder = await prisma.order.create({
        data: {
          tableId,
          restaurantId: req.restaurantId,
          note,
          status,
          totalPrice,
          groupId: refOrder ? refOrder.groupId : groupId,
          orderDate: new Date(),
        },
      });
    }

    if (status !== "PREPARING" && status !== "CREATED") {
      await prisma.orderProduct.updateMany({
        where: { orderId: id },
        data: {
          status: "APPROVED",
        },
      });
    }

    await Promise.all(
      orderProducts.map(async (orderProduct) => {
        let newOrderProductId = { ...orderProduct };
        // Get Product
        let product = await prisma.product.findFirst({
          where: { id: orderProduct.productId },
          include: { ingredientStocks: { where: { status: "ACTIVE" } } },
        });
        // Update Order Product
        if (orderProduct.id) {
          await prisma.orderProduct.update({
            where: { id: orderProduct.id },
            data: {
              count: parseFloat(orderProduct.count),
            },
          });
        }
        // Create Order Product
        else {
          newOrderProductId = await prisma.orderProduct.create({
            data: {
              orderId: newOrder.id,
              count: parseFloat(orderProduct.count),
              productId: orderProduct.productId,
            },
          });
        }
        // Product Stock
        await Promise.all(
          product.ingredientStocks.map(async (ingredientStock) => {
            let quantity = -1 * (ingredientStock.quantity * orderProduct.count);
            if (orderProduct.id) {
              await prisma.stock.updateMany({
                where: {
                  orderProductId: orderProduct.id,
                },
                data: {
                  quantity,
                  status: status == "CANCELLED" ? "DELETED" : "ACTIVE",
                },
              });
            } else {
              await prisma.stock.create({
                data: {
                  ingredientStockId: ingredientStock.id,
                  stockCodeId: ingredientStock.stockCodeId,
                  quantity,
                  ingredientId: ingredientStock.ingredientId,
                  restaurantId: req.restaurantId,
                  orderProductId: newOrderProductId.id,
                },
              });
            }
          })
        );

        // ModifierSelect
        await Promise.all(
          orderProduct.modifierSelections.map(async (modifierSelection) => {
            if (!modifierSelection.id) {
              // get
              let modifierProduct = await prisma.modifierProduct.findFirst({
                where: { id: modifierSelection.modifierProductId },
                include: { ingredientStocks: { where: { status: "ACTIVE" } } },
              });
              // create
              await prisma.modifierSelect.create({
                data: {
                  orderProductId: newOrderProductId.id,
                  modifierGroupId: modifierSelection.modifierGroupId,
                  modifierProductId: modifierSelection.modifierProductId,
                },
              });
              // stock Create
              await Promise.all(
                modifierProduct.ingredientStocks.map(async (ingredientStock) => {
                  let quantity = -1 * (ingredientStock.quantity * orderProduct.count);
                  await prisma.stock.create({
                    data: {
                      ingredientStockId: ingredientStock.id,
                      stockCodeId: ingredientStock.stockCodeId,
                      quantity,
                      ingredientId: ingredientStock.ingredientId,
                      restaurantId: req.restaurantId,
                      orderProductId: newOrderProductId.id,
                      status: status == "CANCELLED" ? "DELETED" : "ACTIVE",
                    },
                  });
                })
              );
            }
          })
        );
      })
    );

    await orderJsonData(newOrder.id);

    io.emit("order.update");
    io.emit("order.bell");
    res.json({ error: false });
  } catch (error) {
    console.log(error);
    res.json({ error: true });
  }
});

router.post("/transfer", async (req, res, next) => {
  try {
    const io = res.app.get("io");
    let { source, target } = req.body;

    await prisma.order.updateMany({
      where: {
        completed: false,
        OR: [
          { status: "CREATED" },
          { status: "PREPARING" },
          { status: "READY" },
          { status: "PAID" },
          { status: "ONTHEWAY" },
          { status: "COMPLATED" },
        ],
        orderDate: { gte: getOneDayAgoDate(new Date(), 1) },
        tableId: source.tableId,
      },
      data: { tableId: target.tableId },
    });

    let orders = await prisma.order.findMany({ where: { tableId: target.tableId } });
    await Promise.all(
      orders.map(async (order) => {
        await orderJsonData(order.id);
      })
    );

    io.emit("order.update");
    res.json({ error: false });
  } catch (error) {
    console.log(error);
    res.json({ error: true });
  }
});

router.post("/approve", async (req, res, next) => {
  try {
    const io = res.app.get("io");

    let { id, status } = req.body;

    await prisma.order.update({
      where: {
        id,
      },
      data: {
        status: status == "CREATED" ? "PREPARING" : status == "PREPARING" ? "READY" : status,
      },
    });
    if (status == "PREPARING")
      await prisma.orderProduct.updateMany({
        where: { orderId: id },
        data: { status: "APPROVED" },
      });

    await orderJsonData(id);

    io.emit("order.update");
    res.json({ error: false });
  } catch (error) {
    console.error(error);
    res.json({ error: true });
  }
});

router.post("/ready", async (req, res, next) => {
  try {
    const io = res.app.get("io");

    let { id, orderId, status = "WAITING" } = req.body;

    await prisma.orderProduct.update({
      where: {
        id,
      },
      data: { status: status !== "APPROVED" ? "APPROVED" : "WAITING" },
    });

    let orderProducts = await prisma.orderProduct.findMany({
      where: { orderId },
    });
    if (orderProducts.every((product) => product.status == "APPROVED"))
      await prisma.order.update({
        where: {
          id: orderId,
        },
        data: { status: "READY" },
      });
    else
      await prisma.order.update({
        where: {
          id: orderId,
        },
        data: { status: "PREPARING" },
      });

    await orderJsonData(orderId);

    io.emit("order.update");
    res.json({ error: false });
  } catch (error) {
    console.error(error);
    res.json({ error: true });
  }
});

router.post("/completed", async (req, res, next) => {
  try {
    const io = res.app.get("io");
    let { tableId } = req.body;
    let orders = await prisma.order.findMany({
      where: {
        tableId: parseInt(tableId),
        completed: false,
        orderDate: { gte: getOneDayAgoDate(new Date(), 1), lte: getOneDayAgoDate(new Date(), 0) },
      },
    });
    await Promise.all(
      orders.map(async (order) => {
        await prisma.order.update({
          where: { id: order.id },
          data: {
            completed: true,
            status:
              order.status == "RETURNED" || order.status == "CANCELLED"
                ? order.status
                : "COMPLATED",
          },
        });
        await prisma.payment.updateMany({
          where: { tableId: parseInt(tableId), groupId: null },
          data: { groupId: order.groupId },
        });
        await await orderJsonData(order.id);
      })
    );

    io.emit("order.update");
    res.json({ error: false });
  } catch (error) {
    console.log(error);
    res.json({ error: true });
  }
});

module.exports = router;
