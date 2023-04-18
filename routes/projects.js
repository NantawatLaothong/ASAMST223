require('dotenv').config(); 
const express = require('express');
const router = express.Router();
const multer = require('multer');
const app = express();
const Project = require('../models/project');
const aws = require('aws-sdk');
// const multer = require('multer');
const multerS3 = require('multer-s3');
// s3 configuration
const s3AccessKey = process.env.S3_ACCESS_KEY
const s3SecretKey = process.env.S3_SECRET_ACCESS_KEY
const s3Bucket = process.env.S3_BUCKET_REGION

const s3 = new aws.S3({
    accessKeyId: s3AccessKey,
    secretAccessKey: s3SecretKey,
    region: s3Bucket
})

const upload = multer({
    storage: multerS3({
        // s3 
        s3: s3,
        bucket: process.env.S3_BUCKET,
        acl: 'public-read',
        metadata: function (req, file, cb) {
            cb(null, {fieldName: file.fieldname});
          },
          key: function (req, file, cb) {
            cb(null, Date.now()+ "__" + file.originalname);
          }
    })
});

router.get('/new', (req, res) => {
  res.render('projects/new');
});

router.get('/:id', async(req, res)=>{
    const {id} = req.params;
    try{  
      const project = await  Project.findById(id);
      if(!project) {
        res.send("project doesn't exist")
      }
      console.log(project);
      res.render('projects/single', {project: project})
    } catch(err){
      res.send(err)
    }
  //   // 
})

router.put('/:id', upload.single('fileUpload'), async(req, res)=>{
  try {
    const {id} = req.params;
    const {title, editor, editCode, file, author} = req.body;
    const project = await Project.findByIdAndUpdate({_id: id}, {
      title: title,
      body: editor,
      author: author,
    });
    if (req.file) {
      project.imageURL.url = req.file.location,
      project.imageURL.filename = req.file.key
    } 
    if (editCode == project.editCode){
      await project.save();
      console.log(`${editCode} and ${project.editCode}`)
      res.redirect(`/projects/${id}`);
    } else {
      res.send('the edit code is wrong');
    }
  } catch(err){
    console.log('error occured in edit')
    console.log(err)
    res.send(err)
  }
})

router.get('/:id/edit', async(req, res)=>{
  const {id} = req.params
  try{
    const project = await Project.findById(id);
    res.render('projects/edit', {project})
  } catch(err){
    res.send(err)
  }
})

router.post('/', upload.single('fileUpload'), async (req, res) => {
  // Handle POST request
  // const postData = req.body.editor;
  const {title, editor, editCode, file, author} = req.body;
  const project = new Project({
    title: title,
    editCode: editCode,
    body: editor,
    author: author,
  })
  console.log(req.body);
  // save images to AWS
  if(req.file){
    project.imageURL.url = req.file.location,
    project.imageURL.filename = req.file.key
  } else {
    project.imageURL.url = req.file.location
  }
  await project.save()
  // console.log(req.body)
  // console.log(title)
  // console.log(editor); 
  // console.log(editCode); 
  // do something with the post data
  res.redirect('/');
});



// Export router
module.exports = router;