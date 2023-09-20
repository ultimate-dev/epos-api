const router = require("express").Router();
const { PrismaClient } = require("@prisma/client");
const upload = require("../../helpers/upload");

const prisma = new PrismaClient();

router.post("/", upload.single("file"), async (req, res, next) => {
  try {
    let { file = "" } = req.body;
    if (req.file && req.file.path) res.json(process.env.BASE_URL + "/" + req.file.path);
    else res.json(file);
  } catch (error) {
    console.error(error);
    res.json({ error: true });
  }
});

module.exports = router;
