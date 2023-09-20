const router = require("express").Router();
const { PrismaClient } = require("@prisma/client");
const { calcCase, getPays } = require("../../services/case.service");

const prisma = new PrismaClient();

router.get("/", async (req, res, next) => {
  try {
    let pays = await getPays(req.restaurantId);

    let cashTotal = await calcCase(pays, ["CASH", "CHANGE"], false);
    let creditTotal = await calcCase(pays, ["CREDIT"], false);
    let discountTotal = await calcCase(pays, ["DISCOUNT"], false);
    let createdTotal = await calcCase(
      pays,
      ["CREATED", "READY", "PAID", "PREPARING", "ONTHEWAY", "COMPLETED"],
      false
    );
    let cancelledAndReturnedTotal = await calcCase(pays, ["RETURNED", "CANCELLED"], false);
    let completedTotal = await calcCase(pays, ["CASH", "CREDIT", "CHANGE", "DISCOUNT"], false);
    let expenseTotal = await calcCase(pays, ["CASH", "CREDIT"], true);
    let cashExpenseTotal = await calcCase(pays, ["CASH"], true);
    let creditExpenseTotal = await calcCase(pays, ["CREDIT"], true);

    res.json({
      error: false,
      case: {
        cashTotal,
        creditTotal,
        discountTotal,
        createdTotal,
        cancelledAndReturnedTotal,
        completedTotal,
        expenseTotal,
        cashExpenseTotal,
        creditExpenseTotal,
      },
    });
  } catch (error) {
    console.error(error);
    res.json({ error: true });
  }
});

router.put("/expense", async (req, res, next) => {
  try {
    let { expenseTypeId, type, totalPrice, description } = req.body;
    await prisma.payment.create({
      data: {
        expenseTypeId: parseInt(expenseTypeId),
        totalPrice: -1 * Math.abs(parseFloat(totalPrice)),
        type,
        paymentDate: new Date(),
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

module.exports = router;
