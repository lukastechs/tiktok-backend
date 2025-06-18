import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();
const app = express();
app.use(cors());
const PORT = process.env.PORT || 3000;

const TIKAPI_KEY = process.env.TIKAPI_KEY;
if (!TIKAPI_KEY) {
  console.error('TIKAPI_KEY is not set');
  process.exit(1);
}

// Helper functions
function formatDate(date) {
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  return date.toLocaleDateString('en-US', options);
}

function calculateAge(createdDate) {
  const now = new Date();
  const created = new Date(createdDate);
  const diffTime = Math.abs(now - created);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffMonths / 12);
  if (diffYears > 0) {
    const remainingMonths = diffMonths % 12;
    return `${diffYears} year${diffYears > 1 ? 's' : ''}${remainingMonths > 0 ? ` and ${remainingMonths} month${remainingMonths > 1 ? 's' : ''}` : ''}`;
  } else if (diffMonths > 0) {
    return `${diffMonths} month${diffMonths > 1 ? 's' : ''}`;
  } else {
    return `${diffDays} day${diffDays > 1 ? 's' : ''}`;
  }
}

app.get('/', (req, res) => {
  res.send('TikTok Account Age Checker API is running');
});

app.get('/api/user/:username', async (req, res) => {
  const username = req.params.username;
  const checkUrl = `https://api.tikapi.io/public/check?username=${encodeURIComponent(username)}`;
  const postsUrl = `https://api.tikapi.io/user/posts?username=${encodeURIComponent(username)}&count=10`;

  try {
    // Simulate delay to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Fetch user profile
    const checkResponse = await fetch(checkUrl, {
      method: 'GET',
      headers: {
        'X-API-KEY': TIKAPI_KEY,
        'Accept': 'application/json'
      }
    });
    const checkData = await checkResponse.json();
    console.log('TikAPI check response:', JSON.stringify(checkData, null, 2));

    if (checkData?.status !== 'success' || !checkData.userInfo) {
      return res.status(404).json({
        error: checkData?.message || 'User not found or data missing',
        tikapi_response: checkData
      });
    }

    const user = checkData.userInfo.user || {};
    const stats = checkData.userInfo.stats || {};

    // Fetch posts to find oldest
    let estimatedCreationDate = new Date().toISOString().split('T')[0]; // Default to today
    let accountAge = calculateAge(estimatedCreationDate);
    let estimationConfidence = 'low';
    let estimationMethod = 'Default';
    let accuracyRange = '± 2 years';
    let allEstimates = [];

    const postsResponse = await fetch(postsUrl, {
      headers: {
        'X-API-KEY': TIKAPI_KEY,
        'Accept': 'application/json'
      }
    });
    const postsData = await postsResponse.json();
    console.log('TikAPI posts response:', JSON.stringify(postsData, null, 2));

    if (postsData.status === 'success' && postsData.data && postsData.data.length > 0) {
      // Find oldest post
      const oldestPost = postsData.data.reduce((oldest, post) => {
        return !oldest || new Date(post.create_time) < new Date(oldest.create_time) ? post : oldest;
      }, null);

      if (oldestPost) {
        const createTime = new Date(oldestPost.create_time);
        estimatedCreationDate = createTime.toISOString().split('T')[0]; // e.g., "2020-03-05"
        accountAge = calculateAge(createTime);
        estimationConfidence = 'high';
        estimationMethod = 'First Post Analysis';
        accuracyRange = '± 7 days';
        allEstimates = [{
          date: createTime,
          confidence: 3,
          method: 'First Post Analysis'
        }];
      }
    }

    const formattedDate = formatDate(new Date(estimatedCreationDate));

    res.json({
      username: user.uniqueId || username,
      nickname: user.nickname || '',
      avatar: user.avatarLarger || '',
      followers: stats.followerCount || 0,
      total_likes: stats.heartCount || 0,
      verified: user.verified || false,
      description: user.signature || '',
      region: user.region || 'Unknown',
      user_id: user.id || '',
      estimated_creation_date: formattedDate,
      account_age: accountAge,
      estimation_confidence: estimationConfidence,
      estimation_method: estimationMethod,
      accuracy_range: accuracyRange,
      estimation_details: {
        all_estimates: allEstimates,
        note: 'This is an estimated creation date based on available data. Actual creation date may vary.'
      }
    });
  } catch (error) {
    console.error('TikAPI Error:', error.message, error.stack);
    res.status(500).json({
      error: 'Failed to fetch user info from TikAPI',
      details: error.message
    });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
