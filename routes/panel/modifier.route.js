const router = require("express").Router();
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

router.put("/product", async (req, res, next) => {
  try {
    let { status, name, price, modifierGroupId } = req.body;

    await prisma.modifierProduct.create({
      data: {
        status,
        name,
        price: parseInt(price),
        modifierGroupId,
      },
    });

    res.json({ error: false });
  } catch (error) {
    console.error(error);
    res.json({ error: true });
  }
});

router.post("/product/:id", async (req, res, next) => {
  try {
    let { id } = req.params;
    let { status, name, price, modifierGroupId } = req.body;

    await prisma.modifierProduct.update({
      where: { id: parseInt(id) },
      data: {
        status,
        name,
        price: parseInt(price),
        modifierGroupId,
      },
    });

    res.json({ error: false });
  } catch (error) {
    console.error(error);
    res.json({ error: true });
  }
});

router.delete("/product/:id", async (req, res, next) => {
  try {
    let { id } = req.params;
    await prisma.modifierProduct.update({
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

router.get("/", async (req, res, next) => {
  try {
    let modifiers = await prisma.modifierGroup.findMany({
      where: {
        OR: [{ status: "ACTIVE" }, { status: "PASSIVE" }],
        product: { restaurantId: req.restaurantId },
      },
      include: {
        modifierProducts: { where: { OR: [{ status: "ACTIVE" }, { status: "PASSIVE" }] } },
      },
    });
    res.json({
      error: false,
      modifiers,
    });
  } catch (error) {
    console.error(error);
    res.json({ error: true });
  }
});

router.put("/", async (req, res, next) => {
  try {
    let { name, status, required, multiple, min, max, productId } = req.body;

    await prisma.modifierGroup.create({
      data: {
        name,
        status,
        required: multiple ? false : required || false,
        multiple: multiple || false,
        min: (multiple && min && parseInt(min)) || null,
        max: (multiple && max && parseInt(max)) || null,
        productId,
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
    let { name, status, required, multiple, min, max } = req.body;
    await prisma.modifierGroup.update({
      where: { id: parseInt(id) },
      data: {
        name,
        status,
        required: multiple ? false : required || false,
        multiple: multiple || false,
        min: (multiple && min && parseInt(min)) || null,
        max: (multiple && max && parseInt(max)) || null,
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
    await prisma.modifierGroup.update({
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
