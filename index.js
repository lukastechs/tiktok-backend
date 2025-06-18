import express from 'express';
import cors from 'cors';
import { TikAPI } from 'tikapi';

const app = express();
app.use(cors());
const PORT = process.env.PORT || 3000;

// Initialize TikAPI with your key
const api = TikAPI("e5lTOPJ45S2Qw3R2JH0SPcr33LRn3XvXXbWmh5XwMztwFqUo");

// TikTokAgeEstimator class (unchanged)
class TikTokAgeEstimator {
  static estimateFromUserId(userId) {
    try {
      const id = BigInt(userId);
      const ranges = [
        { min: 0n, max: 100000000n, date: new Date('2016-09-01') },
        { min: 100000000n, max: 500000000n, date: new Date('2017-01-01') },
        { min: 500000000n, max: 1000000000n, date: new Date('2017-06-01') },
        { min: 1000000000n, max: 2000000000n, date: new Date('2018-01-01') },
        { min: 2000000000n, max: 5000000000n, date: new Date('2018-08-01') },
        { min: 5000000000n, max: 10000000000n, date: new Date('2019-03-01') },
        { min: 10000000000n, max: 20000000000n, date: new Date('2019-09-01') },
        { min: 20000000000n, max: 50000000000n, date: new Date('2020-03-01') },
        { min: 50000000000n, max: 100000000000n, date: new Date('2020-09-01') },
        { min: 100000000000n, max: 200000000000n, date: new Date('2021-03-01') },
        { min: 200000000000n, max: 500000000000n, date: new Date('2021-09-01') },
        { min: 500000000000n, max: 1000000000000n, date: new Date('2022-03-01') },
        { min: 1000000000000n, max: 2000000000000n, date: new Date('2022-09-01') },
        { min: 2000000000000n, max: 5000000000000n, date: new Date('2023-03-01') },
        { min: 5000000000000n, max: 10000000000000n, date: new Date('2023-09-01') },
        { min: 10000000000000n, max: 20000000000000n, date: new Date('2024-03-01') },
        { min: 20000000000000n, max: BigInt(Number.MAX_SAFE_INTEGER), date: new Date('2024-09-01') }
      ];
      for (const range of ranges) {
        if (id >= range.min && id < range.max) {
          return range.date;
        }
      }
      return new Date();
    } catch (err) {
      return null;
    }
  }

  static estimateFromUsername(username) {
    if (!username) return null;
    const patterns = [
      { regex: /^user\d{7,9}$/, dateRange: new Date('2016-09-01') },
      { regex: /^[a-z]{3,8}\d{2,4}$/, dateRange: new Date('2017-03-01') },
      { regex: /^\w{3,8}$/, dateRange: new Date('2017-09-01') },
      { regex: /^.{1,8}$/, dateRange: new Date('2018-06-01') },
    ];
    for (const pattern of patterns) {
      if (pattern.regex.test(username)) {
        return pattern.dateRange;
      }
    }
    return null;
  }

  static estimateFromMetrics(followers, totalLikes, verified) {
    const scores = [];
    if (followers > 1000000) scores.push(new Date('2018-01-01'));
    else if (followers > 100000) scores.push(new Date('2019-01-01'));
    else if (followers > 10000) scores.push(new Date('2020-01-01'));
    else scores.push(new Date('2021-01-01'));
    if (totalLikes > 10000000) scores.push(new Date('2018-06-01'));
    else if (totalLikes > 1000000) scores.push(new Date('2019-06-01'));
    else if (totalLikes > 100000) scores.push(new Date('2020-06-01'));
    if (verified) scores.push(new Date('2018-01-01'));
    if (scores.length === 0) return null;
    return new Date(Math.min(...scores.map(d => d.getTime())));
  }

