const router = require("express").Router();
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

router.get("/", async (req, res, next) => {
  try {
    let { type } = req.query;
    let categories = await prisma.category.findMany({
      where: {
        restaurantId: req.restaurantId,
        type,
        OR: [{ status: "ACTIVE" }, { status: "PASSIVE" }],
      },
      include: {
        products: {
          where: {
            OR: [{ status: "ACTIVE" }, { status: "PASSIVE" }],
          },
        },
        tables: {
          where: {
            OR: [{ status: "ACTIVE" }, { status: "PASSIVE" }],
          },
        },
      },
    });

    res.json({
      error: false,
      categories,
    });
  } catch (error) {
    console.error(error);
    res.json({ error: true });
  }
});


router.put("/", async (req, res, next) => {
  try {
    let { name, status, image, type } = req.body;

    await prisma.category.create({
      data: {
        name,
        status,
        image,
        type,
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
    let { name, status, image } = req.body;

    await prisma.category.update({
      where: { id: parseInt(id) },
      data: {
        name,
        status,
        image,
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
    await prisma.category.update({
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
