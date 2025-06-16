// index.js
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import fetch from 'node-fetch';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());

app.get('/', (req, res) => {
  res.send('TikTok API Backend is running');
});

app.get('/api/user/:username', async (req, res) => {
  const { username } = req.params;

  try {
    const response = await fetch(`https://tiktok-api6.p.rapidapi.com/user/details?username=${username}`, {
      method: 'GET',
      headers: {
        'x-rapidapi-host': 'tiktok-api6.p.rapidapi.com',
        'x-rapidapi-key': process.env.RAPIDAPI_KEY
      }
    });

    const json = await response.json();

    if (json && json.data) {
      const user = json.data;
      res.json({
        username: user.username,
        avatar: user.avatar,
        followers: user.followers,
        likes: user.likes,
        created_at: new Date(user.create_time * 1000).toISOString().split('T')[0]
      });
    } else {
      res.status(404).json({ error: 'User not found' });
    }

  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: 'Failed to fetch TikTok user data' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
