document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const weatherForm = document.getElementById('weatherForm');
    const cityInput = document.getElementById('cityInput');
    const geolocateBtn = document.getElementById('geolocateBtn');
    const loadingSpinner = document.getElementById('loadingSpinner');
    const weatherResults = document.getElementById('weatherResults');
    const errorMessage = document.getElementById('errorMessage');
    const saveLocationBtn = document.getElementById('saveLocationBtn');

    let hourlyChart = null; // To hold the chart instance

    // --- Event Listeners ---
    weatherForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const city = cityInput.value.trim();
        if (city) {
            fetchWeather({ city });
        }
    });

    geolocateBtn.addEventListener('click', () => {
        if (navigator.geolocation) {
            showLoading();
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    fetchWeather({ latitude, longitude });
                },
                (error) => {
                    showError('Unable to retrieve your location. Please use the search bar.');
                }
            );
        } else {
            showError('Geolocation is not supported by your browser.');
        }
    });

    saveLocationBtn.addEventListener('click', async () => {
        const locationNameToSave = document.getElementById('locationName').dataset.cityName;
        if (!locationNameToSave) {
            showError("Cannot save an unnamed location.");
            return;
        }

        try {
            const response = await fetch('/weather/api/save_location', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCsrfToken() // Assumes you have a function to get CSRF token
                },
                body: JSON.stringify({ city: locationNameToSave })
            });
            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.error || "Failed to save location");
            }
            // Simple visual feedback
            saveLocationBtn.innerHTML = '<i class="fas fa-check"></i> Saved!';
            saveLocationBtn.classList.remove('btn-outline-success');
            saveLocationBtn.classList.add('btn-success');
            setTimeout(() => {
                saveLocationBtn.innerHTML = '<i class="fas fa-save"></i> Save';
                saveLocationBtn.classList.add('btn-outline-success');
                saveLocationBtn.classList.remove('btn-success');
            }, 2000);
        } catch (error) {
            console.error('Save location error:', error);
            showError(error.message);
        }
    });

    // --- Core Functions ---
    async function fetchWeather(locationData) {
        showLoading();
        try {
            const response = await fetch('/weather/api/get_data', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCsrfToken()
                },
                body: JSON.stringify(locationData)
            });
            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'An unknown error occurred.');
            }
            updateUI(result);

        } catch (error) {
            console.error('Fetch weather error:', error);
            showError(error.message);
        }
    }

    function updateUI(data) {
        hideLoading();
        weatherResults.classList.remove('d-none');
        errorMessage.classList.add('d-none');

        // Update current weather
        document.getElementById('locationName').textContent = data.location;
        document.getElementById('locationName').dataset.cityName = data.location;
        const currentIcon = document.getElementById('currentIcon');
        currentIcon.className = `fas ${data.current.icon} weather-icon-lg`;
        document.getElementById('currentTemp').textContent = `${Math.round(data.current.temperature)}°C`;
        document.getElementById('currentApparentTemp').textContent = Math.round(data.current.apparent_temperature);
        document.getElementById('currentHumidity').textContent = data.current.humidity;
        document.getElementById('currentWind').textContent = data.current.wind_speed;
        document.getElementById('currentPrecip').textContent = data.current.precipitation_prob;

        // Update Air & Sun card
        document.getElementById('airQualityAqi').textContent = data.air_quality.us_aqi || 'N/A';
        document.getElementById('dailyUvIndex').textContent = data.daily[0].uv_index_max;
        document.getElementById('dailySunrise').textContent = new Date(data.daily[0].sunrise).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        document.getElementById('dailySunset').textContent = new Date(data.daily[0].sunset).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        // Update daily forecast
        const dailyContainer = document.getElementById('dailyForecastContainer');
        dailyContainer.innerHTML = '';
        data.daily.forEach(day => {
            const dayCard = `
                <div class="col">
                    <div class="weather-card rounded p-3 text-center h-100">
                        <p class="mb-1 fw-bold">${new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}</p>
                        <i class="fas ${day.icon} weather-icon-md my-2"></i>
                        <p class="mb-0">${Math.round(day.temp_max)}° / ${Math.round(day.temp_min)}°</p>
                    </div>
                </div>
            `;
            dailyContainer.innerHTML += dayCard;
        });

        // Update hourly chart
        updateHourlyChart(data.hourly);
    }
    
    function updateHourlyChart(hourlyData) {
        const ctx = document.getElementById('hourlyChart').getContext('2d');
        const labels = hourlyData.map(h => new Date(h.time).toLocaleTimeString([], { hour: 'numeric' }));
        const temperatures = hourlyData.map(h => h.temperature);

        if (hourlyChart) {
            hourlyChart.destroy();
        }

        hourlyChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Temperature (°C)',
                    data: temperatures,
                    borderColor: 'rgba(54, 162, 235, 1)',
                    backgroundColor: 'rgba(54, 162, 235, 0.2)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 2,
                    pointHoverRadius: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: false,
                        grid: { color: 'rgba(255, 255, 255, 0.1)' }
                    },
                    x: {
                        grid: { display: false }
                    }
                },
                plugins: {
                    legend: { display: false }
                }
            }
        });
    }

    // --- UI State Functions ---
    function showLoading() {
        loadingSpinner.classList.remove('d-none');
        weatherResults.classList.add('d-none');
        errorMessage.classList.add('d-none');
    }

    function hideLoading() {
        loadingSpinner.classList.add('d-none');
    }

    function showError(message) {
        hideLoading();
        errorMessage.textContent = message;
        errorMessage.classList.remove('d-none');
        weatherResults.classList.add('d-none');
    }

    // --- Utility ---
    function getCsrfToken() {
        // This function assumes you have a meta tag or a hidden input with the CSRF token
        const csrfTokenInput = document.querySelector('input[name="csrf_token"]');
        return csrfTokenInput ? csrfTokenInput.value : '';
    }

    // --- Initial Load ---
    if (cityInput.value) {
        fetchWeather({ city: cityInput.value });
    }
});