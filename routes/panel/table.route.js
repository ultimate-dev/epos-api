const router = require("express").Router();
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

router.get("/", async (req, res, next) => {
  try {
    let tables = await prisma.table.findMany({
      where: {
        restaurantId: req.restaurantId,
        OR: [{ status: "ACTIVE" }, { status: "PASSIVE" }],
        category: { OR: [{ status: "ACTIVE" }, { status: "PASSIVE" }] },
      },
      include: { category: true },
    });
    res.json({
      error: false,
      tables,
    });
  } catch (error) {
    console.error(error);
    res.json({ error: true });
  }
});

router.put("/", async (req, res, next) => {
  try {
    let { status, categoryId, tableNum } = req.body;

    await prisma.table.create({
      data: {
        status,
        tableNum: parseInt(tableNum),
        categoryId,
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
    let { status, tableNum, categoryId } = req.body;

    await prisma.table.update({
      where: { id: parseInt(id) },
      data: {
        status,
        tableNum: parseInt(tableNum),
        categoryId,
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
    await prisma.table.update({
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
