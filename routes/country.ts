import express from "express";
import {get_data, get_data_sc, get_data_compare, get_data_sc_compare, get_names, get_all_names} from "../models/country"

const router = express.Router();

router.get('/countryNames', async function (req, res, next) {
  try {
    let filters = req.query.filters ? req.query.filters : {};
    get_names('country', <string>req.query.name, filters)
      .then((result: any) => res.send(result))
      .catch((err: any) => res.send(err));
  } catch (err) {
      console.log(err);
      res.send(err);
  }
});

router.get('/countryAllNames', async function (req, res, next) {
  try {
    get_all_names('country', <string>req.query.name)
      .then((result: any) => res.send(result))
      .catch((err: any) => res.send(err));
  } catch (err) {
      console.log(err);
      res.send(err);
  }
});

router.get('/continentNames', async function (req, res, next) {
  try {
    let filters = req.query.filters ? req.query.filters : {};
    get_names('continent', <string>req.query.name, filters)
      .then((result: any) => res.send(result))
      .catch((err: any) => res.send(err));
  } catch (err) {
      console.log(err);
      res.send(err);
  }
});

router.get('/continentAllNames', async function (req, res, next) {
  try {
    get_all_names('continent', <string>req.query.name)
      .then((result: any) => res.send(result))
      .catch((err: any) => res.send(err));
  } catch (err) {
      console.log(err);
      res.send(err);
  }
});

router.get('/continentData', async function (req, res, next) {
  try {
    get_data('continent', <string>req.query.name)
      .then((result: any) => res.send(result))
      .catch((err: any) => res.send(err));
  } catch (err) {
      console.log(err);
      res.send(err);
  }
});

router.get('/countryData', async function (req, res, next) {
  try {
    let filters = req.query.filters ? req.query.filters : {};
    get_data('country', <string>req.query.name, filters)
      .then((result: any) => res.send(result))
      .catch((err: any) => res.send(err));
  } catch (err) {
      console.log(err);
      res.send(err);
  }
});

router.get('/continentDataSC', async function (req, res, next) {
  try {
    get_data_sc('continent', <string>req.query.name)
      .then((result: any) => res.send(result))
      .catch((err: any) => res.send(err));
  } catch (err) {
      console.log(err);
      res.send(err);
  }
});

router.get('/countryDataSC', async function (req, res, next) {
  try {
    let filters = req.query.filters ? req.query.filters : {};
    get_data_sc('country', <string>req.query.name, filters)
      .then((result: any) => res.send(result))
      .catch((err: any) => res.send(err));
  } catch (err) {
      console.log(err);
      res.send(err);
  }
});

router.get('/continentDataCompare', async function (req, res, next) {
  try {
    let filters;
    if(!!req.query.filters && req.query.filters !== '{}'){
      filters = req.query.filters;
    } else {
      throw({ code: 0, message: 'No queryParams given', err: 'EMPTY_PARAMS' });
    }
    get_data_compare('continent', <string>req.query.name, filters)
      .then((result: any) => res.send(result))
      .catch((err: any) => res.send(err));
  } catch (err) {
      console.log(err);
      res.send(err);
  }
});

router.get('/countryDataCompare', async function (req, res, next) {
  try {
    let filters;
    if(!!req.query.filters && req.query.filters !== '{}'){
      filters = req.query.filters;
    } else {
      throw({ code: 0, message: 'No queryParams given', err: 'EMPTY_PARAMS' });
    }
    get_data_compare('country', <string>req.query.name, filters)
      .then((result: any) => res.send(result))
      .catch((err: any) => res.send(err));
  } catch (err) {
      console.log(err);
      res.send(err);
  }
});

router.get('/continentDataSCCompare', async function (req, res, next) {
  try {
    let filters;
    if(!!req.query.filters && req.query.filters !== '{}'){
      filters = req.query.filters;
    } else {
      throw({ code: 0, message: 'No queryParams given', err: 'EMPTY_PARAMS' });
    }
    get_data_sc_compare('continent', <string>req.query.name, filters)
      .then((result: any) => res.send(result))
      .catch((err: any) => res.send(err));
  } catch (err) {
      console.log(err);
      res.send(err);
  }
});

router.get('/countryDataSCCompare', async function (req, res, next) {
  try {
    let filters;
    if(!!req.query.filters && req.query.filters !== '{}'){
      filters = req.query.filters;
    } else {
      throw({ code: 0, message: 'No queryParams given', err: 'EMPTY_PARAMS' });
    }
    get_data_sc_compare('country', <string>req.query.name, filters)
      .then((result: any) => res.send(result))
      .catch((err: any) => res.send(err));
  } catch (err) {
      console.log(err);
      res.send(err);
  }
});

export = router;