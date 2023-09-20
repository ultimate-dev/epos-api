const router = require("express").Router();
const { PrismaClient } = require("@prisma/client");
const { calcCase, getPays } = require("../../services/case.service");
const getOneDayAgoDate = require("../../utils/getOneDayAgoDate");

const prisma = new PrismaClient();

router.get("/", async (req, res, next) => {
  try {
    let { startDate = new Date(), endDate = new Date() } = req.query;
    let pays = await getPays(req.restaurantId, startDate, endDate);
    let monthStartDate = new Date(endDate);
    monthStartDate.setDate(monthStartDate.getDate() - 30);

    let total = await calcCase(pays, ["CASH", "CREDIT"], false);
    let cashTotal = await calcCase(pays, ["CASH", "CHANGE"], false);
    let creditTotal = await calcCase(pays, ["CREDIT"], false);
    let discountTotal = await calcCase(pays, ["DISCOUNT"], false);
    let changeTotal = await calcCase(pays, ["CHANGE"], false);
    let createdTotal = await calcCase(
      pays,
      ["CREATED", "READY", "PAID", "PREPARING", "ONTHEWAY", "COMPLETED"],
      false
    );
    let cancelledTotal = await calcCase(pays, ["CANCELLED"], false);
    let returnedTotal = await calcCase(pays, ["RETURNED"], false);
    let completedTotal = await calcCase(pays, ["CASH", "CREDIT", "CHANGE", "DISCOUNT"], false);
    let expenseTotal = await calcCase(pays, ["CASH", "CREDIT"], true);
    let cashExpenseTotal = await calcCase(pays, ["CASH"], true);
    let creditExpenseTotal = await calcCase(pays, ["CREDIT"], true);

    let expenseTypes = await prisma.expenseType.findMany({
      where: { restaurantId: req.restaurantId },
      include: {
        payments: {
          where: {
            paymentDate: {
              gte: getOneDayAgoDate(new Date(startDate), 1),
              lte: getOneDayAgoDate(new Date(endDate), 0),
            },
          },
          orderBy: [{ paymentDate: "desc" }],
        },
      },
    });

    let payments = await prisma.payment.findMany({
      where: {
        restaurantId: req.restaurantId,
        paymentDate: {
          gte: getOneDayAgoDate(new Date(startDate), 1),
          lte: getOneDayAgoDate(new Date(endDate), 0),
        },
      },
      orderBy: [{ paymentDate: "desc" }],
    });

    res.json({
      error: false,
      case: {
        total,
        cashTotal,
        creditTotal,
        discountTotal,
        changeTotal,
        createdTotal,
        cancelledTotal,
        returnedTotal,
        completedTotal,
        expenseTotal,
        cashExpenseTotal,
        creditExpenseTotal,
      },
      chart: {
        expenseTypes,
        payments,
      },
    });
  } catch (error) {
    console.error(error);
    res.json({ error: true });
  }
});

module.exports = router;
