require('dotenv').config(); 
const express = require('express');
const PORT = 3000;
const app = express();
const path =require('path');
const ejsMate = require('ejs-mate');
const bodyParser = require('body-parser');
const multer = require('multer');
const Project = require('./models/project');
const mongoose = require('mongoose');
const methodOverride = require('method-override');
const databaseUrl = process.env.DATABASE_URL;
const storage = multer.diskStorage({
    destination: function(req, file, callback) {
      callback(null, './public/uploads');
    },
    filename: function(req, file, callback) {
      callback(null, file.originalname);
    }
  });
const upload = multer({ storage: storage });

app.use(express.urlencoded({ limit:'50mb', extended: true })); // for parsing application/x-www-form-urlencoded
// app.use(express.bodyParser({limit: '50mb'}));
// routes
const projectRouter = require('./routes/projects');

// database connection
async function connect(){
    // edit here
    mongoose.connect(process.env.DATABASE_URL);
}

connect().then(res=>console.log('DB connected'))
    .catch(err=>console.log(err));


app.use(express.static(path.resolve(__dirname,'public')));
app.set('view engine', 'ejs')
app.set('views', path.resolve(__dirname, 'views'));
app.engine('ejs', ejsMate);
app.use(methodOverride('_method'));

app.get('/', async(req, res)=>{
    const projects = await Project.find();
    res.render('index', {projects})
})

app.get('/about', async(req, res)=>{
    res.render('about');
})

app.use('/projects', projectRouter);

app.listen(PORT, ()=>{
    console.log(`app is running on port ${PORT}`)
})