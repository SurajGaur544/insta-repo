const express = require('express');
const multer = require('multer');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const { log, warn } = require('console');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(cors());
app.use(express.json());

// set of multer for file uploads

const storage = multer.diskStorage({
   destination: function (req, file, cb){
      cd(null, 'uploades/');
   },
   filename: function(req, file, cb){
    cb(null, Date.now() + path.extname(file.originalname));
   }
});

const upload = multer({
    storage:storage,
    limits:{fileSize:5 * 1024 *1024 }
});

// In-memory storage for posts

let posts = [];
let postId = 1;

// handle file uploads and post creation

app.post('/api/posts',upload.single('image'),(req, res) => {
    const newPost = {
        id: postId++,
        imageUrl: `/uploads/${req.file.filename}`,
        description: req.body.description || '',
        likes: 0,
        comments: []
    };
    posts.push(newPost);
    io.emit('new_post',newPost);
    res.status(201).json(newPost);
});

// serve uploads

app.use('/uploads', express.static(path.join(__dirname,'uploads')));

// handle like and comment

app.post('/api/posts/:id/like',(req, res) => {
    const post = posts.find(p => p.id === parseInt(req.params.id));
    if(post) {
        post.likes +=1;
        io.emit('update_post', post);
        res.json(post);
    }else{
        res.status(404).send('post not found');
    }
});

app.post('/app/posts/:id/comment',(req, res) => {
    const post = posts.find(p => p.id === parseInt(req.params.id));
    if(post) {
        const comment = req.body.comment;
        if(comment) {
            post.comments.push(comment);
            io.emit('update_post', post);
            res.json(post);
        }else{
            res.status(400).send('comment is required');
        }
    }else{
        res.status(404).send('Post not found');
    }
});

io.on('connection', (socket) => {
    Console.log('a user connected');
    socket.emit('init',posts);
    socket.on('disconnect', () => {
        console.log('user disconnected');
    });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
    console.warn(`Server is running on port ${PORT}`);
});