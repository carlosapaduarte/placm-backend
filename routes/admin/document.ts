import express from "express";
import { get_document_by_url } from "../../models/admin/document"

const router = express.Router();

router.get('/fetch', async function (req, res, next) {
  try {
    get_document_by_url(<string>req.query.url)
      .then((result: any) => res.send(result))
      .catch((err: any) => res.send(err));
  } catch (err) {
    console.log(err);
    res.send(err);
  }
});
  
export = router;