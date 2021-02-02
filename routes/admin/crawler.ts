import express from "express";
import { crawl_from_excel } from "../../models/admin/crawler"

const router = express.Router();

router.get('/find', async function (req, res, next) {
  try {
      res.send(await crawl_from_excel());
  } catch (err) {
    console.log(err);
    res.send(err);
  }
});

export = router;