import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

const app = express();
app.use(cors());
const PORT = process.env.PORT || 3000;

// 🧠 Function to estimate account creation date from TikTok user ID
function getCreationDateFromUserId(userId) {
  try {
    const snowflake = BigInt(userId);
    const timestamp = Number(snowflake >> 32n) + 1_288_834_974_000; // TikTok Epoch offset
    return new Date(timestamp).toISOString(); // or .toDateString() if you want short format
  } catch (err) {
    return null;
  }
}

app.get('/', (req, res) => {
  res.send('TikTok API Backend is running');
});

app.get('/api/user/:username', async (req, res) => {
  const username = req.params.username;

  try {
    const response = await fetch(
      `https://tiktok-api6.p.rapidapi.com/user/details?username=${username}`,
      {
        method: 'GET',
        headers: {
          'x-rapidapi-host': 'tiktok-api6.p.rapidapi.com',
          'x-rapidapi-key': process.env.RAPIDAPI_KEY
        }
      }
    );

    const data = await response.json();

    if (data && data.username && data.user_id) {
      const createdAt = getCreationDateFromUserId(data.user_id);

      res.json({
        username: data.username,
        nickname: data.nickname,
        avatar: data.profile_image,
        followers: data.followers,
        total_likes: data.total_heart,
        verified: data.verified,
        description: data.description,
        region: data.region,
        user_id: data.user_id,
        created_at: createdAt // 🎉 Now included
      });
    } else {
      res.status(404).json({ error: 'User not found or data missing' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user info' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
