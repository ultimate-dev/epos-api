const router = require("express").Router();
const { PrismaClient } = require("@prisma/client");
const getOneDayAgoDate = require("../../utils/getOneDayAgoDate");

const prisma = new PrismaClient();

router.get("/post", async (req, res, next) => {
  try {
    let { startDate = new Date(), endDate = new Date() } = req.query;

    let payments = await prisma.payment.findMany({
      where: {
        restaurantId: req.restaurantId,
        paymentDate: {
          gte: getOneDayAgoDate(new Date(startDate), 1),
          lte: getOneDayAgoDate(new Date(endDate), 0),
        },
        OR: [{ type: "CASH" }, { type: "CREDIT" }],
        status: "ACTIVE",
      },
      orderBy: { paymentDate: "desc" },
      include: { paymentItems: { where: { status: "ACTIVE" }, include: { orderProducts: true } } },
    });

    res.json({
      error: false,
      payments,
    });
  } catch (error) {
    console.error(error);
    res.json({ error: true });
  }
});

router.post("/:id", async (req, res, next) => {
  try {
    let { id } = req.params;
    let { pays = [] } = req.body;
    const io = res.app.get("io");
    await Promise.all(
      pays.map(async (pay) => {
        let { id: paymentId } = await prisma.payment.create({
          data: {
            type: pay.type,
            totalPrice: parseFloat(Math.abs(pay.totalPrice) * impactPrice(pay.type)),
            restaurantId: req.restaurantId,
            tableId: parseInt(id),
            paymentDate: new Date(),
          },
        });

        await Promise.all(
          pay.paymentItems.map(async (item) => {
            let { id: paymentItemId } = await prisma.paymentItem.create({
              data: { paymentId, price: parseFloat(Math.abs(item.price) * impactPrice(pay.type)) },
            });
            if (item.orderProductId) {
              await prisma.orderProduct.update({
                where: { id: parseInt(item.orderProductId) },
                data: { paymentItemId, status: "APPROVED" },
              });
              if (pay.type == "CANCELLED")
                await prisma.stock.updateMany({
                  where: { orderProductId: item.orderProductId },
                  data: { status: "DELETED" },
                });
            }
          })
        );
      })
    );

    io.emit("order.update");
    res.json({ error: false });
  } catch (error) {
    console.log(error);
    res.json({ error: true });
  }
});

const impactPrice = (type) => {
  switch (type) {
    case "CHANGE":
      return -1;
    case "DISCOUNT":
      return -1;
    default:
      return 1;
  }
};

module.exports = router;
