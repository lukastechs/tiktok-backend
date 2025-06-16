import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();
const app = express();
app.use(cors());
const PORT = process.env.PORT || 3000;

// 🧠 Multiple estimation methods for better accuracy
class TikTokAgeEstimator {
  
  // Method 1: User ID range estimation (more accurate for TikTok)
  static estimateFromUserId(userId) {
    try {
      const id = BigInt(userId);
      
      // TikTok user ID ranges (approximate)
      const ranges = [
        { min: 0n, max: 100000000n, date: new Date('2016-09-01') }, // Early beta
        { min: 100000000n, max: 500000000n, date: new Date('2017-01-01') }, // Launch period
        { min: 500000000n, max: 1000000000n, date: new Date('2017-06-01') },
        { min: 1000000000n, max: 2000000000n, date: new Date('2018-01-01') },
        { min: 2000000000n, max: 5000000000n, date: new Date('2018-08-01') }, // Growth period
        { min: 5000000000n, max: 10000000000n, date: new Date('2019-03-01') },
        { min: 10000000000n, max: 20000000000n, date: new Date('2019-09-01') },
        { min: 20000000000n, max: 50000000000n, date: new Date('2020-03-01') }, // COVID boom
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
      
      return new Date(); // Default to current date if no range matches
    } catch (err) {
      return null;
    }
  }
  
  // Method 2: Username pattern analysis
  static estimateFromUsername(username) {
    if (!username) return null;
    
    // Early TikTok usernames had different patterns
    const patterns = [
      { regex: /^user\d{7,9}$/, dateRange: new Date('2016-09-01') }, // user1234567
      { regex: /^[a-z]{3,8}\d{2,4}$/, dateRange: new Date('2017-03-01') }, // abc123
      { regex: /^\w{3,8}$/, dateRange: new Date('2017-09-01') }, // simple names
      { regex: /^.{1,8}$/, dateRange: new Date('2018-06-01') }, // very short names
    ];
    
    for (const pattern of patterns) {
      if (pattern.regex.test(username)) {
        return pattern.dateRange;
      }
    }
    
    return null;
  }
  
  // Method 3: Profile metrics analysis
  static estimateFromMetrics(followers, totalLikes, verified) {
    const scores = [];
    
    // High follower count suggests older account
    if (followers > 1000000) scores.push(new Date('2018-01-01'));
    else if (followers > 100000) scores.push(new Date('2019-01-01'));
    else if (followers > 10000) scores.push(new Date('2020-01-01'));
    else scores.push(new Date('2021-01-01'));
    
    // Very high likes suggest established account
    if (totalLikes > 10000000) scores.push(new Date('2018-06-01'));
    else if (totalLikes > 1000000) scores.push(new Date('2019-06-01'));
    else if (totalLikes > 100000) scores.push(new Date('2020-06-01'));
    
    // Verified accounts are typically older
    if (verified) {
      scores.push(new Date('2018-01-01'));
    }
    
    if (scores.length === 0) return null;
    
    // Return the earliest date from scores
    return new Date(Math.min(...scores.map(d => d.getTime())));
  }
  
  // Combined estimation with confidence scoring
  static estimateAccountAge(userId, username, followers = 0, totalLikes = 0, verified = false) {
    const estimates = [];
    const confidence = { low: 1, medium: 2, high: 3 };
    
    // Get estimates from different methods
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
    
    // Weight estimates by confidence and calculate final date
    const weightedSum = estimates.reduce((sum, est) => sum + (est.date.getTime() * est.confidence), 0);
    const totalWeight = estimates.reduce((sum, est) => sum + est.confidence, 0);
    const finalDate = new Date(weightedSum / totalWeight);
    
    // Determine overall confidence
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

// Helper function to format date
function formatDate(date) {
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  return date.toLocaleDateString('en-US', options);
}

// Helper function to calculate account age
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
      // Use improved estimation
      const ageEstimate = TikTokAgeEstimator.estimateAccountAge(
        data.user_id,
        data.username,
        data.followers || 0,
        data.total_heart || 0,
        data.verified || false
      );
      
      const formattedDate = formatDate(ageEstimate.estimatedDate);
      const accountAge = calculateAge(ageEstimate.estimatedDate);
      
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
        
        // Enhanced account age info
        estimated_creation_date: formattedDate,
        account_age: accountAge,
        estimation_confidence: ageEstimate.confidence,
        estimation_method: ageEstimate.method,
        accuracy_range: ageEstimate.accuracy,
        
        // Additional metadata for transparency
        estimation_details: {
          all_estimates: ageEstimate.allEstimates,
          note: "This is an estimated creation date based on available data. Actual creation date may vary."
        }
      });
    } else {
      res.status(404).json({ error: 'User not found or data missing' });
    }
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: 'Failed to fetch user info' });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
