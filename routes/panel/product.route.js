const router = require("express").Router();
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

router.get("/", async (req, res, next) => {
  try {
    let products = await prisma.product.findMany({
      where: {
        restaurantId: req.restaurantId,
        OR: [{ status: "ACTIVE" }, { status: "PASSIVE" }],
        category: { OR: [{ status: "ACTIVE" }, { status: "PASSIVE" }] },
      },
      include: {
        category: true,
        modifierGroups: {
          where: {
            OR: [{ status: "ACTIVE" }, { status: "PASSIVE" }],
          },
          include: {
            modifierProducts: {
              where: {
                OR: [{ status: "ACTIVE" }, { status: "PASSIVE" }],
              },
            },
          },
        },
      },
    });
    res.json({
      error: false,
      products,
    });
  } catch (error) {
    console.error(error);
    res.json({ error: true });
  }
});

router.put("/", async (req, res, next) => {
  try {
    let {
      name,
      status,
      description,
      image,
      categoryId,
      quantityType,
      originalPrice,
      sellingPrice,
    } = req.body;

    await prisma.product.create({
      data: {
        name,
        status,
        image,
        quantityType,
        originalPrice: parseFloat(originalPrice),
        sellingPrice: parseFloat(sellingPrice),
        categoryId,
        restaurantId: req.restaurantId,
        description: description || null,
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
    let {
      name,
      status,
      description,
      image,
      categoryId,
      quantityType,
      originalPrice,
      sellingPrice,
    } = req.body;

    await prisma.product.update({
      where: { id: parseInt(id) },
      data: {
        name,
        status,
        image,
        originalPrice: parseFloat(originalPrice),
        sellingPrice: parseFloat(sellingPrice),
        quantityType,
        categoryId,
        description: description || null,
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
    await prisma.product.update({
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
