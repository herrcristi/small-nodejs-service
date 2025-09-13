import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import apiRoutes from './web-server/apiRoutes'; // Assuming you have an apiRoutes file for your API endpoints

const app = express();
const server = createServer(app);
const io = new Server(server);

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// API routes
app.use('/api', apiRoutes);

// Serve static files from the Vue.js frontend
app.use(express.static('ui/dist'));

// Handle any other routes (for Vue Router)
app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'ui', 'dist', 'index.html'));
});

// Socket.io setup (if needed)
io.on('connection', (socket) => {
    console.log('A user connected');
    // Handle socket events here
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});