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

// Helper function to calculate date range from accuracy
function calculateDateRange(date, accuracy) {
  const baseDate = new Date(date);
  let monthsToAdd = 0;
  
  if (accuracy.includes('6 months')) {
    monthsToAdd = 6;
  } else if (accuracy.includes('1 year')) {
    monthsToAdd = 12;
  } else if (accuracy.includes('2 years')) {
    monthsToAdd = 24;
  }

  const startDate = new Date(baseDate);
  startDate.setMonth(baseDate.getMonth() - monthsToAdd);
  
  const endDate = new Date(baseDate);
  endDate.setMonth(baseDate.getMonth() + monthsToAdd);

  return {
    start: formatDate(startDate),
    end: formatDate(endDate)
  };
}

// Original TikTokAgeEstimator class with date range
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
        accuracy: '± 2 years',
        dateRange: calculateDateRange(new Date(), '± 2 years')
      };
    }
    const weightedSum = estimates.reduce((sum, est) => sum + (est.date.getTime() * est.confidence), 0);
    const totalWeight = estimates.reduce((sum, est) => sum + est.confidence, 0);
    const finalDate = new Date(weightedSum / totalWeight);
    const maxConfidence = Math.max(...estimates.map(e => e.confidence));
    const confidenceLevel = maxConfidence === 3 ? 'high' : maxConfidence === 2 ? 'medium' : 'low';
    const primaryMethod = estimates.find(e => e.confidence === maxConfidence)?.method || 'Combined';
    const accuracy = confidenceLevel === 'high' ? '± 6 months' : 
                     confidenceLevel === 'medium' ? '± 1 year' : '± 2 years';
    return {
      estimatedDate: finalDate,
      confidence: confidenceLevel,
      method: primaryMethod,
      accuracy,
      dateRange: calculateDateRange(finalDate, accuracy),
      allEstimates: estimates
    };
  }
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

  try {
    await new Promise(resolve => setTimeout(resolve, 1000)); // Avoid rate limits
    const url = `https://api.tikapi.io/public/check?username=${encodeURIComponent(username)}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-API-KEY': TIKAPI_KEY,
        'Accept': 'application/json'
      }
    });
    const data = await response.json();

    console.log('TikAPI Response:', JSON.stringify(data, null, 2)); // Log full response

    if (data?.status === 'success' && data.userInfo) {
      const user = data.userInfo.user;
      const stats = data.userInfo.stats;
      const ageEstimate = TikTokAgeEstimator.estimateAccountAge(
        user.id || '0',
        user.uniqueId || username,
        stats?.followerCount || 0,
        stats?.heartCount || 0,
        user.verified || false
      );

      const formattedDate = formatDate(ageEstimate.estimatedDate);
      const accountAge = calculateAge(ageEstimate.estimatedDate);

      res.json({
        username: user.uniqueId || username,
        nickname: user.nickname || '',
        avatar: user.avatarLarger || '',
        followers: stats?.followerCount || 0,
        total_likes: stats?.heartCount || 0,
        verified: user.verified || false,
        description: user.signature || '',
        region: user.region || 'Unknown',
        user_id: user.id || '',
        estimated_creation_date: formattedDate,
        estimated_creation_date_range: ageEstimate.dateRange,
        account_age: accountAge,
        estimation_confidence: ageEstimate.confidence,
        estimation_method: ageEstimate.method,
        accuracy_range: ageEstimate.accuracy,
        estimation_details: {
          all_estimates: ageEstimate.allEstimates,
          note: 'This is an estimated creation date based on available data. Actual creation date may vary.'
        }
      });
    } else {
      res.status(404).json({ 
        error: data?.message || 'User not found or data missing',
        tikapi_response: data
      });
    }
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
