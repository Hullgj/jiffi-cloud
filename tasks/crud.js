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

'use strict';

const express = require('express');
const config = require('../config');
const images = require('../lib/images');
const oauth2 = require('../lib/oauth2');



var envCreate = require('./gcalendar');


function getModel () {
  return require(`./model-${config.get('DATA_BACKEND')}`);
}

const router = express.Router();
var moment = require('moment');

// Use the oauth middleware to automatically get the user's profile
// information and expose login/logout URLs to templates.
router.use(oauth2.template);

// Set Content-Type for all responses for these routes
router.use((req, res, next) => {
  res.set('Content-Type', 'text/html');
  next();
});

/**
 * GET /tasks/
 *
 * Display the home page
 */
router.get('/', (req, res, next) => {
  getModel().list(10, req.query.pageToken, (err, entities, cursor) => {
      
    if (err) {
      next(err);
      return;
    }
    res.render('tasks/home.jade', {
      tasks: entities,
      //entities.testingXP = 50;
      nextPageToken: cursor
    });
  });
});

// [START mine]
// Use the oauth2.required middleware to ensure that only logged-in users
// can access this handler.
router.get('/mine', oauth2.required, (req, res, next) => {
  getModel().listBy(
    req.user.id,
    10,
    req.query.pageToken,
    (err, entities, cursor, apiResponse) => {
      if (err) {
        next(err);
        return;
      }      
      res.render('tasks/list.jade', {
        tasks: entities,
        nextPageToken: cursor
      });
    }
    
  );
});
// [END mine]

/**
 * GET /tasks/add
 *
 * Display a form for creating a task.
 */
router.get('/add', (req, res) => {
  res.render('tasks/form.jade', {
    task: {},
    action: 'Add'
  });
});

/**
 * POST /tasks/add
 *
 * Create a task.
 */
 

// [START add]
router.post(
  '/add',
  images.multer.single('image'),
  images.sendUploadToGCS,
  (req, res, next) => {
    const data = req.body;

    // If the user is logged in, set them as the creator of the task.
    if (req.user) {
      data.createdBy = req.user.displayName;
      data.createdById = req.user.id;
      data.testXp = 5;
    } else {
      data.createdBy = 'Anonymous';
    }

    // Was an image uploaded? If so, we'll use its public URL
    // in cloud storage.
    if (req.file && req.file.cloudStoragePublicUrl) {
      data.imageUrl = req.file.cloudStoragePublicUrl;
    }

      
       
    data.currentXp = 4;
    // sets xp to current experience
    var xp = data.currentXp;
    console.log("hello" + xp);
    // calls function that should increase xp by a single digit.
    var incrementXP = increaseXp(xp);
    data.newXp = incrementXP;
    
    // checks
    console.log(xp); 
    // envCreate.createEvents(data.userAuth, "test", "testing", "2016-12-08T12:01", "2016-12-08T13:01")
    envCreate.listEvents(data.userAuth)


    // Save the data to the database.
    getModel().create(data, (err, savedData) => {
      if (err) {
        next(err);
        return;
      }
      res.redirect(`${req.baseUrl}/${savedData.id}`);
    });
  }
);
// [END add]

 
 
  
  function increaseXp(xp){
     var experience = xp;
     experience = experience + 1;
     return experience;;
  }
 

/**
 * GET /tasks/:id/edit
 *
 * Display a task for editing.
 */
router.get('/:task/edit', (req, res, next) => {
  getModel().read(req.params.task, (err, entity) => {
    if (err) {
      next(err);
      return;
    }
    res.render('tasks/form.jade', {
      task: entity,
      action: 'Edit'
    });
  });
});

/**
 * POST /tasks/:id/edit
 *
 * Update a task.
 */
router.post(
  '/:task/edit',
  images.multer.single('image'),
  images.sendUploadToGCS,
  (req, res, next) => {
    const data = req.body;

    // If the user is logged in, set them as the creator of the task.
    if (req.user) {
      data.createdBy = req.user.displayName;
      data.createdById = req.user.id;
    } else {
      data.createdBy = 'Anonymous';
    }

    // Was an image uploaded? If so, we'll use its public URL
    // in cloud storage.
    if (req.file && req.file.cloudStoragePublicUrl) {
      req.body.imageUrl = req.file.cloudStoragePublicUrl;
    }

    // data = userExp.increaseXp(req.user);

    getModel().update(req.params.task, data, (err, savedData) => {
      if (err) {
        next(err);
        return;
      }
      res.redirect(`${req.baseUrl}/${savedData.id}`);
    });
  }
);

/**
 * GET /tasks/:id/done
 *
 * Set the task as done.
 */
router.post('/:task/done', 
  images.multer.single('image'),
  images.sendUploadToGCS, (req, res, next) => {
  const data = req.body;

    // If the user is logged in, set them as the creator of the task.
    if (req.user) {
      data.createdBy = req.user.displayName;
      data.createdById = req.user.id;
    } else {
      data.createdBy = 'Anonymous';
    }

    // Was an image uploaded? If so, we'll use its public URL
    // in cloud storage.
    if (req.file && req.file.cloudStoragePublicUrl) {
      req.body.imageUrl = req.file.cloudStoragePublicUrl;
    }

  data.completedBy = moment(Date.now()).format('MM-DD-YYYY');

  getModel().update(req.params.task, data, (err, savedData) => {
    if (err) {
      next(err);
      return;
    }
    res.redirect(req.baseUrl);
  });
});

/**
 * GET /tasks/:id
 *
 * Display a task.
 */
router.get('/:task', (req, res, next) => {
  getModel().read(req.params.task, (err, entity) => {
    if (err) {
      next(err);
      return;
    }
    res.render('tasks/view.jade', {
      task: entity
    });
  });
});

/**
 * GET /tasks/:id/delete
 *
 * Delete a task.
 */
router.get('/:task/delete', (req, res, next) => {
  getModel().delete(req.params.task, (err) => {
    if (err) {
      next(err);
      return;
    }
    res.redirect(req.baseUrl);
  });
});

/**
 * Errors on "/tasks/*" routes.
 */
router.use((err, req, res, next) => {
  // Format error and forward to generic error handler for logging and
  // responding to the request
  err.response = err.message;
  next(err);
});

module.exports = router;
