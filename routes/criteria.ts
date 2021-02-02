import express from "express";
import { get_data_success_criteria, get_data_success_criteria_compare, get_names } from "../models/criteria";

const router = express.Router();

router.get('/scData', async function (req, res, next) {
  try {
    let filters = req.query.filters ? req.query.filters : {};
    get_data_success_criteria(<string>req.query.name, filters)
      .then((result: any) => {res.send(result);})
      .catch((err: any) => res.send(err));
  } catch (err) {
      console.log(err);
      res.send(err);
  }
});

router.get('/scDataCompare', async function (req, res, next) {
  try {
    let filters;
    if(!!req.query.filters && req.query.filters !== '{}'){
      filters = req.query.filters;
    } else {
      throw({ code: 0, message: 'No queryParams given', err: 'EMPTY_PARAMS' });
    }
    get_data_success_criteria_compare(<string>req.query.name, filters)
      .then((result: any) => res.send(result))
      .catch((err: any) => res.send(err));
  } catch (err) {
      console.log(err);
      res.send(err);
  }
});

router.get('/scNames', async function (req, res, next) {
  try {
    let serverName = req.query.name;
    let filters = req.query.filters ? req.query.filters : {};
    get_names(<string>serverName, filters)
      .then((result: any) => res.send(result))
      .catch((err: any) => res.send(err));
  } catch (err) {
      console.log(err);
      res.send(err);
  }
});

export = router;