require('dotenv').config(); 
const express = require('express');
const router = express.Router();
const multer = require('multer');
const app = express();
const Project = require('../models/project');
const aws = require('aws-sdk');
// const multer = require('multer');
const multerS3 = require('multer-s3');
const multerS3Transform = require('multer-s3-transform');
// s3 configuration
const s3AccessKey = process.env.S3_ACCESS_KEY;
const s3SecretKey = process.env.S3_SECRET_ACCESS_KEY;
const s3Bucket = process.env.S3_BUCKET_REGION;
const sharp = require('sharp');

const s3 = new aws.S3({
    accessKeyId: s3AccessKey,
    secretAccessKey: s3SecretKey,
    region: s3Bucket
})

// const transformation = sharp()
//   .resize(800)
//   .toFormat('webp');

// const upload = multer({
//   storage: multerS3Transform({
//     s3: s3,
//     bucket: 'asamst223',
//     acl: 'public-read',
//     shouldTransform: function (req, file, cb) {
//       cb(null, /^image/i.test(file.mimetype));
//     },
//     transforms: [{
//       id: 'original',
//       metadata: function (req, file, cb) {
//         cb(null, {fieldName: file.fieldname});
//       },
//       key: function (req, file, cb) {
//         cb(null, `original/${Date.now()}-${file.originalname}`);
//       },
//       transform: function(req, file, cb) {
//         cb(null,sharp().resize(600, 600))
//       }
//     }]
//   })
//   });
  
  
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


// const upload = multer({
//   fileFilter: async (req, file, cb) => {
//     // Check if the uploaded file is an image
//     if (!file.mimetype.startsWith('image/')) {
//       return cb(new Error('Only image files are allowed!'));
//     }

//     try {
//       // Check if the buffer size is greater than 0
//       // if (file.buffer.length === 0) {
//       //   return cb(new Error('Invalid input!'));
//       // }
//       // Use sharp to compress the image and convert it to JPEG format
//       const buffer = await sharp(file.buffer)
//         .jpeg({ quality: 80 })
//         .toBuffer();

//       // Update the original file buffer with the compressed image buffer
//       file.buffer = buffer;

//       // Continue with the file upload to S3
//       cb(null, true);
//     } catch (err) {
//       cb(err);
//     }
//   },
//   storage: multerS3({
//     s3,
//     bucket: 'asamst223',
//     acl: 'public-read',
//     metadata: function (req, file, cb) {
//       cb(null, { fieldName: file.fieldname });
//     },
//     key: function (req, file, cb) {
//       cb(null, Date.now() + '__' + file.originalname);
//     },
//   }),
// });

// function resizeImage(file, size) {
//   return sharp(file.buffer)
//     .resize(size)
//     .jpeg({ quality: 60 })
//     .toBuffer();
// }

// const compressImage = async (req, res, next) => {
//   if (!req.file) {
//     return next();
//   }
//   try {
//     const compressedImage = await sharp(req.file.buffer)
//       .resize(800, 600)
//       .jpeg({ quality: 80 })
//       .toBuffer();
//     req.file.buffer = compressedImage;
//     next();
//   } catch (error) {
//     next(error);
//   }
// };


router.get('/', async(req, res)=>{
  const projects = await Project.find();
  res.render('projects/index', {projects});
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
    // const {title, editor, editCode, file, author} = req.body;
    const {title, editor, file, author} = req.body;
    const project = await Project.findByIdAndUpdate({_id: id}, {
      title: title,
      body: editor,
      author: author,
    });
    if (req.file) {
      project.imageURL.url = req.file.location,
      project.imageURL.filename = req.file.key
    }
    await project.save();
    // console.log(`${editCode} and ${project.editCode}`)
    res.redirect(`/projects/${id}`); 
    // if (editCode == project.editCode){
    //   await project.save();
    //   console.log(`${editCode} and ${project.editCode}`)
    //   res.redirect(`/projects/${id}`);
    // } else {
    //   res.send('the edit code is wrong');
    // }
  } catch(err){
    console.log('error occured in edit')
    console.log(err)
    res.send(err)
  }
})

router.get('/:id/edit', async(req, res)=>{
  const {id} = req.params;
  try{
    const project = await Project.findById(id);
    res.render('projects/edit', {project})
  } catch(err){
    res.send(err)
  }
})

router.get('/:id/delete', async(req, res)=>{
  const {id} = req.params;
  try {
    const project = await Project.findByIdAndDelete(id);
      // Delete image from S3 bucket
    const params = {
      Bucket: 'asamst223',
      Key: project.imageURL.filename
    };
    s3.deleteObject(params, function(err, data) {
      if (err) console.log(err, err.stack);
      else console.log('Image deleted successfully');
    });
    res.redirect('/projects');
  } catch(err){
    res.send('something went wrong in the delete route')
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
    // const compressedImage = await resizeImage(req.file, 800);
    project.imageURL.url = req.file.location,
    project.imageURL.filename = req.file.key
  } else {
    project.imageURL.url = "https://images.unsplash.com/photo-1604147706283-d7119b5b822c?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=687&q=80"
  }
  await project.save()
  // console.log(req.body)
  // console.log(title)
  // console.log(editor); 
  // console.log(editCode); 
  // do something with the post data
  res.redirect('/projects');
});



// Export router
module.exports = router;