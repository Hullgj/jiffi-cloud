// Copyright 2015-2016, Google, Inc.
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.



// modified from https://developers.google.com/google-apps/calendar/quickstart/nodejs
'use strict';

const express = require('express');
const bodyParser = require('body-parser');
const config = require('../config');

function getModel () {
  return require(`./model-${config.get('DATA_BACKEND')}`);
}

const router = express.Router();

// Automatically parse request body as JSON
router.use(bodyParser.json());

/**
 * GET /api/tasks
 *
 * Retrieve a page of tasks (up to ten at a time).
 */
router.get('/', (req, res, next) => {
  getModel().list(10, req.query.pageToken, (err, entities, cursor) => {
    if (err) {
      next(err);
      return;
    }
    res.json({
      items: entities,
      nextPageToken: cursor
    });
  });
});

/**
 * POST /api/tasks
 *
 * Create a new task.
 */
router.post('/', (req, res, next) => {
  getModel().create(req.body, (err, entity) => {
    if (err) {
      next(err);
      return;
    }
    res.json(entity);
  });
});

/**
 * GET /api/tasks/:id
 *
 * Retrieve a task.
 */
router.get('/:task', (req, res, next) => {
  getModel().read(req.params.task, (err, entity) => {
    if (err) {
      next(err);
      return;
    }
    res.json(entity);
  });
});

/**
 * PUT /api/tasks/:id
 *
 * Update a task.
 */
router.put('/:task', (req, res, next) => {
  getModel().update(req.params.task, req.body, (err, entity) => {
    if (err) {
      next(err);
      return;
    }
    res.json(entity);
  });
});

/**
 * DELETE /api/tasks/:id
 *
 * Delete a task.
 */
router.delete('/:task', (req, res, next) => {
  getModel().delete(req.params.task, (err) => {
    if (err) {
      next(err);
      return;
    }
    res.status(200).send('OK');
  });
});

/**
 * Errors on "/api/tasks/*" routes.
 */
router.use(() => (err, req, res, next) => {
  // Format error and forward to generic error handler for logging and
  // responding to the request
  err.response = {
    message: err.message,
    internalCode: err.code
  };
  next(err);
});

module.exports = router;
