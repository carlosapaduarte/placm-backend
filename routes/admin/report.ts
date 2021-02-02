import express from "express";
import { add_earl_report } from "../../models/admin/report"

const router = express.Router();

router.post('/add', async function (req, res, next) {
  try {
    //req.check('jsonFromLink', 'Invalid json from link').exists();
    //req.check('jsonFromFile', 'Invalid json from file').exists();
    req.check('serverName', 'Invalid name').exists();
    req.check('formData', 'Invalid form values').exists();
    req.check('jsons', 'Invalid jsons').exists();
    const errors = req.validationErrors();
    if (errors) {
      console.log(errors);
      // or file === undefined, reiniciar pedido e button
      res.send(errors);
    } else {
      const serverName = req.body.serverName;
      const formData = JSON.parse(req.body.formData);
      const arrayJsons = JSON.parse(req.body.jsons);
      add_earl_report(serverName, formData, ...arrayJsons)
        .then(result => res.send(result))
        .catch((err: any) => res.send(err));
      }
  } catch (err) {
    console.log(err);
    res.send(err);
  }
});

export = router;