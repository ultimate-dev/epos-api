const router = require("express").Router();
const { PrismaClient } = require("@prisma/client");
const _ = require("lodash");
const getOneDayAgoDate = require("../../utils/getOneDayAgoDate");

const prisma = new PrismaClient();

const trashItems = async (trash, array, next, obj) => {
  let _arr = [];
  await Promise.all(
    array.map((item) => {
      _arr.push({ ...obj, value: next(item) });
    })
  );
  return [...trash, ..._arr];
};

router.get("/", async (req, res, next) => {
  try {
    let trash = [];

    res.json({ error: false, trash });
  } catch (error) {
    console.error(error);
    res.json({ error: true });
  }
});

module.exports = router;
