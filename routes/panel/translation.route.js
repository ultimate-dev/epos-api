const router = require("express").Router();
const { PrismaClient } = require("@prisma/client");
const { Translate } = require("@google-cloud/translate").v2;

const prisma = new PrismaClient();

router.get("/", async (req, res, next) => {
  try {
    let translations = await prisma.translation.findMany({
      where: {
        restaurantId: req.restaurantId,
      },
    });
    res.json({
      error: false,
      translations,
    });
  } catch (error) {
    console.error(error);
    res.json({ error: true });
  }
});

router.get("/translate", async (req, res, next) => {
  try {
    const translate = new Translate({ key: process.env.GOOGLE_API_KEY });
    let [t] = await translate.translate("Hello World", "tr");
    console.log(t);
    let { locales } = req.headers;
    let { text } = req.query;

    let restaurant = await prisma.restaurant.findFirst({
      where: { id: req.restaurantId },
    });

    let _locales = JSON.parse(locales).map((key) => String(key).toLowerCase()) || [];
    let translations = _locales.reduce((a, v) => ({ ...a, [v]: "" }), {});
    await Promise.all(
      _locales.map(async (key) => {
        let a = {
          from: String(restaurant.locale).toLowerCase(),
          to: key,
        };
      })
    );
    res.json({
      error: false,
      translations,
    });
  } catch (error) {
    console.error(error);
    res.json({ error: true });
  }
});

router.post("/:name/:key/:id", async (req, res, next) => {
  try {
    let { name, key, id } = req.params;
    let { translations } = req.body;

    let restaurant = await prisma.restaurant.findFirst({ where: { id: req.restaurantId } });

    await Promise.all(
      Object.keys(translations).map(async (code) => {
        let where = { area: key, code: String(code).toUpperCase(), restaurantId: req.restaurantId };
        let value = translations[code] || null;
        switch (name) {
          case "product":
            where["productId"] = parseInt(id);
            break;
          case "category":
            where["categoryId"] = parseInt(id);
            break;
          case "modifier":
            where["modifierGroupId"] = parseInt(id);
            break;
          case "modifierProduct":
            where["modifierProductId"] = parseInt(id);
            break;
          case "ingredient":
            where["ingredientId"] = parseInt(id);
            break;
        }
        if (String(code).toUpperCase() == restaurant.locale) {
          switch (name) {
            case "product":
              await prisma.product.update({
                where: { id: parseInt(id) },
                data: { [key]: value },
              });
              break;
            case "category":
              await prisma.category.update({
                where: { id: parseInt(id) },
                data: { [key]: value },
              });
              break;
            case "modifier":
              await prisma.modifierGroup.update({
                where: { id: parseInt(id) },
                data: { [key]: value },
              });
              break;
            case "modifierProduct":
              await prisma.modifierProduct.update({
                where: { id: parseInt(id) },
                data: { [key]: value },
              });
              break;
            case "ingredient":
              await prisma.ingredient.update({
                where: { id: parseInt(id) },
                data: { [key]: value },
              });
              break;
          }
        } else {
          let translation = await prisma.translation.findFirst({ where });
          if (translation) {
            await prisma.translation.update({
              where: { id: translation.id },
              data: { translate: value },
            });
          } else {
            if (translations[code])
              await prisma.translation.create({
                data: { translate: value, ...where },
              });
          }
        }
      })
    );

    res.json({ error: false });
  } catch (error) {
    console.error(error);
    res.json({ error: true });
  }
});

module.exports = router;
