// ====== FORECAST MODULE ======
// Vector AutoRegression (VAR) Model with Volatility Preservation
// Adapted to use PulseGuard chart data instead of CSV upload

(() => {
  'use strict';

  // ====== CONFIGURATION ======
  const STATE_COLORS = {
    'Healthy': '#2ecc71',
    'Degraded': '#f39c12',
    'Unhealthy': '#e74c3c',
    'TimedOut': '#95a5a6',
    'Unknown': '#3498db'
  };

  let forecastChart = null;
  let currentPulseData = null;
  let isGenerating = false;
  let shouldCancel = false;

  // ====== UTILITY FUNCTIONS ======
  async function log(message, type = 'info') {
    const logDiv = document.getElementById('forecast-progress-log');
    if (logDiv) {
      const time = new Date().toLocaleTimeString();
      const colorClass = type === 'success' ? 'text-success' : type === 'error' ? 'text-danger' : type === 'info' ? 'text-primary' : 'text-muted';
      
      const logEntry = document.createElement('div');
      logEntry.className = colorClass;
      logEntry.textContent = `[${time}] ${message}`;
      
      logDiv.appendChild(logEntry);
      logDiv.scrollTop = logDiv.scrollHeight;
      // Yield to browser to update DOM
      await new Promise(resolve => setTimeout(resolve, 0));
    } else {
      console.log(message);
    }
  }

  function standardDeviation(values) {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  }

  function randomNormal() {
    const u1 = 1.0 - Math.random();
    const u2 = 1.0 - Math.random();
    return Math.sqrt(-2.0 * Math.log(u1)) * Math.sin(2.0 * Math.PI * u2);
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  // ====== STATE PROBABILITY CALCULATION ======
  async function calculateStateProbabilities(records) {
    await log('📊 Calculating state probabilities...');

    // Group by hour
    const hourlyGroups = {};
    records.forEach(record => {
      const timestamp = new Date(record.timestamp);
      const hourKey = new Date(
        timestamp.getFullYear(),
        timestamp.getMonth(),
        timestamp.getDate(),
        timestamp.getHours(),
        0, 0, 0
      ).getTime();

      if (!hourlyGroups[hourKey]) {
        hourlyGroups[hourKey] = [];
      }
      hourlyGroups[hourKey].push(record.state);
    });

    // Calculate probabilities
    const stateProbs = [];
    Object.keys(hourlyGroups).sort().forEach(hourKey => {
      const states = hourlyGroups[hourKey];
      const total = states.length;
      const stateCounts = {};

      states.forEach(state => {
        stateCounts[state] = (stateCounts[state] || 0) + 1;
      });

      const stateProb = {
        timestamp: parseInt(hourKey),
        states: {}
      };

      Object.keys(stateCounts).forEach(state => {
        stateProb.states[state] = (stateCounts[state] / total) * 100;
      });

      stateProbs.push(stateProb);
    });

    // Fill missing hours
    // Get all unique states without flatMap to avoid stack issues
    const allStatesSet = new Set();
    for (const sp of stateProbs) {
      for (const state of Object.keys(sp.states)) {
        allStatesSet.add(state);
      }
    }
    const allStates = Array.from(allStatesSet);
    
    const filledProbs = [];

    for (let i = 0; i < stateProbs.length - 1; i++) {
      filledProbs.push(stateProbs[i]);
      let currentTime = new Date(stateProbs[i].timestamp);
      const nextTime = new Date(stateProbs[i + 1].timestamp);

      while (currentTime.getTime() + 3600000 < nextTime.getTime()) {
        currentTime = new Date(currentTime.getTime() + 3600000);
        const interpolated = { timestamp: currentTime.getTime(), states: {} };
        allStates.forEach(state => {
          interpolated.states[state] = (stateProbs[i].states[state] || 0);
        });
        filledProbs.push(interpolated);
      }
    }
    filledProbs.push(stateProbs[stateProbs.length - 1]);

    await log(`✓ Calculated ${filledProbs.length} hourly probabilities`, 'success');
    return filledProbs;
  }

  // ====== VAR MODEL ======
  // Simple VAR implementation following the working standalone script
  class VarModel {
    constructor(dataMatrix, lagOrder) {
      this.data = dataMatrix;
      this.lagOrder = lagOrder;
      this.numVariables = dataMatrix[0].length;
      this.coefficients = [];
      this.intercept = [];
    }

    async fit() {
      await log(`🔧 Fitting VAR model with lag order ${this.lagOrder}...`);
      
      const T = this.data.length - this.lagOrder;
      const k = this.numVariables;
      const p = this.lagOrder;

      // Build design matrix X and target matrix Y
      const X = [];
      const Y = [];

      for (let t = 0; t < T; t++) {
        const xRow = [1]; // Intercept
        for (let lag = 0; lag < p; lag++) {
          const dataIndex = t + p - lag - 1;
          for (let varIdx = 0; varIdx < k; varIdx++) {
            xRow.push(this.data[dataIndex][varIdx]);
          }
        }
        X.push(xRow);
        Y.push([...this.data[t + p]]); // Copy the row
      }

      // OLS: B = (X'X)^-1 X'Y
      // Solve separately for each dependent variable
      try {
        const Xmat = math.matrix(X);
        const Ymat = math.matrix(Y);
        const XtX = math.multiply(math.transpose(Xmat), Xmat);
        const XtY = math.multiply(math.transpose(Xmat), Ymat);
        
        // Check if matrix is singular by attempting to compute determinant
        try {
          const det = math.det(XtX);
          if (Math.abs(det) < 1e-10) {
            throw new Error('Matrix is singular or near-singular');
          }
        } catch (detError) {
          // Matrix is singular - no variation in data
          await log('⚠️ Singular matrix detected - using persistence model', 'info');
          // Use simple persistence: predict = last observation
          this.intercept = new Array(k).fill(0);
          this.coefficients = [];
          for (let lag = 0; lag < p; lag++) {
            const identityMatrix = [];
            for (let i = 0; i < k; i++) {
              const row = [];
              for (let j = 0; j < k; j++) {
                row.push(lag === 0 && i === j ? 1 : 0); // Identity for lag 0
              }
              identityMatrix.push(row);
            }
            this.coefficients.push(identityMatrix);
          }
          await log('✓ Persistence model fitted successfully', 'success');
          return;
        }
        
        // Solve for each variable separately
        const allCoefficients = [];
        for (let varIdx = 0; varIdx < k; varIdx++) {
          // Extract column for this variable
          const yCol = XtY.toArray().map(row => [row[varIdx]]);
          const B = math.lusolve(XtX, yCol);
          const BArray = B.toArray().map(row => row[0]);
          allCoefficients.push(BArray);
        }

        // Extract intercepts and coefficients
        this.intercept = allCoefficients.map(coef => coef[0]);
        this.coefficients = [];

        for (let lag = 0; lag < p; lag++) {
          const coefMatrix = [];
          for (let i = 0; i < k; i++) {
            const row = [];
            for (let j = 0; j < k; j++) {
              row.push(allCoefficients[i][1 + lag * k + j]);
            }
            coefMatrix.push(row);
          }
          this.coefficients.push(coefMatrix);
        }

        await log('✓ VAR model fitted successfully', 'success');
      } catch (error) {
        await log(`❌ Matrix solve error: ${error.message}`, 'error');
        throw error;
      }
    }

    async forecast(lastObservations, periods) {
      await log(`🔮 Generating ${periods} period forecast...`);
      
      const forecast = [];
      const history = lastObservations.map(obs => [...obs]); // Deep copy

      for (let t = 0; t < periods; t++) {
        let prediction = [...this.intercept];

        for (let lag = 0; lag < this.lagOrder; lag++) {
          const obsIndex = history.length - 1 - lag;
          if (obsIndex < 0) continue;
          
          const obs = history[obsIndex];
          const coefMatrix = this.coefficients[lag];
          
          for (let i = 0; i < this.numVariables; i++) {
            for (let j = 0; j < this.numVariables; j++) {
              prediction[i] += coefMatrix[i][j] * obs[j];
            }
          }
        }

        // Clamp and normalize to prevent explosion
        prediction = prediction.map(v => Math.max(0, Math.min(100, v)));
        const sum = prediction.reduce((a, b) => a + b, 0);
        if (sum > 0) {
          prediction = prediction.map(v => (v / sum) * 100);
        }

        forecast.push([...prediction]);
        history.push([...prediction]);
      }

      await log(`✓ Forecast complete: ${forecast.length} steps generated`, 'success');
      return forecast;
    }

    calculateAIC() {
      const T = this.data.length - this.lagOrder;
      const k = this.numVariables;
      const numParams = k * k * this.lagOrder + k;

      let rss = 0;
      for (let t = this.lagOrder; t < this.data.length; t++) {
        let predicted = [...this.intercept];
        
        for (let lag = 0; lag < this.lagOrder; lag++) {
          const lagObs = this.data[t - 1 - lag];
          for (let i = 0; i < this.numVariables; i++) {
            for (let j = 0; j < this.numVariables; j++) {
              predicted[i] += this.coefficients[lag][i][j] * lagObs[j];
            }
          }
        }

        for (let i = 0; i < this.numVariables; i++) {
          rss += Math.pow(this.data[t][i] - predicted[i], 2);
        }
      }

      const logLikelihood = -0.5 * T * Math.log(rss / T);
      return -2 * logLikelihood + 2 * numParams;
    }
  }

  async function selectOptimalLag(dataMatrix, maxLags) {
    await log(`🔍 Selecting optimal lag order (testing 1-${maxLags})...`);
    
    let bestAIC = Infinity;
    let bestLag = 1;

    const maxTestLags = Math.min(maxLags, Math.floor(dataMatrix.length / 10));

    for (let lag = 1; lag <= maxTestLags; lag++) {
      const model = new VarModel(dataMatrix, lag);
      await model.fit();
      const aic = model.calculateAIC();

      if (aic < bestAIC) {
        bestAIC = aic;
        bestLag = lag;
      }
    }

    await log(`✓ Optimal lag: ${bestLag} (AIC=${bestAIC.toFixed(2)})`, 'success');
    return bestLag;
  }

  // ====== VOLATILITY ENHANCEMENT ======
  async function enhanceWithVolatility(forecast, historicalData, states, volatilityScale, patternStrength) {
    await log('⚡ Enhancing forecast with volatility patterns...');

    const enhanced = forecast.map(row => [...row]);

    // Calculate historical volatilities
    const recent = historicalData.slice(-7 * 24);
    const volatilities = states.map((state, idx) => {
      const values = recent.map(sp => sp.states[state] || 0);
      return standardDeviation(values);
    });

    // Calculate hourly patterns
    const hourlyPatterns = {};
    states.forEach((state, idx) => {
      hourlyPatterns[state] = {};
      for (let hour = 0; hour < 24; hour++) {
        const hourlyValues = historicalData.filter((sp, i) => new Date(sp.timestamp).getHours() === hour)
          .map(sp => sp.states[state] || 0);
        hourlyPatterns[state][hour] = hourlyValues.length > 0 ? 
          hourlyValues.reduce((a, b) => a + b, 0) / hourlyValues.length : 0;
      }
    });

    let prevNoise = new Array(states.length).fill(0);

    for (let i = 0; i < enhanced.length; i++) {
      const decayFactor = Math.exp(-i / (enhanced.length * 1.5));

      for (let j = 0; j < states.length; j++) {
        // AR(1) correlated noise
        let noise;
        if (i === 0) {
          noise = randomNormal() * volatilities[j] * volatilityScale * 0.15;
        } else {
          noise = 0.7 * prevNoise[j] + 0.3 * randomNormal() * volatilities[j] * volatilityScale * 0.15;
        }

        enhanced[i][j] += noise * decayFactor;

        // Hourly pattern influence
        const hourOfDay = (historicalData.length + i) % 24;
        if (hourlyPatterns[states[j]] && hourlyPatterns[states[j]][hourOfDay]) {
          const historicalMean = historicalData.map(sp => sp.states[states[j]] || 0)
            .reduce((a, b) => a + b, 0) / historicalData.length;
          const hourlyMean = hourlyPatterns[states[j]][hourOfDay];
          const patternAdjustment = (hourlyMean - historicalMean) * patternStrength * decayFactor;
          enhanced[i][j] += patternAdjustment;
        }

        prevNoise[j] = enhanced[i][j] - forecast[i][j];
      }

      // Normalize
      let rowSum = enhanced[i].reduce((a, b) => a + b, 0);
      enhanced[i] = enhanced[i].map(v => clamp(v, 0, 100));
      rowSum = enhanced[i].reduce((a, b) => a + b, 0);

      if (rowSum > 120 || rowSum < 80) {
        const factor = 100 / rowSum;
        enhanced[i] = enhanced[i].map(v => clamp(v * factor, 0, 100));
      }
    }

    await log('✓ Volatility enhancement complete', 'success');
    return enhanced;
  }

  // ====== MAIN FORECAST GENERATION ======
  async function generateForecast(pulseData, params) {
    // Clear previous log entries
    const logDiv = document.getElementById('forecast-progress-log');
    if (logDiv) {
      logDiv.innerHTML = '';
    }
    
    shouldCancel = false;
    log('🚀 Starting forecast generation...');

    try {
      // Check if math.js is loaded
      if (typeof math === 'undefined') {
        throw new Error('Math.js library is not loaded. Please refresh the page.');
      }
      
      if (shouldCancel) throw new Error('Cancelled');
      
      log(`📥 Received ${pulseData.length} data points`);
      
      // Convert pulse data to state records
      // pulseData is an array of {state, timestamp, elapsedMilliseconds}
      // timestamp is Unix time in SECONDS, so we need to convert it properly
      const records = pulseData.map(item => {
        let ts = item.timestamp;
        
        // Handle protobuf Long objects
        if (ts && typeof ts === 'object' && typeof ts.toNumber === 'function') {
          ts = ts.toNumber();
        } else if (typeof ts !== 'number') {
          ts = Number(ts);
        }
        
        // Convert from seconds to milliseconds for JavaScript Date
        ts = ts * 1000;
        
        return {
          timestamp: ts,
          state: item.state
        };
      }).filter(r => !isNaN(r.timestamp) && r.timestamp > 0); // Filter out invalid timestamps

      log(`✅ Processed ${records.length} valid records`);
      
      if (records.length === 0) {
        throw new Error('No valid data records found');
      }

      // Find min/max timestamps efficiently for large datasets
      let minTime = Infinity;
      let maxTime = -Infinity;
      for (const record of records) {
        if (record.timestamp < minTime) minTime = record.timestamp;
        if (record.timestamp > maxTime) maxTime = record.timestamp;
      }

      log(`📅 Time range: ${new Date(minTime).toLocaleString()} to ${new Date(maxTime).toLocaleString()}`);

      // Limit to user-specified historical days
      const historicalDays = params.historicalDays || 30;
      const cutoffTime = maxTime - (historicalDays * 24 * 60 * 60 * 1000);
      const recentRecords = records.filter(r => r.timestamp >= cutoffTime);
      
      log(`🔪 Using last ${historicalDays} days: ${recentRecords.length} records`);

      if (shouldCancel) throw new Error('Cancelled');

      // Yield to browser to update UI
      await new Promise(resolve => setTimeout(resolve, 0));

      // Calculate state probabilities
      const stateProbs = await calculateStateProbabilities(recentRecords);

      log(`⏱️ Generated ${stateProbs.length} hourly data points`);

      if (shouldCancel) throw new Error('Cancelled');

      // Yield to browser
      await new Promise(resolve => setTimeout(resolve, 0));

      if (stateProbs.length < 48) {
        throw new Error(`Insufficient data: need at least 48 hours of data, but only have ${stateProbs.length} hours`);
      }

      // Prepare data matrix
      // Get all unique states without flatMap to avoid stack issues
      const statesSet = new Set();
      for (const sp of stateProbs) {
        for (const state of Object.keys(sp.states)) {
          statesSet.add(state);
        }
      }
      const states = Array.from(statesSet).sort();
      log(`📋 States found: ${states.join(', ')}`);

      if (shouldCancel) throw new Error('Cancelled');

      // Yield to browser
      await new Promise(resolve => setTimeout(resolve, 0));

      const dataMatrix = stateProbs.map(sp => 
        states.map(state => sp.states[state] || 0)
      );

      // Select optimal lag
      const optimalLag = await selectOptimalLag(dataMatrix, params.maxLags);

      if (shouldCancel) throw new Error('Cancelled');

      // Yield to browser
      await new Promise(resolve => setTimeout(resolve, 0));

      // Fit VAR model
      const model = new VarModel(dataMatrix, optimalLag);
      await model.fit();

      // Generate base forecast
      const lastObservations = dataMatrix.slice(-optimalLag);
      const baseForecast = await model.forecast(lastObservations, params.forecastPeriods);

      // Enhance with volatility
      const enhancedForecast = await enhanceWithVolatility(
        baseForecast,
        stateProbs,
        states,
        params.volatilityScale,
        params.patternStrength
      );

      // Calculate statistics
      const forecastStartTime = stateProbs[stateProbs.length - 1].timestamp + 3600000;
      
      const forecastData = enhancedForecast.map((probs, i) => ({
        timestamp: forecastStartTime + i * 3600000,
        states: states.reduce((obj, state, j) => {
          obj[state] = probs[j];
          return obj;
        }, {})
      }));

      // Calculate volatility metrics
      const historicalVolatility = {};
      const forecastVolatility = {};
      
      states.forEach((state, idx) => {
        const historicalValues = stateProbs.slice(-7 * 24).map(sp => sp.states[state] || 0);
        const forecastValues = enhancedForecast.map(row => row[idx]);
        
        historicalVolatility[state] = standardDeviation(historicalValues);
        forecastVolatility[state] = standardDeviation(forecastValues);
      });

      log('✅ Forecast generation complete!', 'success');

      return {
        historical: stateProbs,
        forecast: forecastData,
        states: states,
        forecastStartTime: forecastStartTime,
        optimalLag: optimalLag,
        historicalVolatility: historicalVolatility,
        forecastVolatility: forecastVolatility
      };

    } catch (error) {
      log(`❌ Error: ${error.message}`, 'error');
      throw error;
    }
  }

  // ====== CHART RENDERING ======
  function displayForecastChart(data) {
    const ctx = document.getElementById('forecast-chart');
    
    if (forecastChart) {
      forecastChart.destroy();
    }

    const datasets = [];
    const forecastStartTime = new Date(data.forecastStartTime);
    
    // Filter historical data to last 30 days
    const thirtyDaysAgo = forecastStartTime.getTime() - (30 * 24 * 60 * 60 * 1000);
    const filteredHistorical = data.historical.filter(d => d.timestamp >= thirtyDaysAgo);
    
    data.states.forEach(state => {
      // Historical data (last 30 days only)
      datasets.push({
        label: `${state} (Historical)`,
        data: filteredHistorical.map(d => ({
          x: new Date(d.timestamp),
          y: d.states[state] || 0
        })),
        borderColor: STATE_COLORS[state] || '#999',
        backgroundColor: STATE_COLORS[state] || '#999',
        borderWidth: 2,
        pointRadius: 0,
        fill: false,
        tension: 0.1
      });

      // Forecast data
      datasets.push({
        label: `${state} (Forecast)`,
        data: data.forecast.map(d => ({
          x: new Date(d.timestamp),
          y: d.states[state] || 0
        })),
        borderColor: STATE_COLORS[state] || '#999',
        backgroundColor: (STATE_COLORS[state] || '#999') + '40',
        borderWidth: 2,
        borderDash: [5, 5],
        pointRadius: 0,
        fill: false,
        tension: 0.1
      });
    });

    // Find min/max timestamps efficiently (using filtered data)
    let minTime = Infinity;
    let maxTime = -Infinity;
    for (const d of filteredHistorical) {
      const t = new Date(d.timestamp).getTime();
      if (t < minTime) minTime = t;
      if (t > maxTime) maxTime = t;
    }
    for (const d of data.forecast) {
      const t = new Date(d.timestamp).getTime();
      if (t < minTime) minTime = t;
      if (t > maxTime) maxTime = t;
    }

    forecastChart = new Chart(ctx, {
      type: 'line',
      data: { datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false
        },
        scales: {
          x: {
            type: 'time',
            time: {
              unit: 'hour',
              displayFormats: {
                hour: 'MMM d, HH:mm'
              }
            },
            title: {
              display: true,
              text: 'Time'
            },
            min: minTime,
            max: maxTime
          },
          y: {
            title: {
              display: true,
              text: 'Probability (%)'
            },
            min: 0,
            max: 100
          }
        },
        plugins: {
          zoom: {
            zoom: {
              wheel: {
                enabled: true,
                modifierKey: "ctrl",
              },
              drag: {
                enabled: true,
              },
              pinch: {
                enabled: true,
              },
              mode: "x",
            },
            pan: {
              enabled: true,
              mode: "x",
              modifierKey: "ctrl",
            },
            limits: {
              x: {
                min: "original",
                max: "original",
              },
            },
          },
          annotation: {
            annotations: {
              forecastLine: {
                type: 'line',
                xMin: forecastStartTime,
                xMax: forecastStartTime,
                borderColor: 'rgba(255, 99, 132, 0.5)',
                borderWidth: 2,
                borderDash: [5, 5],
                label: {
                  content: 'Forecast Start',
                  enabled: true,
                  position: 'start'
                }
              }
            }
          },
          legend: {
            display: true,
            position: 'bottom'
          },
          tooltip: {
            callbacks: {
              title: (tooltipItems) => {
                return new Date(tooltipItems[0].parsed.x).toLocaleString();
              },
              label: (context) => {
                return `${context.dataset.label}: ${context.parsed.y.toFixed(2)}%`;
              }
            }
          }
        }
      }
    });
  }

  function displayResults(data) {
    // Display stats
    const stats = document.getElementById('forecast-stats');
    const totalHours = data.forecast.length;
    const days = Math.floor(totalHours / 24);
    const hours = totalHours % 24;
    
    stats.innerHTML = `
      <div class="col-6">
        <div class="card bg-primary text-white">
          <div class="card-body py-2">
            <small>Forecast Period</small>
            <div class="fw-bold">${days}d ${hours}h</div>
          </div>
        </div>
      </div>
      <div class="col-6">
        <div class="card bg-info text-white">
          <div class="card-body py-2">
            <small>Optimal Lag</small>
            <div class="fw-bold">${data.optimalLag} periods</div>
          </div>
        </div>
      </div>
      <div class="col-6">
        <div class="card bg-success text-white">
          <div class="card-body py-2">
            <small>States Analyzed</small>
            <div class="fw-bold">${data.states.length}</div>
          </div>
        </div>
      </div>
      <div class="col-6">
        <div class="card bg-secondary text-white">
          <div class="card-body py-2">
            <small>Historical Data</small>
            <div class="fw-bold">${data.historical.length}h</div>
          </div>
        </div>
      </div>
    `;

    // Display chart
    displayForecastChart(data);

    // Display volatility table
    const tbody = document.getElementById('forecast-volatility-body');
    tbody.innerHTML = '';
    data.states.forEach(state => {
      const histVol = data.historicalVolatility[state] || 0;
      const foreVol = data.forecastVolatility[state] || 0;
      
      let changeText = 'N/A';
      let changeClass = 'text-muted';
      
      if (histVol > 0) {
        const change = ((foreVol - histVol) / histVol * 100);
        changeClass = change > 0 ? 'text-danger' : 'text-success';
        const changeIcon = change > 0 ? '↑' : '↓';
        changeText = `${changeIcon} ${Math.abs(change).toFixed(1)}%`;
      }
      
      tbody.innerHTML += `
        <tr>
          <td><span class="badge" style="background-color: ${STATE_COLORS[state]}">${state}</span></td>
          <td>${histVol.toFixed(2)}</td>
          <td>${foreVol.toFixed(2)}</td>
          <td class="${changeClass}">${changeText}</td>
        </tr>
      `;
    });
  }

  // ====== EVENT HANDLERS ======
  function initializeForecast() {
    const generateBtn = document.getElementById('forecast-generate-btn');
    const btnText = generateBtn.querySelector('.forecast-btn-text');
    const btnSpinner = generateBtn.querySelector('.forecast-btn-spinner');
    const errorDiv = document.getElementById('forecast-error');
    const loadingDiv = document.getElementById('forecast-loading');
    const resultsDiv = document.getElementById('forecast-results');
    const offcanvas = document.getElementById('forecast-view');
    const historicalDaysInput = document.getElementById('forecast-historical-days');

    // Enforce max value on historical days input
    if (historicalDaysInput) {
      historicalDaysInput.addEventListener('input', (e) => {
        const max = parseInt(e.target.max);
        const value = parseInt(e.target.value);
        if (!isNaN(max) && !isNaN(value) && value > max) {
          e.target.value = max;
        }
      });
    }

    // Handle offcanvas close - cancel any ongoing generation
    offcanvas.addEventListener('hide.bs.offcanvas', () => {
      if (isGenerating) {
        shouldCancel = true;
        log('⚠️ Cancelling forecast generation...', 'info');
      }
      
      // Hide results when closing offcanvas
      resultsDiv.classList.add('d-none');
      loadingDiv.classList.add('d-none');
      errorDiv.classList.add('d-none');
      
      // Destroy chart to free up resources
      if (forecastChart) {
        forecastChart.destroy();
        forecastChart = null;
      }
    });

    generateBtn.addEventListener('click', async () => {
      if (isGenerating) return; // Prevent multiple clicks
      
      if (!currentPulseData || currentPulseData.length === 0) {
        errorDiv.textContent = 'No pulse data available. Please select a pulse first.';
        errorDiv.classList.remove('d-none');
        return;
      }

      const params = {
        historicalDays: parseInt(document.getElementById('forecast-historical-days').value),
        forecastPeriods: parseInt(document.getElementById('forecast-periods').value) * 24, // Convert days to hours
        maxLags: parseInt(document.getElementById('forecast-maxlags').value),
        volatilityScale: parseFloat(document.getElementById('forecast-volatility').value),
        patternStrength: parseFloat(document.getElementById('forecast-pattern').value)
      };

      // Update button state
      isGenerating = true;
      generateBtn.disabled = true;
      btnText.classList.add('d-none');
      btnSpinner.classList.remove('d-none');

      errorDiv.classList.add('d-none');
      resultsDiv.classList.add('d-none');
      loadingDiv.classList.remove('d-none');

      // Small delay to ensure UI updates
      await new Promise(resolve => setTimeout(resolve, 50));

      try {
        const forecastData = await generateForecast(currentPulseData, params);
        
        if (!shouldCancel) {
          loadingDiv.classList.add('d-none');
          resultsDiv.classList.remove('d-none');
          displayResults(forecastData);
          
          // Scroll to results after a short delay to ensure rendering is complete
          setTimeout(() => {
            resultsDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 100);
        }
      } catch (err) {
        loadingDiv.classList.add('d-none');
        if (err.message !== 'Cancelled') {
          errorDiv.textContent = `Error: ${err.message}`;
          errorDiv.classList.remove('d-none');
        }
      } finally {
        // Reset button state
        isGenerating = false;
        generateBtn.disabled = false;
        btnText.classList.remove('d-none');
        btnSpinner.classList.add('d-none');
      }
    });
  }

  // ====== PUBLIC API ======
  window.PulseGuardForecast = {
    setPulseData: (data) => {
      currentPulseData = data;
      const generateBtn = document.getElementById('forecast-generate-btn');
      const historicalDaysInput = document.getElementById('forecast-historical-days');
      const forecastButtons = [
        document.getElementById('forecast-view-action'),
        document.getElementById('forecast-view-placeholder-action'),
        document.getElementById('detail-forecast-view-action')
      ];
      
      if (data && data.length > 0) {
        // Calculate max available days from data
        let minTime = Infinity;
        let maxTime = -Infinity;
        
        for (const item of data) {
          let ts = item.timestamp;
          if (ts && typeof ts === 'object' && typeof ts.toNumber === 'function') {
            ts = ts.toNumber();
          } else if (typeof ts !== 'number') {
            ts = Number(ts);
          }
          ts = ts * 1000; // Convert to milliseconds
          
          if (!isNaN(ts) && ts > 0) {
            if (ts < minTime) minTime = ts;
            if (ts > maxTime) maxTime = ts;
          }
        }
        
        const maxAvailableDays = Math.ceil((maxTime - minTime) / (24 * 60 * 60 * 1000));
        
        // Update input field with max and default values
        if (historicalDaysInput && maxAvailableDays > 0) {
          historicalDaysInput.max = maxAvailableDays;
          historicalDaysInput.value = maxAvailableDays;
        }
        
        generateBtn.disabled = false;
        forecastButtons.forEach(btn => {
          if (btn) btn.disabled = false;
        });
      } else {
        generateBtn.disabled = true;
        forecastButtons.forEach(btn => {
          if (btn) btn.disabled = true;
        });
      }
    },
    
    reset: () => {
      currentPulseData = null;
      
      // Clear log
      const logDiv = document.getElementById('forecast-progress-log');
      if (logDiv) {
        logDiv.innerHTML = '';
      }
      
      const generateBtn = document.getElementById('forecast-generate-btn');
      const resultsDiv = document.getElementById('forecast-results');
      const loadingDiv = document.getElementById('forecast-loading');
      const errorDiv = document.getElementById('forecast-error');
      
      if (generateBtn) generateBtn.disabled = true;
      if (resultsDiv) resultsDiv.classList.add('d-none');
      if (loadingDiv) loadingDiv.classList.add('d-none');
      if (errorDiv) errorDiv.classList.add('d-none');
      
      const forecastButtons = [
        document.getElementById('forecast-view-action'),
        document.getElementById('forecast-view-placeholder-action'),
        document.getElementById('detail-forecast-view-action')
      ];
      forecastButtons.forEach(btn => {
        if (btn) btn.disabled = true;
      });
    }
  };

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeForecast);
  } else {
    initializeForecast();
  }

})();