  static estimateAccountAge(userId, username, followers = 0, totalLikes = 0, verified = false) {
    const estimates = [];
    const confidence = { low: 1, medium: 2, high: 3 };
    const userIdEst = this.estimateFromUserId(userId);
    if (userIdEst) {
      estimates.push({ 
        date: userIdEst, 
        confidence: confidence.high, 
        method: 'User ID Analysis' 
      });
    }
    const usernameEst = this.estimateFromUsername(username);
    if (usernameEst) {
      estimates.push({ 
        date: usernameEst, 
        confidence: confidence.medium, 
        method: 'Username Pattern' 
      });
    }
    const metricsEst = this.estimateFromMetrics(followers, totalLikes, verified);
    if (metricsEst) {
      estimates.push({ 
        date: metricsEst, 
        confidence: confidence.low, 
        method: 'Profile Metrics' 
      });
    }
    if (estimates.length === 0) {
      return {
        estimatedDate: new Date(),
        confidence: 'very_low',
        method: 'Default',
        accuracy: '± 2 years'
      };
    }
    const weightedSum = estimates.reduce((sum, est) => sum + (est.date.getTime() * est.confidence), 0);
    const totalWeight = estimates.reduce((sum, est) => sum + est.confidence, 0);
    const finalDate = new Date(weightedSum / totalWeight);
    const maxConfidence = Math.max(...estimates.map(e => e.confidence));
    const confidenceLevel = maxConfidence === 3 ? 'high' : maxConfidence === 2 ? 'medium' : 'low';
    const primaryMethod = estimates.find(e => e.confidence === maxConfidence)?.method || 'Combined';
    return {
      estimatedDate: finalDate,
      confidence: confidenceLevel,
      method: primaryMethod,
      accuracy: confidenceLevel === 'high' ? '± 6 months' : 
                confidenceLevel === 'medium' ? '± 1 year' : '± 2 years',
      allEstimates: estimates
    };
  }
}

// Helper functions (keep unchanged)
function formatDate(date) { /* ... */ }
function calculateAge(createdDate) { /* ... */ }

app.get('/', (req, res) => {
  res.send('TikTok Account Age Checker API is running (TikAPI version)');
});

app.get('/api/user/:username', async (req, res) => {
  const username = req.params.username;
  
  try {
    // 1. Get user info from TikAPI
    const userResponse = await api.public.check({
      username: username
    });

    if (!userResponse?.user) {
      throw new Error('User not found');
    }

    const userData = userResponse.user;

    // 2. Try to get first video (for more accurate creation date)
    let firstVideoDate = null;
    try {
      const videosResponse = await api.public.posts({
        username: username,
        count: 1
      });
      if (videosResponse?.items?.[0]?.createTime) {
        firstVideoDate = new Date(videosResponse.items[0].createTime * 1000);
      }
    } catch (e) {
      console.log("Couldn't fetch videos, using estimation only");
    }

    // 3. Use your estimation logic
    const ageEstimate = TikTokAgeEstimator.estimateAccountAge(
      userData.id,
      username,
      userData.followerCount || 0,
      userData.heartCount || 0,
      userData.verified || false
    );

    // Use video date if available, otherwise use estimate
    const finalEstimateDate = firstVideoDate || ageEstimate.estimatedDate;

    res.json({
      username: username,
      nickname: userData.nickname,
      avatar: userData.avatarLarger,
      followers: userData.followerCount,
      likes: userData.heartCount,
      verified: userData.verified,
      description: userData.signature,
      
      // Age estimation results
      estimated_creation_date: formatDate(finalEstimateDate),
      account_age: calculateAge(finalEstimateDate),
      estimation_confidence: firstVideoDate ? 'high' : ageEstimate.confidence,
      estimation_method: firstVideoDate ? 'First video date' : ageEstimate.method,
      accuracy: firstVideoDate ? '± 3 months' : ageEstimate.accuracy,
      
      // Additional data from TikAPI
      tikapi_data: {
        user: userData
      }
    });
    
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch user info',
      details: error.message 
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
