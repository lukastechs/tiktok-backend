import express from 'express';
import axios from 'axios';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());

app.get('/api/user/:username', async (req, res) => {
  const username = req.params.username;

  try {
    const response = await axios.get(`https://tiktok112.p.rapidapi.com/user/info/${username}`, {
      headers: {
        'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
        'X-RapidAPI-Host': 'tiktok112.p.rapidapi.com'
      }
    });

    const user = response.data.user;
    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json({
      username: user.unique_id,
      avatar: user.avatar,
      followers: user.follower_count,
      likes: user.total_favorited,
      created_at: user.create_time ? new Date(user.create_time * 1000).toISOString().split('T')[0] : null
    });

  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch data' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
