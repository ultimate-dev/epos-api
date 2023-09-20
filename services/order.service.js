const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const orderJsonData = async (id) => {
  try {
    let orderData = await prisma.order.findFirst({
      where: { id: parseInt(id) },
      include: {
        table: { include: { category: true } },
        orderProducts: {
          include: {
            product: {
              include: {
                category: {
                  include: {
                    translations: {
                      select: { code: true, translate: true, area: true },
                    },
                  },
                },
                modifierGroups: {
                  where: { status: "ACTIVE" },
                  include: {
                    modifierProducts: {
                      where: { status: "ACTIVE" },
                      include: {
                        translations: {
                          select: { code: true, translate: true, area: true },
                        },
                      },
                    },
                    translations: {
                      select: { code: true, translate: true, area: true },
                    },
                  },
                },
                translations: { select: { code: true, translate: true, area: true } },
              },
            },
            modifierSelections: {
              where: { status: "ACTIVE" },
            },
          },
        },
      },
    });
    delete orderData["data"];
    await prisma.order.update({ where: { id: parseInt(id) }, data: { data: orderData } });
  } catch (err) {
    console.log(err);
  }
};

const calcTotalPrice = (orderProducts) => {
  try {
    let totalPrice = 0;
    orderProducts.forEach((orderProduct) => {
      totalPrice += orderProduct.count * orderProduct.product.sellingPrice;
      totalPrice +=
        orderProduct.count *
        calcTotalModifierSelect(
          orderProduct.modifierSelections,
          orderProduct.product.modifierGroups
        );
    });
    return totalPrice;
  } catch (err) {}
  return 0;
};

const calcTotalModifierSelect = (modifierSelections, modifierGroups) => {
  try {
    let totalPrice = 0;
    modifierSelections.forEach((modifierSelect) => {
      let modifierProduct = modifierGroups
        .find((modifierGroup) => modifierSelect.modifierGroupId == modifierGroup.id)
        ?.modifierProducts.find(
          (modifierProduct) => modifierSelect.modifierProductId == modifierProduct.id
        );
      totalPrice += modifierProduct ? modifierProduct.price : 0;
    });
    return totalPrice;
  } catch (err) {}
  return 0;
};

module.exports = { orderJsonData, calcTotalModifierSelect, calcTotalPrice };
