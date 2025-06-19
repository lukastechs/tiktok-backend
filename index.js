import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

// 🔍 Estimate creation date from user ID
function getCreationDateFromUserId(userId) {
  try {
    const snowflake = BigInt(userId);
    const timestamp = Number(snowflake >> 32n) + 1288834974000;
    const date = new Date(timestamp);
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  } catch {
    return null;
  }
}

// 🏠 Home route
app.get('/', (req, res) => {
  res.send('TikAPI backend is running');
});

// 🔎 TikTok username info route
app.get('/api/user/:username', async (req, res) => {
  const username = req.params.username;

  try {
    const response = await fetch(`https://api.tikapi.io/public/user?username=${username}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${process.env.TIKAPI_KEY}`
      }
    });

    const data = await response.json();

    if (!data || !data.user) {
      return res.status(404).json({ error: 'User not found or data missing', tikapi_response: data });
    }

    const user = data.user;
    const stats = data.stats;
    const createdAt = getCreationDateFromUserId(user.id);

    res.json({
      username: user.uniqueId,
      nickname: user.nickname,
      avatar: user.avatarLarger,
      followers: stats?.followerCount || 0,
      total_likes: stats?.heartCount || 0,
      verified: user.verified,
      description: user.signature,
      region: user.region || 'Unknown',
      user_id: user.id,
      created_at: createdAt
    });

  } catch (err) {
    console.error('TikAPI fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch user info' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
