const _ = require("lodash");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const getOneDayAgoDate = require("../utils/getOneDayAgoDate");

const getPays = async (restaurantId, startDate = new Date(), endDate = new Date()) => {
  let orders = await prisma.order.findMany({
    where: {
      restaurantId,
      orderDate: {
        gte: getOneDayAgoDate(new Date(startDate), 1),
        lte: getOneDayAgoDate(new Date(endDate), 0),
      },
      OR: [{ completed: false }, { status: "RETURNED" }, { status: "CANCELLED" }],
    },
    include: { orderProducts: true },
  });

  let payments = await prisma.payment.findMany({
    where: {
      restaurantId,
      paymentDate: {
        gte: getOneDayAgoDate(new Date(startDate), 1),
        lte: getOneDayAgoDate(new Date(endDate), 0),
      },
      status: "ACTIVE",
    },
    include: { paymentItems: { where: { status: "ACTIVE" } }, expenseType: true },
  });

  let _pays = [];
  await Promise.all(
    orders.map((order) => {
      _pays.push({
        groupId: order.data.groupId,
        type: order.data.status,
        price: order.data.totalPrice,
      });
    })
  );

  await Promise.all(
    payments.map(async (payment) => {
      if (payment.paymentItems.length > 0)
        await Promise.all(
          payment.paymentItems.map(async (item) => {
            let type = payment.type;
            let orderProduct = await prisma.orderProduct.findFirst({
              where: { paymentItemId: item.id },
              include: { order: true },
            });
            if (orderProduct && ["RETURNED", "CANCELLED"].includes(orderProduct.order.status))
              type = orderProduct.order.status;
            _pays.push({
              groupId: payment.groupId,
              type,
              price: item.price,
              expenseType: null,
            });
          })
        );
      else
        _pays.push({
          groupId: null,
          type: payment.type,
          price: payment.totalPrice,
          expenseType: payment.expenseType,
        });
    })
  );

  return _pays;
};
const calcCase = async (pays = [], types = [], expense) => {
  let price = 0,
    count = [];

  pays
    .filter(({ expenseType }) => (expense == true ? expenseType !== null : expenseType == null))
    .map((pay) => {
      if (types.includes(pay.type)) {
        price += pay.price;
        count.push(pay.groupId);
      }
    });

  count = _.uniqBy(count.filter((p) => p !== null)).length;

  return { price, count };
};

module.exports = { calcCase, getPays };
