import express from "express";
import { get_data_evaluation_tool, get_data_evaluation_tool_sc, get_data_evaluation_tool_compare, get_data_evaluation_tool_sc_compare, get_names } from "../models/evaluation";

const router = express.Router();

router.get('/evalToolData', async function (req, res, next) {
  try {
    let filters = req.query.filters ? req.query.filters : {};
    get_data_evaluation_tool(<string>req.query.name, filters)
      .then((result: any) => res.send(result))
      .catch((err: any) => res.send(err));
  } catch (err) {
      console.log(err);
      res.send(err);
  }
});

router.get('/evalToolDataSC', async function (req, res, next) {
  try {
    let filters = req.query.filters ? req.query.filters : {};
    get_data_evaluation_tool_sc(<string>req.query.name, filters)
      .then((result: any) => res.send(result))
      .catch((err: any) => res.send(err));
  } catch (err) {
      console.log(err);
      res.send(err);
  }
});

router.get('/evalToolDataCompare', async function (req, res, next) {
  try {
    let filters;
    if(!!req.query.filters && req.query.filters !== '{}'){
      filters = req.query.filters;
    } else {
      throw({ code: 0, message: 'No queryParams given', err: 'EMPTY_PARAMS' });
    }
    get_data_evaluation_tool_compare(<string>req.query.name, filters)
      .then((result: any) => res.send(result))
      .catch((err: any) => res.send(err));
  } catch (err) {
      console.log(err);
      res.send(err);
  }
});

router.get('/evalToolDataSCCompare', async function (req, res, next) {
  try {
    let filters;
    if(!!req.query.filters && req.query.filters !== '{}'){
      filters = req.query.filters;
    } else {
      throw({ code: 0, message: 'No queryParams given', err: 'EMPTY_PARAMS' });
    }
    get_data_evaluation_tool_sc_compare(<string>req.query.name, filters)
      .then((result: any) => res.send(result))
      .catch((err: any) => res.send(err));
  } catch (err) {
      console.log(err);
      res.send(err);
  }
});

router.get('/evalToolNames', async function (req, res, next) {
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