// Onboarding System
let currentStep = 1;
let userOnboardingData = {};

// Check if user has completed onboarding
function checkOnboardingStatus() {
    const onboardingData = localStorage.getItem('weblessHunterOnboarding');
    if (onboardingData) {
        // User has completed onboarding, show main app
        userOnboardingData = JSON.parse(onboardingData);
        showMainApp();
        loadGoogleMapsAPI(userOnboardingData.apiKey);
    } else {
        // Show onboarding
        showOnboarding();
    }
}

function showOnboarding() {
    document.getElementById('onboardingContainer').style.display = 'flex';
    document.getElementById('mainApp').style.display = 'none';
}

function showMainApp() {
    document.getElementById('onboardingContainer').style.display = 'none';
    document.getElementById('mainApp').style.display = 'block';
    
    // Sync controls with current view state after showing main app
    setTimeout(syncControlsWithCurrentView, 200);
}

function nextStep() {
    // Validate current step
    if (!validateCurrentStep()) {
        return;
    }
    
    // Hide current step
    document.getElementById(`step${currentStep}`).classList.remove('active');
    
    // Show next step
    currentStep++;
    document.getElementById(`step${currentStep}`).classList.add('active');
}

function prevStep() {
    // Hide current step
    document.getElementById(`step${currentStep}`).classList.remove('active');
    
    // Show previous step
    currentStep--;
    document.getElementById(`step${currentStep}`).classList.add('active');
}

function validateCurrentStep() {
    switch(currentStep) {
        case 1:
            return true; // Welcome step, no validation needed
        case 2:
            const name = document.getElementById('userName').value.trim();
            const role = document.getElementById('userRole').value;
            if (!name || !role) {
                alert('Please fill in all fields');
                return false;
            }
            userOnboardingData.name = name;
            userOnboardingData.role = role;
            return true;
        case 3:
            const country = document.getElementById('userCountry').value;
            if (!country) {
                alert('Please select your country');
                return false;
            }
            userOnboardingData.country = country;
            return true;
        default:
            return true;
    }
}

function requestLocationAccess() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                userOnboardingData.location = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                document.getElementById('locationStatus').textContent = '✅ Location access granted';
                document.getElementById('locationStatus').style.color = '#000000';
            },
            (error) => {
                document.getElementById('locationStatus').textContent = '❌ Location access denied';
                document.getElementById('locationStatus').style.color = '#dc2626';
            }
        );
    } else {
        document.getElementById('locationStatus').textContent = '❌ Geolocation not supported';
        document.getElementById('locationStatus').style.color = '#dc2626';
    }
}

async function validateAndFinish() {
    const apiKey = document.getElementById('apiKey').value.trim();
    if (!apiKey) {
        alert('Please enter your Google Maps API key');
        return;
    }
    
    // Show loading state
    const finishBtn = document.getElementById('finishBtn');
    const finishBtnText = document.getElementById('finishBtnText');
    finishBtn.disabled = true;
    finishBtnText.textContent = 'Validating API Key...';
    
    // Validate API key
    const isValid = await validateGoogleMapsAPIKey(apiKey);
    
    if (isValid) {
        // Save onboarding data
        userOnboardingData.apiKey = apiKey;
        userOnboardingData.completedAt = new Date().toISOString();
        localStorage.setItem('weblessHunterOnboarding', JSON.stringify(userOnboardingData));
        
        // Show success and transition to main app
        document.getElementById('apiStatus').textContent = '✅ API Key is valid!';
        document.getElementById('apiStatus').className = 'api-status success';
        
        setTimeout(() => {
            showMainApp();
            loadGoogleMapsAPI(apiKey);
        }, 1000);
    } else {
        // Show error
        document.getElementById('apiStatus').textContent = '❌ Invalid API Key. Please check and try again.';
        document.getElementById('apiStatus').className = 'api-status error';
        
        finishBtn.disabled = false;
        finishBtnText.textContent = 'Validate & Start Hunting';
    }
}

async function validateGoogleMapsAPIKey(apiKey) {
    // Simple format validation - Google API keys are typically 39 characters long
    // and start with "AIza"
    if (apiKey.length >= 35 && apiKey.startsWith('AIza')) {
        return true;
    }
    return false;
}

function loadGoogleMapsAPI(apiKey) {
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initMap&loading=async`;
    script.async = true;
    script.defer = true;
    document.getElementById('googleMapsScript').appendChild(script);
}

function factoryReset() {
    if (confirm('Are you sure you want to reset everything? This will delete all your data and settings.')) {
        // Clear all localStorage
        localStorage.clear();
        
        // Reload the page to start fresh
        window.location.reload();
    }
}

// Handle tab visibility changes to prevent animation issues
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        console.log('Tab hidden - pausing animations');
    } else {
        console.log('Tab visible - resuming animations');
    }
});

function syncControlsWithCurrentView() {
    // Detect which view is currently active
    const tableView = document.getElementById('tableView');
    const mapView = document.getElementById('mapView');
    const tableControls = document.getElementById('tableControls');
    const mapControls = document.getElementById('mapControls');
    
    // Check which view is visible
    const isTableViewVisible = tableView.style.display !== 'none';
    const isMapViewVisible = mapView.style.display !== 'none';
    
    // Update controls based on visible view
    if (isTableViewVisible) {
        currentView = 'table';
        tableControls.style.display = 'flex';
        mapControls.style.display = 'none';
        // Update tab buttons
        document.getElementById('tableTab').classList.add('active');
        document.getElementById('mapTab').classList.remove('active');
    } else {
        currentView = 'map';
        tableControls.style.display = 'none';
        mapControls.style.display = 'flex';
        // Update tab buttons
        document.getElementById('mapTab').classList.add('active');
        document.getElementById('tableTab').classList.remove('active');
    }
}

// Initialize onboarding check when page loads
document.addEventListener('DOMContentLoaded', () => {
    checkOnboardingStatus();
    // Sync controls after a short delay to ensure DOM is ready
    setTimeout(syncControlsWithCurrentView, 100);
});

let map, service;
let currentResults = [];
let selectedBusinesses = [];
let allFoundBusinesses = []; // Track ALL businesses found during search
let searchProgress = {
    totalAreas: 0,
    completedAreas: 0,
    totalBusinesses: 0,
    potentialClients: 0
};
let searchMap, resultsMap;
let searchMarkers = [];
let currentView = 'map';
let searchCircles = [];
let businessMarkers = new Map(); // Track markers by place_id
let locationMarker = null; // Track the location selection marker
let selectedLocation = null; // Store selected coordinates

function initMap() {
    map = new google.maps.Map(document.createElement('div'));
    service = new google.maps.places.PlacesService(map);
    
    // Load saved state after map is initialized
    setTimeout(() => {
        loadSearchState();
        
        // If no saved state, get current location and show map
        if (!allFoundBusinesses.length) {
            useCurrentLocation();
            switchView('map'); // Show map view by default
        }
    }, 100);
}

function switchView(view) {
    currentView = view;
    
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(view + 'Tab').classList.add('active');
    
    // Show/hide controls based on view
    const tableControls = document.getElementById('tableControls');
    const mapControls = document.getElementById('mapControls');
    
    // Show/hide views
    if (view === 'table') {
        document.getElementById('tableView').style.display = 'block';
        document.getElementById('mapView').style.display = 'none';
        tableControls.style.display = 'flex';
        mapControls.style.display = 'none';
    } else {
        document.getElementById('tableView').style.display = 'none';
        document.getElementById('mapView').style.display = 'block';
        tableControls.style.display = 'none';
        mapControls.style.display = 'flex';
        
        // Initialize map view
        if (allFoundBusinesses.length > 0) {
            // We have saved data, restore complete map
            const savedState = JSON.parse(localStorage.getItem('businessFinderState') || '{}');
            restoreCompleteMap(savedState.searchCenter, savedState.searchCirclesData);
        } else {
            // No saved data, show default map
            initializeMapView();
        }
    }
    
    // Save state when view changes
    if (currentResults.length > 0) {
        saveSearchState();
    }
}

function initializeMapView() {
    // Initialize map if it doesn't exist
    if (!resultsMap) {
        resultsMap = new google.maps.Map(document.getElementById('resultsMap'), {
            zoom: 13,
            center: selectedLocation || { lat: 53.3498, lng: -6.2603 },
            styles: [
                {
                    "elementType": "geometry",
                    "stylers": [{"color": "#f5f5f5"}]
                },
                {
                    "elementType": "labels.icon",
                    "stylers": [{"visibility": "off"}]
                },
                {
                    "elementType": "labels.text.fill",
                    "stylers": [{"color": "#616161"}]
                },
                {
                    "elementType": "labels.text.stroke",
                    "stylers": [{"color": "#f5f5f5"}]
                },
                {
                    "featureType": "administrative",
                    "elementType": "geometry",
                    "stylers": [{"color": "#fefefe"}]
                },
                {
                    "featureType": "administrative.country",
                    "elementType": "labels.text.fill",
                    "stylers": [{"color": "#9e9e9e"}]
                },
                {
                    "featureType": "administrative.locality",
                    "elementType": "labels.text.fill",
                    "stylers": [{"color": "#424242"}]
                },
                {
                    "featureType": "poi",
                    "stylers": [{"visibility": "off"}]
                },
                {
                    "featureType": "road",
                    "elementType": "geometry.fill",
                    "stylers": [{"color": "#000000"}]
                },
                {
                    "featureType": "road",
                    "elementType": "labels.text.fill",
                    "stylers": [{"color": "#757575"}]
                },
                {
                    "featureType": "road.arterial",
                    "elementType": "geometry",
                    "stylers": [{"color": "#000000"}]
                },
                {
                    "featureType": "road.highway",
                    "elementType": "geometry",
                    "stylers": [{"color": "#000000"}]
                },
                {
                    "featureType": "water",
                    "elementType": "geometry",
                    "stylers": [{"color": "#c9c9c9"}]
                },
                {
                    "featureType": "water",
                    "elementType": "labels.text.fill",
                    "stylers": [{"color": "#9e9e9e"}]
                }
            ],
            disableDefaultUI: true,
            zoomControl: true,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false,
            rotateControl: false,
            scaleControl: false,
            gestureHandling: 'cooperative'
        });
        
        // Add click listener for location selection
        resultsMap.addListener('click', (event) => {
            setLocationFromClick(event.latLng);
        });
    }
    
    // If we have a selected location, show the pin
    if (selectedLocation && !locationMarker) {
        showLocationPin();
    }
    
    // If we have search results, show them
    if (currentResults.length > 0) {
        showResultsMap();
    } else {
        // Show default map with current location if available
        showDefaultMap();
    }
}

function showDefaultMap() {
    const locationInput = document.getElementById('location').value;
    
    if (locationInput) {
        // Try to show the entered location
        getCoordinates(locationInput).then(location => {
            resultsMap.setCenter({ lat: location.lat, lng: location.lng });
            resultsMap.setZoom(15);
            
            // Add a pin for the location
            new google.maps.Marker({
                position: { lat: location.lat, lng: location.lng },
                map: resultsMap,
                title: 'Search Location',
                icon: {
                    url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                        <svg width="30" height="30" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="15" cy="15" r="12" fill="#3b82f6" stroke="white" stroke-width="3"/>
                            <circle cx="15" cy="15" r="5" fill="white"/>
                        </svg>
                    `),
                    scaledSize: new google.maps.Size(30, 30)
                }
            });
        }).catch(() => {
            // If location parsing fails, try to get current location
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(position => {
                    const lat = position.coords.latitude;
                    const lng = position.coords.longitude;
                    resultsMap.setCenter({ lat, lng });
                    resultsMap.setZoom(15);
                    
                    new google.maps.Marker({
                        position: { lat, lng },
                        map: resultsMap,
                        title: 'Your Location',
                        icon: {
                            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                                <svg width="30" height="30" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <circle cx="15" cy="15" r="12" fill="#3b82f6" stroke="white" stroke-width="3"/>
                                    <circle cx="15" cy="15" r="5" fill="white"/>
                                </svg>
                            `),
                            scaledSize: new google.maps.Size(30, 30)
                        }
                    });
                });
            }
        });
    } else if (navigator.geolocation) {
        // No location entered, try to get current location
        navigator.geolocation.getCurrentPosition(position => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            resultsMap.setCenter({ lat, lng });
            resultsMap.setZoom(15);
            
            new google.maps.Marker({
                position: { lat, lng },
                map: resultsMap,
                title: 'Your Location',
                icon: {
                    url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                        <svg width="30" height="30" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="15" cy="15" r="12" fill="#3b82f6" stroke="white" stroke-width="3"/>
                            <circle cx="15" cy="15" r="5" fill="white"/>
                        </svg>
                    `),
                    scaledSize: new google.maps.Size(30, 30)
                }
            });
        });
    }
}

// localStorage functions
function saveSearchState() {
    const searchState = {
        currentResults: currentResults,
        selectedBusinesses: selectedBusinesses,
        allFoundBusinesses: allFoundBusinesses, // Save ALL businesses found
        searchProgress: searchProgress,
        currentView: currentView,
        searchLocation: document.getElementById('location').value,
        businessType: document.getElementById('businessType').value,
        searchIntensity: document.getElementById('searchIntensity').value,
        searchCenter: resultsMap ? {
            lat: resultsMap.getCenter().lat(),
            lng: resultsMap.getCenter().lng(),
            zoom: resultsMap.getZoom()
        } : null,
        // Save all search circles data
        searchCirclesData: searchCircles.map(circle => ({
            center: {
                lat: circle.getCenter().lat(),
                lng: circle.getCenter().lng()
            },
            radius: circle.getRadius(),
            strokeColor: circle.get('strokeColor'),
            strokeOpacity: circle.get('strokeOpacity'),
            strokeWeight: circle.get('strokeWeight'),
            fillColor: circle.get('fillColor'),
            fillOpacity: circle.get('fillOpacity')
        })),
        timestamp: Date.now()
    };
    
    localStorage.setItem('businessFinderState', JSON.stringify(searchState));
    console.log('Search state saved to localStorage with', searchState.searchCirclesData.length, 'circles');
}

function loadSearchState() {
    const savedState = localStorage.getItem('businessFinderState');
    if (!savedState) return false;
    
    try {
        const searchState = JSON.parse(savedState);
        
        // Restore form values
        document.getElementById('location').value = searchState.searchLocation || '';
        document.getElementById('businessType').value = searchState.businessType || 'all';
        document.getElementById('searchIntensity').value = searchState.searchIntensity || 'hyperlocal';
        
        // Restore results and progress
        currentResults = searchState.currentResults || [];
        selectedBusinesses = searchState.selectedBusinesses || [];
        allFoundBusinesses = searchState.allFoundBusinesses || []; // Restore ALL businesses
        searchProgress = searchState.searchProgress || { totalAreas: 0, completedAreas: 0, totalBusinesses: 0, potentialClients: 0 };
        
        // Restore view
        if (searchState.currentView) {
            currentView = searchState.currentView;
            // Update tab buttons
            document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
            document.getElementById(currentView + 'Tab').classList.add('active');
            
            // Show/hide views
            if (currentView === 'table') {
                document.getElementById('tableView').style.display = 'block';
                document.getElementById('mapView').style.display = 'none';
            } else {
                document.getElementById('tableView').style.display = 'none';
                document.getElementById('mapView').style.display = 'block';
            }
        }
        
        // Restore UI
        if (currentResults.length > 0) {
            displayResults(currentResults);
            updateStats(searchProgress.totalBusinesses, currentResults.length, currentResults.reduce((sum, b) => sum + b.estimatedValue, 0));
        }
        
        // Force restore map if we have data and we're in map view
        if (allFoundBusinesses.length > 0 && currentView === 'map') {
            setTimeout(() => {
                console.log('Force restoring map with', allFoundBusinesses.length, 'businesses');
                restoreCompleteMap(searchState.searchCenter, searchState.searchCirclesData);
            }, 1000); // Longer delay to ensure map container is ready
        }
        
        updateBulkActions();
        console.log('Search state loaded from localStorage');
        return true;
        
    } catch (error) {
        console.log('Error loading search state:', error);
        localStorage.removeItem('businessFinderState');
        return false;
    }
}

function restoreCompleteMap(searchCenter, savedCircles) {
    console.log('=== RESTORING COMPLETE MAP ===');
    console.log('Businesses to restore:', allFoundBusinesses.length);
    console.log('Circles to restore:', savedCircles ? savedCircles.length : 0);
    console.log('Search center:', searchCenter);
    
    // Initialize map if it doesn't exist
    if (!resultsMap) {
        console.log('Creating new map...');
        resultsMap = new google.maps.Map(document.getElementById('resultsMap'), {
            zoom: searchCenter ? searchCenter.zoom : 13,
            center: searchCenter ? { lat: searchCenter.lat, lng: searchCenter.lng } : { lat: 53.3498, lng: -6.2603 },
            styles: [
                {
                    "elementType": "geometry",
                    "stylers": [{"color": "#f5f5f5"}]
                },
                {
                    "elementType": "labels.icon",
                    "stylers": [{"visibility": "off"}]
                },
                {
                    "elementType": "labels.text.fill",
                    "stylers": [{"color": "#616161"}]
                },
                {
                    "elementType": "labels.text.stroke",
                    "stylers": [{"color": "#f5f5f5"}]
                },
                {
                    "featureType": "administrative",
                    "elementType": "geometry",
                    "stylers": [{"color": "#fefefe"}]
                },
                {
                    "featureType": "administrative.country",
                    "elementType": "labels.text.fill",
                    "stylers": [{"color": "#9e9e9e"}]
                },
                {
                    "featureType": "administrative.locality",
                    "elementType": "labels.text.fill",
                    "stylers": [{"color": "#424242"}]
                },
                {
                    "featureType": "poi",
                    "stylers": [{"visibility": "off"}]
                },
                {
                    "featureType": "road",
                    "elementType": "geometry.fill",
                    "stylers": [{"color": "#000000"}]
                },
                {
                    "featureType": "road",
                    "elementType": "labels.text.fill",
                    "stylers": [{"color": "#757575"}]
                },
                {
                    "featureType": "road.arterial",
                    "elementType": "geometry",
                    "stylers": [{"color": "#000000"}]
                },
                {
                    "featureType": "road.highway",
                    "elementType": "geometry",
                    "stylers": [{"color": "#000000"}]
                },
                {
                    "featureType": "water",
                    "elementType": "geometry",
                    "stylers": [{"color": "#c9c9c9"}]
                },
                {
                    "featureType": "water",
                    "elementType": "labels.text.fill",
                    "stylers": [{"color": "#9e9e9e"}]
                }
            ],
            disableDefaultUI: true,
            zoomControl: true,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false,
            rotateControl: false,
            scaleControl: false,
            gestureHandling: 'cooperative'
        });
        
        // Add click listener for location selection
        resultsMap.addListener('click', (event) => {
            setLocationFromClick(event.latLng);
        });
    }
    
    // Clear existing markers and circles
    console.log('Clearing existing markers:', searchMarkers.length);
    searchMarkers.forEach(marker => marker.setMap(null));
    searchMarkers = [];
    businessMarkers.clear();
    
    searchCircles.forEach(circle => circle.setMap(null));
    searchCircles = [];
    
    // Restore search circles FIRST (so they appear behind pins)
    if (savedCircles && savedCircles.length > 0) {
        console.log('Restoring', savedCircles.length, 'search circles...');
        savedCircles.forEach((circleData, index) => {
            const restoredCircle = new google.maps.Circle({
                strokeColor: circleData.strokeColor,
                strokeOpacity: circleData.strokeOpacity,
                strokeWeight: circleData.strokeWeight,
                fillColor: circleData.fillColor,
                fillOpacity: circleData.fillOpacity,
                map: resultsMap,
                center: { lat: circleData.center.lat, lng: circleData.center.lng },
                radius: circleData.radius
            });
            
            searchCircles.push(restoredCircle);
            console.log(`Restored circle ${index + 1}: radius ${(circleData.radius/1000).toFixed(1)}km`);
        });
    }
    
    // Add center marker if we have search center
    if (searchCenter) {
        console.log('Adding center marker...');
        const centerMarker = new google.maps.Marker({
            position: { lat: searchCenter.lat, lng: searchCenter.lng },
            map: resultsMap,
            title: 'Search Center',
            icon: {
                url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                    <svg width="30" height="30" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="15" cy="15" r="12" fill="#3b82f6" stroke="white" stroke-width="3"/>
                        <circle cx="15" cy="15" r="5" fill="white"/>
                    </svg>
                `),
                scaledSize: new google.maps.Size(30, 30)
            }
        });
        searchMarkers.push(centerMarker);
    }
    
    // Plot all businesses exactly like during search
    console.log('Plotting businesses...');
    let plottedCount = 0;
    allFoundBusinesses.forEach((business, index) => {
        console.log(`Business ${index + 1}: ${business.name}`);
        console.log('  - Has savedLat:', !!business.savedLat);
        console.log('  - Has savedLng:', !!business.savedLng);
        console.log('  - Has website:', business.hasWebsite);
        
        if (business.savedLat && business.savedLng) {
            const position = {
                lat: parseFloat(business.savedLat),
                lng: parseFloat(business.savedLng)
            };
            
            console.log('  - Position:', position);
            
            // Choose icon based on website status
            let iconSvg, size;
            if (business.hasWebsite) {
                // Red pin for businesses with websites
                iconSvg = `
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="8" cy="8" r="6" fill="#dc2626" stroke="white" stroke-width="2"/>
                    </svg>
                `;
                size = new google.maps.Size(16, 16);
            } else {
                // Green pin for potential clients
                iconSvg = `
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="12" cy="12" r="10" fill="#000000" stroke="white" stroke-width="3"/>
                        <text x="12" y="16" text-anchor="middle" fill="white" font-size="12" font-weight="bold">$</text>
                    </svg>
                `;
                size = new google.maps.Size(24, 24);
            }
            
            const marker = new google.maps.Marker({
                position: position,
                map: resultsMap,
                title: business.name,
                icon: {
                    url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(iconSvg),
                    scaledSize: size
                }
            });
            
            console.log('  - Marker created successfully');
            
            // Add info windows
            if (!business.hasWebsite && business.formatted_phone_number) {
                const distance = business.distance < 1 ? 
                    Math.round(business.distance * 1000) + 'm' : 
                    business.distance.toFixed(1) + 'km';
                    
                const infoWindow = new google.maps.InfoWindow({
                    content: `
                        <div style="padding: 8px; min-width: 200px;">
                            <h3 style="margin: 0 0 8px 0; font-size: 16px; color: #000000;">${business.name}</h3>
                            <p style="margin: 0 0 4px 0; font-size: 12px; color: #666;">${business.businessType || 'Business'}</p>
                            <p style="margin: 0 0 4px 0; font-size: 12px;"><strong>Distance:</strong> ${distance}</p>
                            <p style="margin: 0 0 8px 0; font-size: 12px;"><strong>Potential Value:</strong> $${business.estimatedValue ? business.estimatedValue.toLocaleString() : '2,500'}</p>
                            <a href="tel:${business.formatted_phone_number}" style="color: #000000; text-decoration: none; font-weight: 600; font-size: 14px;">📞 ${business.formatted_phone_number}</a>
                        </div>
                    `
                });
                
                marker.addListener('click', () => {
                    infoWindow.open(resultsMap, marker);
                });
            } else if (business.hasWebsite) {
                const infoWindow = new google.maps.InfoWindow({
                    content: `
                        <div style="padding: 8px; min-width: 150px;">
                            <h3 style="margin: 0 0 8px 0; font-size: 16px; color: #dc2626;">${business.name}</h3>
                            <p style="margin: 0 0 4px 0; font-size: 12px; color: #666;">${business.businessType || 'Business'}</p>
                            <p style="margin: 0; font-size: 12px; color: #000000;">✅ Has Website</p>
                        </div>
                    `
                });
                
                marker.addListener('click', () => {
                    infoWindow.open(resultsMap, marker);
                });
            }
            
            businessMarkers.set(business.place_id, marker);
            searchMarkers.push(marker);
            plottedCount++;
        } else {
            console.log(`  - Skipping: no saved coordinates`);
        }
    });
    
    console.log(`Successfully plotted ${plottedCount} businesses`);
    console.log('Total markers on map:', searchMarkers.length);
    console.log('Total circles on map:', searchCircles.length);
    
    // Apply current filter
    setTimeout(() => {
        filterMapView();
        console.log('Applied filter, restoration complete!');
    }, 100);
}

function clearSearchState() {
    localStorage.removeItem('businessFinderState');
    allFoundBusinesses = []; // Clear the businesses array too
    
    // Reset statistics display
    document.getElementById('totalFound').textContent = '0';
    document.getElementById('withoutWebsite').textContent = '0';
    document.getElementById('potentialRevenue').textContent = '$0';
    
    // Clear any existing search circles
    searchCircles.forEach(circle => circle.setMap(null));
    searchCircles = [];
    
    // Stop all active radar sweeps
    activeSweepIntervals.forEach((interval, radius) => {
        clearInterval(interval);
    });
    activeSweepIntervals.clear();
    
    console.log('Previous search state cleared');
}

function initializeSearchMap(centerLocation) {
    // Clear existing map
    if (resultsMap) {
        searchMarkers.forEach(marker => marker.setMap(null));
        searchCircles.forEach(circle => circle.setMap(null));
        searchMarkers = [];
        searchCircles = [];
        businessMarkers.clear();
    }
    
    // Initialize results map for search animation
    resultsMap = new google.maps.Map(document.getElementById('resultsMap'), {
        center: { lat: centerLocation.lat, lng: centerLocation.lng },
        zoom: 13,
        styles: [
            {
                "elementType": "geometry",
                "stylers": [{"color": "#f5f5f5"}]
            },
            {
                "elementType": "labels.icon",
                "stylers": [{"visibility": "off"}]
            },
            {
                "elementType": "labels.text.fill",
                "stylers": [{"color": "#616161"}]
            },
            {
                "elementType": "labels.text.stroke",
                "stylers": [{"color": "#f5f5f5"}]
            },
            {
                "featureType": "administrative",
                "elementType": "geometry",
                "stylers": [{"color": "#fefefe"}]
            },
            {
                "featureType": "administrative.country",
                "elementType": "labels.text.fill",
                "stylers": [{"color": "#9e9e9e"}]
            },
            {
                "featureType": "administrative.locality",
                "elementType": "labels.text.fill",
                "stylers": [{"color": "#424242"}]
            },
            {
                "featureType": "poi",
                "stylers": [{"visibility": "off"}]
            },
            {
                "featureType": "road",
                "elementType": "geometry.fill",
                "stylers": [{"color": "#000000"}]
            },
            {
                "featureType": "road",
                "elementType": "labels.text.fill",
                "stylers": [{"color": "#757575"}]
            },
            {
                "featureType": "road.arterial",
                "elementType": "geometry",
                "stylers": [{"color": "#000000"}]
            },
            {
                "featureType": "road.highway",
                "elementType": "geometry",
                "stylers": [{"color": "#000000"}]
            },
            {
                "featureType": "water",
                "elementType": "geometry",
                "stylers": [{"color": "#c9c9c9"}]
            },
            {
                "featureType": "water",
                "elementType": "labels.text.fill",
                "stylers": [{"color": "#9e9e9e"}]
            }
        ],
        disableDefaultUI: true,
        zoomControl: true,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        rotateControl: false,
        scaleControl: false,
        gestureHandling: 'cooperative'
    });
    
    // Add center marker with pulsing animation
    const centerMarker = new google.maps.Marker({
        position: { lat: centerLocation.lat, lng: centerLocation.lng },
        map: resultsMap,
        title: 'Search Center',
        icon: {
            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                <svg width="30" height="30" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="15" cy="15" r="12" fill="#3b82f6" stroke="white" stroke-width="3"/>
                    <circle cx="15" cy="15" r="5" fill="white"/>
                    <circle cx="15" cy="15" r="15" fill="none" stroke="#3b82f6" stroke-width="2" opacity="0.3">
                        <animate attributeName="r" values="15;25;15" dur="2s" repeatCount="indefinite"/>
                        <animate attributeName="opacity" values="0.3;0;0.3" dur="2s" repeatCount="indefinite"/>
                    </circle>
                </svg>
            `),
            scaledSize: new google.maps.Size(30, 30)
        }
    });
    
    searchMarkers.push(centerMarker);
}

let activeSweepIntervals = new Map(); // Track active sweep intervals by radius

function showSearchCircle(centerLocation, radius) {
    if (!resultsMap) return;
    
    // Calculate zoom level
    let zoom = 15;
    if (radius > 40000) zoom = 9;
    else if (radius > 20000) zoom = 10;
    else if (radius > 10000) zoom = 11;
    else if (radius > 5000) zoom = 12;
    else if (radius > 2000) zoom = 13;
    else if (radius > 1000) zoom = 14;
    
    // Animate to appropriate zoom
    resultsMap.setZoom(zoom);
    
    // Ensure click listener is always active
    google.maps.event.clearListeners(resultsMap, 'click');
    resultsMap.addListener('click', (event) => {
        setLocationFromClick(event.latLng);
    });
    
    // Create permanent search circle (stays visible)
    const permanentCircle = new google.maps.Circle({
        strokeColor: '#16a34a',
        strokeOpacity: 0.6,
        strokeWeight: 2,
        fillColor: '#16a34a',
        fillOpacity: 0.1,
        map: resultsMap,
        center: { lat: centerLocation.lat, lng: centerLocation.lng },
        radius: radius
    });
    
    searchCircles.push(permanentCircle);
    
    // Start sonar-like pulse animation
    let pulseCount = 0;
    const maxPulses = 3; // Maximum concurrent pulses
    
    const createPulse = () => {
        // Don't create new pulses if tab is not visible
        if (document.hidden) return;
        
        const pulseCircle = new google.maps.Circle({
            strokeColor: '#16a34a',
            strokeOpacity: 1,
            strokeWeight: 2,
            fillColor: '#16a34a',
            fillOpacity: 0.2,
            map: resultsMap,
            center: { lat: centerLocation.lat, lng: centerLocation.lng },
            radius: 0
        });
        
        // Animate pulse expansion with easing
        let currentRadius = 0;
        let opacity = 1;
        const startTime = performance.now();
        const duration = 2000; // 2 seconds for full pulse
        
        const animatePulse = (currentTime) => {
            if (document.hidden) {
                // Clean up if tab becomes hidden
                pulseCircle.setMap(null);
                return;
            }
            
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Eased expansion (starts fast, slows down)
            const easedProgress = 1 - Math.pow(1 - progress, 3);
            currentRadius = radius * easedProgress;
            
            // Fade out as it expands
            opacity = Math.max(0, 1 - progress);
            
            pulseCircle.setRadius(currentRadius);
            pulseCircle.setOptions({
                strokeOpacity: opacity * 0.8,
                fillOpacity: opacity * 0.15
            });
            
            if (progress < 1) {
                requestAnimationFrame(animatePulse);
            } else {
                // Remove pulse when complete
                pulseCircle.setMap(null);
                pulseCount--;
            }
        };
        
        pulseCount++;
        requestAnimationFrame(animatePulse);
    };
    
    // Create initial pulse immediately
    createPulse();
    
    // Create new pulses every 800ms
    const sweepInterval = setInterval(() => {
        if (pulseCount < maxPulses && !document.hidden) {
            createPulse();
        }
    }, 800);
    
    // Store the interval so we can stop it later
    activeSweepIntervals.set(radius, sweepInterval);
}

function stopRadarSweep(radius) {
    const sweepInterval = activeSweepIntervals.get(radius);
    if (sweepInterval) {
        clearInterval(sweepInterval);
        activeSweepIntervals.delete(radius);
        console.log(`Stopped radar sweep for radius ${radius}m`);
    }
}

function plotBusinessOnMap(business, status) {
    if (!resultsMap || !business.geometry) return;
    
    const position = {
        lat: business.geometry.location.lat(),
        lng: business.geometry.location.lng()
    };
    
    // Create marker based on status
    let iconSvg, size;
    
    if (status === 'found') {
        // Small red pin for newly found business
        iconSvg = `
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="8" cy="8" r="6" fill="#dc2626" stroke="white" stroke-width="2"/>
            </svg>
        `;
        size = new google.maps.Size(16, 16);
        
        // Add to allFoundBusinesses when first found with ACTUAL coordinates
        if (!allFoundBusinesses.find(b => b.place_id === business.place_id)) {
            allFoundBusinesses.push({
                ...business,
                hasWebsite: true, // Assume has website until proven otherwise
                // Save actual coordinates as numbers, not geometry functions
                savedLat: position.lat,
                savedLng: position.lng
            });
        }
    } else {
        // Larger green pin for businesses without websites
        iconSvg = `
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" fill="#000000" stroke="white" stroke-width="3"/>
                <text x="12" y="16" text-anchor="middle" fill="white" font-size="12" font-weight="bold">$</text>
            </svg>
        `;
        size = new google.maps.Size(24, 24);
        
        // Update in allFoundBusinesses with ACTUAL coordinates
        const foundBusiness = allFoundBusinesses.find(b => b.place_id === business.place_id);
        if (foundBusiness) {
            foundBusiness.hasWebsite = false;
            Object.assign(foundBusiness, business);
            // Save actual coordinates as numbers
            foundBusiness.savedLat = position.lat;
            foundBusiness.savedLng = position.lng;
        }
    }
    
    const marker = new google.maps.Marker({
        position: position,
        map: resultsMap,
        title: business.name,
        icon: {
            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(iconSvg),
            scaledSize: size
        },
        animation: status === 'found' ? google.maps.Animation.DROP : google.maps.Animation.BOUNCE
    });
    
    // Stop bounce animation after 1 second
    if (status === 'potential') {
        setTimeout(() => {
            marker.setAnimation(null);
        }, 1000);
    }
    
    // Store marker for later updates
    businessMarkers.set(business.place_id, marker);
    searchMarkers.push(marker);
    
    // Add info window for potential clients
    if (status === 'potential') {
        const distance = business.distance < 1 ? 
            Math.round(business.distance * 1000) + 'm' : 
            business.distance.toFixed(1) + 'km';
            
        const infoWindow = new google.maps.InfoWindow({
            content: `
                <div style="padding: 8px; min-width: 200px;">
                    <h3 style="margin: 0 0 8px 0; font-size: 16px; color: #000000;">${business.name}</h3>
                    <p style="margin: 0 0 4px 0; font-size: 12px; color: #666;">${business.businessType}</p>
                    <p style="margin: 0 0 4px 0; font-size: 12px;"><strong>Distance:</strong> ${distance}</p>
                    <p style="margin: 0 0 8px 0; font-size: 12px;"><strong>Potential Value:</strong> $${business.estimatedValue.toLocaleString()}</p>
                    <a href="tel:${business.formatted_phone_number}" style="color: #000000; text-decoration: none; font-weight: 600; font-size: 14px;">📞 ${business.formatted_phone_number}</a>
                </div>
            `
        });
        
        marker.addListener('click', () => {
            infoWindow.open(resultsMap, marker);
        });
    }
}

function filterMapView() {
    const filterValue = document.querySelector('input[name="mapFilter"]:checked').value;
    
    if (!resultsMap || allFoundBusinesses.length === 0) return;
    
    // Clear existing markers
    searchMarkers.forEach(marker => marker.setMap(null));
    searchMarkers = [];
    businessMarkers.clear();
    
    const bounds = new google.maps.LatLngBounds();
    let businessesToShow = [];
    
    if (filterValue === 'all') {
        businessesToShow = allFoundBusinesses;
    } else if (filterValue === 'potential') {
        businessesToShow = allFoundBusinesses.filter(b => !b.hasWebsite);
    } else if (filterValue === 'withWebsites') {
        businessesToShow = allFoundBusinesses.filter(b => b.hasWebsite);
    }
    
    businessesToShow.forEach(business => {
        if (business.savedLat && business.savedLng) {
            const position = {
                lat: parseFloat(business.savedLat),
                lng: parseFloat(business.savedLng)
            };
            
            // Choose icon based on website status
            let iconSvg, size;
            if (business.hasWebsite) {
                // Red pin for businesses with websites
                iconSvg = `
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="8" cy="8" r="6" fill="#dc2626" stroke="white" stroke-width="2"/>
                    </svg>
                `;
                size = new google.maps.Size(16, 16);
            } else {
                // Green pin for potential clients
                iconSvg = `
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="12" cy="12" r="10" fill="#000000" stroke="white" stroke-width="3"/>
                        <text x="12" y="16" text-anchor="middle" fill="white" font-size="12" font-weight="bold">$</text>
                    </svg>
                `;
                size = new google.maps.Size(24, 24);
            }
            
            const marker = new google.maps.Marker({
                position: position,
                map: resultsMap,
                title: business.name,
                icon: {
                    url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(iconSvg),
                    scaledSize: size
                }
            });
            
            // Add info window for businesses without websites
            if (!business.hasWebsite && business.formatted_phone_number) {
                const distance = business.distance < 1 ? 
                    Math.round(business.distance * 1000) + 'm' : 
                    business.distance.toFixed(1) + 'km';
                    
                const infoWindow = new google.maps.InfoWindow({
                    content: `
                        <div style="padding: 8px; min-width: 200px;">
                            <h3 style="margin: 0 0 8px 0; font-size: 16px; color: #000000;">${business.name}</h3>
                            <p style="margin: 0 0 4px 0; font-size: 12px; color: #666;">${business.businessType || 'Business'}</p>
                            <p style="margin: 0 0 4px 0; font-size: 12px;"><strong>Distance:</strong> ${distance}</p>
                            <p style="margin: 0 0 8px 0; font-size: 12px;"><strong>Potential Value:</strong> $${business.estimatedValue ? business.estimatedValue.toLocaleString() : '2,500'}</p>
                            <a href="tel:${business.formatted_phone_number}" style="color: #000000; text-decoration: none; font-weight: 600; font-size: 14px;">📞 ${business.formatted_phone_number}</a>
                        </div>
                    `
                });
                
                marker.addListener('click', () => {
                    infoWindow.open(resultsMap, marker);
                });
            } else if (business.hasWebsite) {
                // Add basic info window for businesses with websites
                const infoWindow = new google.maps.InfoWindow({
                    content: `
                        <div style="padding: 8px; min-width: 150px;">
                            <h3 style="margin: 0 0 8px 0; font-size: 16px; color: #dc2626;">${business.name}</h3>
                            <p style="margin: 0 0 4px 0; font-size: 12px; color: #666;">${business.businessType || 'Business'}</p>
                            <p style="margin: 0; font-size: 12px; color: #000000;">✅ Has Website</p>
                        </div>
                    `
                });
                
                marker.addListener('click', () => {
                    infoWindow.open(resultsMap, marker);
                });
            }
            
            businessMarkers.set(business.place_id, marker);
            searchMarkers.push(marker);
            bounds.extend(position);
        }
    });
    
    // Fit map to show all markers
    if (businessesToShow.length > 1) {
        resultsMap.fitBounds(bounds);
    } else if (businessesToShow.length === 1) {
        resultsMap.setCenter(bounds.getCenter());
        resultsMap.setZoom(15);
    }
}

function updateBusinessMarker(business) {
    const marker = businessMarkers.get(business.place_id);
    if (marker) {
        // Remove old red marker
        marker.setMap(null);
        // Add new green marker
        plotBusinessOnMap(business, 'potential');
    }
}

async function processBusinessesWithMap(places, centerLocation) {
    const businessesWithoutWebsites = [];
    const batchSize = 10;
    let processed = 0;
    
    console.log(`Processing ${places.length} businesses for website analysis`);
    
    try {
        for (let i = 0; i < places.length; i += batchSize) {
            const batch = places.slice(i, i + batchSize);
            
            const batchPromises = batch.map(place => {
                return new Promise((resolve) => {
                    service.getDetails({
                        placeId: place.place_id,
                        fields: ['name', 'formatted_phone_number', 'website', 'formatted_address', 'rating', 'types', 'business_status']
                    }, (details, status) => {
                        processed++;
                        
                        try {
                            if (status === google.maps.places.PlacesServiceStatus.OK && 
                                details.business_status === 'OPERATIONAL' &&
                                details.formatted_phone_number) {
                                
                                console.log(`Business: ${details.name}, Has website: ${!!details.website}`);
                                
                                if (!details.website) {
                                    const business = {
                                        ...details,
                                        ...place, // Include geometry
                                        distance: place.distance,
                                        estimatedValue: calculateEstimatedValue(details),
                                        businessType: getBusinessType(details.types),
                                        priority: calculatePriority(details, place.distance)
                                    };
                                    
                                    businessesWithoutWebsites.push(business);
                                    searchProgress.potentialClients++;
                                    
                                    // Update marker to green potential client
                                    updateBusinessMarker(business);
                                }
                            }
                            
                            updateLoadingStatus(
                                `Analyzing business ${processed} of ${places.length}...`,
                                `Found ${businessesWithoutWebsites.length} businesses without websites`
                            );
                        } catch (error) {
                            console.log('Error processing business:', error);
                        }
                        
                        resolve();
                    });
                });
            });
            
            await Promise.all(batchPromises);
            updateProgress();
            
            if (i + batchSize < places.length) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }
        
        console.log(`Final results: ${businessesWithoutWebsites.length} businesses without websites`);
        
        businessesWithoutWebsites.sort((a, b) => a.distance - b.distance);
        
        hideLoading();
        currentResults = businessesWithoutWebsites;
        displayResults(businessesWithoutWebsites);
        updateStats(searchProgress.totalBusinesses, businessesWithoutWebsites.length, businessesWithoutWebsites.reduce((sum, b) => sum + b.estimatedValue, 0));
        
        // Save state after search completes
        saveSearchState();
        
    } catch (error) {
        console.log('Error in processBusinessesWithMap:', error);
        hideLoading();
        alert('Search completed with some errors. Check console for details.');
    }
}

function setLocationFromClick(latLng) {
    const lat = latLng.lat();
    const lng = latLng.lng();
    
    // Store selected coordinates
    selectedLocation = { lat, lng };
    
    // Update hidden input with coordinates
    document.getElementById('location').value = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    
    // Remove previous marker if exists
    if (locationMarker) {
        locationMarker.setMap(null);
    }
    
    // Add new marker at clicked location first
    locationMarker = new google.maps.Marker({
        position: { lat, lng },
        map: resultsMap,
        title: 'Selected Location - Click Search to hunt here!',
        icon: {
            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                <svg width="30" height="30" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="15" cy="15" r="12" fill="#dc2626" stroke="white" stroke-width="3"/>
                    <circle cx="15" cy="15" r="5" fill="white"/>
                </svg>
            `),
            scaledSize: new google.maps.Size(30, 30)
        }
    });
    
    // Then smoothly pan to the pin location after a brief delay
    setTimeout(() => {
        resultsMap.panTo({ lat, lng });
    }, 300);
    
    console.log('Location selected:', lat.toFixed(6), lng.toFixed(6));
}

function showLocationPin() {
    if (selectedLocation && resultsMap) {
        locationMarker = new google.maps.Marker({
            position: selectedLocation,
            map: resultsMap,
            title: 'Selected Location - Click Search to hunt here!',
            icon: {
                url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                    <svg width="30" height="30" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="15" cy="15" r="12" fill="#3b82f6" stroke="white" stroke-width="3"/>
                        <circle cx="15" cy="15" r="5" fill="white"/>
                    </svg>
                `),
                scaledSize: new google.maps.Size(30, 30)
            }
        });
    }
}

function useCurrentLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(position => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            
            // Store selected coordinates
            selectedLocation = { lat, lng };
            
            // Update hidden input with coordinates
            document.getElementById('location').value = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
            
            // Switch to map view if not already
            if (currentView !== 'map') {
                switchView('map');
            }
            
            // Center map on current position
            if (resultsMap) {
                resultsMap.setCenter({ lat, lng });
                resultsMap.setZoom(15);
            }
            
            // Remove previous marker if exists
            if (locationMarker) {
                locationMarker.setMap(null);
            }
            
            // Add marker at current location
            if (resultsMap) {
                locationMarker = new google.maps.Marker({
                    position: { lat, lng },
                    map: resultsMap,
                    title: 'Current Location - Click Search to hunt here!',
                    icon: {
                        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                            <svg width="30" height="30" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <circle cx="15" cy="15" r="12" fill="#3b82f6" stroke="white" stroke-width="3"/>
                                <circle cx="15" cy="15" r="5" fill="white"/>
                            </svg>
                        `),
                        scaledSize: new google.maps.Size(30, 30)
                    }
                });
            }
            
            console.log('Current location set:', lat.toFixed(6), lng.toFixed(6));
        }, error => {
            alert('Unable to get your location. Please click on the map to select a location.');
        });
    } else {
        alert('Geolocation not supported by this browser. Please click on the map to select a location.');
    }
}

async function searchBusinesses() {
    const locationInput = document.getElementById('location').value;
    
    // Hide stats panel during search
    document.getElementById('statsPanel').style.display = 'none';
    
    if (!locationInput && !selectedLocation) {
        alert('Please select a location by clicking on the map or using current location');
        return;
    }

    // Clear previous search state
    clearSearchState();

    showLoading();
    clearResults();
    resetProgress();

    try {
        let location;
        
        // Use selectedLocation if available, otherwise parse input
        if (selectedLocation) {
            location = selectedLocation;
        } else {
            // Try to parse coordinates from input
            const coords = locationInput.split(',').map(coord => parseFloat(coord.trim()));
            if (coords.length === 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
                location = { lat: coords[0], lng: coords[1] };
            } else {
                // Fallback to geocoding
                location = await getCoordinates(locationInput);
            }
        }
        
        console.log('Searching at location:', location);
        await findBusinessesWithoutWebsites(location);
    } catch (error) {
        alert('Error finding location: ' + error.message);
        hideLoading();
    }
}

function getCoordinates(locationInput) {
    return new Promise((resolve, reject) => {
        if (locationInput.includes(',')) {
            const [lat, lng] = locationInput.split(',').map(coord => parseFloat(coord.trim()));
            if (!isNaN(lat) && !isNaN(lng)) {
                resolve({ lat, lng });
            } else {
                reject(new Error('Invalid coordinates format'));
            }
        } else {
            const geocoder = new google.maps.Geocoder();
            geocoder.geocode({ address: locationInput }, (results, status) => {
                if (status === 'OK') {
                    const location = results[0].geometry.location;
                    resolve({ lat: location.lat(), lng: location.lng() });
                } else {
                    reject(new Error('Location not found'));
                }
            });
        }
    });
}

async function findBusinessesWithoutWebsites(location) {
    const businessType = document.getElementById('businessType').value;
    const searchIntensity = document.getElementById('searchIntensity').value;
    
    // Switch to map view for search animation
    switchView('map');
    
    // Updated search radii to match new intensity levels
    const searchRadii = {
        hyperlocal: [100, 250, 500, 750, 1000],           // 0.1km to 1km
        neighborhood: [100, 250, 500, 1000, 1500, 2000],  // 0.1km to 2km  
        district: [100, 500, 1000, 2000, 3000, 5000],     // 0.1km to 5km
        citywide: [100, 1000, 2000, 5000, 10000, 15000, 20000], // 0.1km to 20km
        regional: [100, 1000, 5000, 10000, 20000, 35000, 50000] // 0.1km to 50km
    };
    
    const radii = searchRadii[searchIntensity];
    searchProgress.totalAreas = radii.length;
    
    // Initialize search map
    initializeSearchMap(location);
    
    updateLoadingStatus('Starting search...', `Searching ${radii.length} zones from 0.1km outward`);
    
    let allResults = [];
    let seenPlaceIds = new Set();
    let processedRadii = 0;
    
    for (const radius of radii) {
        const radiusKm = (radius / 1000).toFixed(1);
        updateLoadingStatus(
            `Scanning ${radiusKm}km radius...`,
            `Searching for businesses within ${radiusKm}km`
        );
        
        // Show search circle animation
        showSearchCircle(location, radius);
        
        const radiusResults = await searchRadius(location, radius, businessType);
        
        // Plot found businesses immediately (but only if they're within radius)
        radiusResults.forEach(business => {
            if (!seenPlaceIds.has(business.place_id)) {
                // Calculate distance to check if business is actually within radius
                const businessDistance = calculateDistance(location, {
                    lat: business.geometry.location.lat(),
                    lng: business.geometry.location.lng()
                });
                
                // Only plot if within radius (convert radius from meters to km)
                const radiusKm = radius / 1000;
                if (businessDistance <= radiusKm) {
                    plotBusinessOnMap(business, 'found');
                } else {
                    console.log(`Skipping ${business.name} - outside radius (${businessDistance.toFixed(2)}km > ${radiusKm}km)`);
                }
            }
        });
        
        // Stop radar sweep for this radius after businesses are plotted
        stopRadarSweep(radius);
        
        // Add only new businesses that are within the radius
        const newResults = radiusResults.filter(result => {
            if (seenPlaceIds.has(result.place_id)) {
                return false;
            }
            
            // Check if business is actually within radius
            const businessDistance = calculateDistance(location, {
                lat: result.geometry.location.lat(),
                lng: result.geometry.location.lng()
            });
            
            const radiusKm = radius / 1000;
            if (businessDistance <= radiusKm) {
                seenPlaceIds.add(result.place_id);
                return true;
            } else {
                console.log(`Filtering out ${result.name} - outside radius (${businessDistance.toFixed(2)}km > ${radiusKm}km)`);
                return false;
            }
        });
        
        allResults = allResults.concat(newResults);
        processedRadii++;
        
        searchProgress.completedAreas = processedRadii;
        searchProgress.totalBusinesses = allResults.length;
        updateProgress();
        
        console.log(`Radius ${radiusKm}km: Found ${radiusResults.length} total, ${newResults.length} new businesses`);
        
        if (processedRadii < radii.length) {
            await new Promise(resolve => setTimeout(resolve, 1500));
        }
    }
    
    updateLoadingStatus('Analyzing websites...', `Found ${allResults.length} unique businesses`);
    
    // Add distance calculation
    const businessesWithDistance = allResults.map(business => ({
        ...business,
        distance: calculateDistance(location, {
            lat: business.geometry.location.lat(),
            lng: business.geometry.location.lng()
        })
    }));
    
    // Sort by distance
    businessesWithDistance.sort((a, b) => a.distance - b.distance);
    
    // Process for websites and update pins
    await processBusinessesWithMap(businessesWithDistance, location);
}

function updateOverlayStatus(status, details) {
    const statusEl = document.getElementById('overlayStatus');
    const detailsEl = document.getElementById('overlayDetails');
    if (statusEl) statusEl.textContent = status;
    if (detailsEl) detailsEl.textContent = details;
}

async function searchRadius(center, radius, businessType) {
    const searchTypes = businessType === 'all' 
        ? ['establishment', 'store', 'food', 'restaurant']
        : [businessType];
    
    let radiusResults = [];
    
    for (const type of searchTypes) {
        const request = {
            location: new google.maps.LatLng(center.lat, center.lng),
            radius: radius,
            type: type
        };
        
        try {
            const results = await searchWithPagination(request);
            radiusResults = radiusResults.concat(results);
        } catch (error) {
            console.log(`Search failed for type ${type}:`, error);
        }
        
        await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    return radiusResults;
}

function searchWithPagination(request) {
    return new Promise((resolve) => {
        let pageResults = [];
        
        service.nearbySearch(request, function handleResults(results, status, pagination) {
            if (status === google.maps.places.PlacesServiceStatus.OK) {
                pageResults = pageResults.concat(results);
                
                if (pagination && pagination.hasNextPage && pageResults.length < 60) {
                    setTimeout(() => {
                        pagination.nextPage();
                    }, 2000);
                } else {
                    resolve(pageResults);
                }
            } else {
                console.log(`Search failed with status: ${status}`);
                resolve(pageResults);
            }
        });
    });
}

function calculateDistance(point1, point2) {
    const R = 6371;
    const dLat = (point2.lat - point1.lat) * Math.PI / 180;
    const dLng = (point2.lng - point1.lng) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(point1.lat * Math.PI / 180) * Math.cos(point2.lat * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

async function processBusinesses(places, centerLocation) {
    const businessesWithoutWebsites = [];
    const batchSize = 10;
    let processed = 0;
    
    console.log(`Processing ${places.length} businesses for website analysis`);
    
    for (let i = 0; i < places.length; i += batchSize) {
        const batch = places.slice(i, i + batchSize);
        
        const batchPromises = batch.map(place => {
            return new Promise((resolve) => {
                service.getDetails({
                    placeId: place.place_id,
                    fields: ['name', 'formatted_phone_number', 'website', 'formatted_address', 'rating', 'types', 'business_status']
                }, (details, status) => {
                    processed++;
                    
                    if (status === google.maps.places.PlacesServiceStatus.OK && 
                        details.business_status === 'OPERATIONAL' &&
                        details.formatted_phone_number) {
                        
                        console.log(`Business: ${details.name}, Has website: ${!!details.website}, Phone: ${!!details.formatted_phone_number}`);
                        
                        if (!details.website) {
                            const business = {
                                ...details,
                                distance: place.distance,
                                estimatedValue: calculateEstimatedValue(details),
                                businessType: getBusinessType(details.types),
                                priority: calculatePriority(details, place.distance)
                            };
                            
                            businessesWithoutWebsites.push(business);
                            searchProgress.potentialClients++;
                        }
                    }
                    
                    updateLoadingStatus(
                        `Analyzing business ${processed} of ${places.length}...`,
                        `Found ${businessesWithoutWebsites.length} businesses without websites`
                    );
                    
                    resolve();
                });
            });
        });
        
        await Promise.all(batchPromises);
        updateProgress();
        
        if (i + batchSize < places.length) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }
    
    console.log(`Final results: ${businessesWithoutWebsites.length} businesses without websites`);
    
    businessesWithoutWebsites.sort((a, b) => a.distance - b.distance);
    
    hideLoading();
    currentResults = businessesWithoutWebsites;
    displayResults(businessesWithoutWebsites);
    updateStats(searchProgress.totalBusinesses, businessesWithoutWebsites.length, businessesWithoutWebsites.reduce((sum, b) => sum + b.estimatedValue, 0));
}

function calculateEstimatedValue(business) {
    const baseValue = 2500;
    const ratingMultiplier = business.rating ? (business.rating / 5) : 0.5;
    return Math.round(baseValue * ratingMultiplier);
}

function getBusinessType(types) {
    const typeMap = {
        'restaurant': 'Restaurant',
        'food': 'Food & Dining',
        'store': 'Retail Store',
        'beauty_salon': 'Beauty Salon',
        'gym': 'Fitness',
        'car_repair': 'Auto Service',
        'lawyer': 'Legal',
        'dentist': 'Healthcare'
    };
    
    if (!types) return 'Business';
    
    for (let type of types) {
        if (typeMap[type]) return typeMap[type];
    }
    return 'Business';
}

function calculatePriority(business, distance) {
    let priority = 0;
    
    if (distance < 0.2) priority += 100;
    else if (distance < 0.5) priority += 80;
    else if (distance < 1.0) priority += 60;
    else if (distance < 2.0) priority += 40;
    
    if (business.rating) {
        priority += business.rating * 20;
    }
    
    return priority;
}

function displayResults(businesses) {
    const resultsBody = document.getElementById('results-body');
    const resultsTitle = document.getElementById('results-title');
    const resultsSubtitle = document.getElementById('results-subtitle');
    
    // Remove existing click outside listener
    document.removeEventListener('click', handleClickOutside);
    
    if (businesses.length === 0) {
        resultsTitle.textContent = 'No Results Found';
        resultsSubtitle.textContent = 'All businesses in this area already have websites';
        resultsBody.innerHTML = `
            <tr class="empty-state">
                <td colspan="8">
                    <div class="empty-content">
                        <div class="empty-icon">🎉</div>
                        <h3>Amazing! All businesses have websites</h3>
                        <p>This area is well-covered digitally. Try searching a different location.</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    resultsTitle.textContent = `🎯 Found ${businesses.length} Prospects`;
    resultsSubtitle.textContent = `Sorted by distance - closest businesses first`;
    
    resultsBody.innerHTML = '';
    
    businesses.forEach((business, index) => {
        const distanceText = business.distance < 1 ? `${Math.round(business.distance * 1000)}m` : `${business.distance.toFixed(1)}km`;
        
        // Main business row
        const row = document.createElement('tr');
        row.className = 'business-row';
        row.setAttribute('data-index', index);
        
        row.innerHTML = `
            <td>
                <input type="checkbox" onchange="toggleBusinessSelection(${index})" data-index="${index}">
            </td>
            <td>
                <div class="business-name">${business.name}</div>
                <div class="business-type">${business.businessType}</div>
            </td>
            <td>
                <a href="tel:${business.formatted_phone_number}" class="phone">
                    ${business.formatted_phone_number}
                </a>
            </td>
            <td>
                <div class="address">${business.formatted_address}</div>
            </td>
            <td>
                <div class="distance">${distanceText}</div>
            </td>
            <td>
                <div class="rating">
                    ${business.rating ? `
                        <span class="stars">${'★'.repeat(Math.floor(business.rating))}</span>
                        <span class="rating-value">${business.rating}/5</span>
                    ` : '<span class="rating-value">No rating</span>'}
                </div>
            </td>
            <td>
                <div class="estimated-value">$${business.estimatedValue.toLocaleString()}</div>
            </td>
            <td>
                <div class="actions">
                    <button class="btn-whatsapp btn-sm" onclick="event.stopPropagation(); sendWhatsAppByIndex(${index})">
                        <i class="fab fa-whatsapp"></i> WhatsApp
                    </button>
                </div>
            </td>
        `;
        
        // Add click listener to row
        row.addEventListener('click', (event) => {
            // Don't trigger if clicking on checkbox or button
            if (event.target.type === 'checkbox' || event.target.closest('button') || event.target.closest('a')) {
                return;
            }
            toggleBusinessCard(index);
        });
        
        resultsBody.appendChild(row);
        
        // Expandable card row
        const cardRow = document.createElement('tr');
        cardRow.className = 'business-card';
        cardRow.id = `card-${index}`;
        cardRow.style.display = 'none';
        
        cardRow.innerHTML = `
            <td colspan="8">
                <div class="card-content">
                    <div class="card-header">
                        <h3>${business.name}</h3>
                        <span class="card-close" onclick="closeAllCards()">×</span>
                    </div>
                    <div class="card-body">
                        <div class="card-section">
                            <strong>Business Type:</strong> ${business.businessType || 'Not specified'}
                        </div>
                        <div class="card-section">
                            <strong>Address:</strong> ${business.formatted_address}
                        </div>
                        <div class="card-section">
                            <strong>Distance:</strong> ${distanceText}
                        </div>
                        <div class="card-section">
                            <strong>Phone:</strong> <a href="tel:${business.formatted_phone_number}" style="color: #000000;">${business.formatted_phone_number}</a>
                        </div>
                        <div class="card-section">
                            <strong>Rating:</strong> ${business.rating ? '⭐ ' + business.rating + '/5' + (business.user_ratings_total ? ' (' + business.user_ratings_total + ' reviews)' : '') : 'No rating available'}
                        </div>
                        ${business.price_level ? `
                        <div class="card-section">
                            <strong>Price Level:</strong> ${'$'.repeat(business.price_level)} (${business.price_level}/4)
                        </div>` : ''}
                        ${business.opening_hours ? `
                        <div class="card-section">
                            <strong>Status:</strong> ${business.opening_hours.open_now ? '🟢 Open Now' : '🔴 Closed'}
                        </div>` : ''}
                        ${business.website ? `
                        <div class="card-section">
                            <strong>Website:</strong> <a href="${business.website}" target="_blank" style="color: #000000;">Visit Website</a>
                        </div>` : `
                        <div class="card-section">
                            <strong>Website:</strong> <span style="color: #000000; font-weight: 600;">💰 No Website - Potential Client!</span>
                        </div>`}
                        ${business.types && business.types.length > 0 ? `
                        <div class="card-section">
                            <strong>Categories:</strong> ${business.types.slice(0, 3).map(type => type.replace(/_/g, ' ')).join(', ')}
                        </div>` : ''}
                        ${business.vicinity ? `
                        <div class="card-section">
                            <strong>Area:</strong> ${business.vicinity}
                        </div>` : ''}
                        <div class="card-section">
                            <strong>Estimated Value:</strong> <span style="color: #000000; font-weight: 600;">$${business.estimatedValue.toLocaleString()}</span>
                        </div>
                        ${business.place_id ? `
                        <div class="card-section" style="font-size: 12px; opacity: 0.7;">
                            <strong>Place ID:</strong> <code>${business.place_id}</code>
                        </div>` : ''}
                    </div>
                    <div class="card-actions">
                        <button class="btn-whatsapp" onclick="sendWhatsAppByIndex(${index})">
                            <i class="fab fa-whatsapp"></i> Contact via WhatsApp
                        </button>
                    </div>
                </div>
            </td>
        `;
        resultsBody.appendChild(cardRow);
    });
    
    // Add single click outside listener
    setTimeout(() => {
        document.addEventListener('click', handleClickOutside);
    }, 100);
}

let currentOpenCard = null;

function toggleBusinessCard(index) {
    const card = document.getElementById(`card-${index}`);
    
    // If this card is already open, close it
    if (currentOpenCard === index) {
        card.style.display = 'none';
        currentOpenCard = null;
        return;
    }
    
    // Close any currently open card
    closeAllCards();
    
    // Open the clicked card
    card.style.display = 'table-row';
    currentOpenCard = index;
}

function closeAllCards() {
    if (currentOpenCard !== null) {
        const openCard = document.getElementById(`card-${currentOpenCard}`);
        if (openCard) {
            openCard.style.display = 'none';
        }
        currentOpenCard = null;
    }
}

function handleClickOutside(event) {
    // Check if click is inside the results table
    const resultsTable = event.target.closest('#results-table');
    
    // If click is outside the results table, close all cards
    if (!resultsTable) {
        closeAllCards();
    }
}

function updateStats(totalFound, withoutWebsite, potentialRevenue) {
    // Show stats panel when we have data to display
    document.getElementById('statsPanel').style.display = 'block';
    
    document.getElementById('totalFound').textContent = totalFound;
    document.getElementById('withoutWebsite').textContent = withoutWebsite;
    document.getElementById('potentialRevenue').textContent = `$${potentialRevenue.toLocaleString()}`;
}

function resetProgress() {
    searchProgress = { totalAreas: 0, completedAreas: 0, totalBusinesses: 0, potentialClients: 0 };
    updateProgress();
}

function updateProgress() {
    const progressPercent = searchProgress.totalAreas > 0 
        ? (searchProgress.completedAreas / searchProgress.totalAreas) * 100 
        : 0;
    
    document.getElementById('btnProgress').style.width = `${progressPercent}%`;
    document.getElementById('areasScanned').textContent = searchProgress.completedAreas;
    document.getElementById('businessesFound').textContent = searchProgress.totalBusinesses;
    document.getElementById('potentialClients').textContent = searchProgress.potentialClients;
}

function updateLoadingStatus(status, details) {
    document.getElementById('statusText').textContent = status;
    document.getElementById('statusDetails').textContent = details;
}

function showLoading() {
    const searchBtn = document.getElementById('searchBtn');
    const btnText = document.getElementById('btnText');
    const searchStatus = document.getElementById('searchStatus');
    
    searchBtn.classList.add('loading');
    searchBtn.disabled = true;
    btnText.textContent = 'Searching...';
    searchStatus.classList.add('active');
    
    // Update title during search
    document.getElementById('results-title').textContent = '🔍 Search in Progress...';
    document.getElementById('results-subtitle').textContent = 'Scanning area for businesses without websites';
}

function hideLoading() {
    const searchBtn = document.getElementById('searchBtn');
    const btnText = document.getElementById('btnText');
    const searchStatus = document.getElementById('searchStatus');
    
    searchBtn.classList.remove('loading');
    searchBtn.disabled = false;
    btnText.textContent = '🔍 Find All Businesses';
    searchStatus.classList.remove('active');
}

function clearResults() {
    currentResults = [];
    selectedBusinesses = [];
    document.getElementById('selectAllCheckbox').checked = false;
    
    // Update title to show search in progress
    const resultsTitle = document.getElementById('results-title');
    const resultsSubtitle = document.getElementById('results-subtitle');
    
    if (resultsTitle) {
        resultsTitle.textContent = '🔍 Search in Progress...';
    }
    if (resultsSubtitle) {
        resultsSubtitle.textContent = 'Scanning area for businesses without websites';
    }
    
    // Clear table content
    const resultsBody = document.getElementById('results-body');
    if (resultsBody) {
        resultsBody.innerHTML = `
            <tr class="empty-state">
                <td colspan="8">
                    <div class="empty-content">
                        <div class="empty-icon">🔍</div>
                        <h3>Search in Progress...</h3>
                        <p>Scanning area for businesses without websites</p>
                    </div>
                </td>
            </tr>
        `;
    }
}

function toggleBusinessSelection(index) {
    const checkbox = document.querySelector(`input[data-index="${index}"]`);
    const row = checkbox.closest('tr');
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');
    const selectAllBtn = document.querySelector('button[onclick="selectAll()"]');
    
    if (checkbox.checked) {
        selectedBusinesses.push(currentResults[index]);
        row.classList.add('selected');
    } else {
        selectedBusinesses = selectedBusinesses.filter(b => b !== currentResults[index]);
        row.classList.remove('selected');
    }
    
    // Update select all checkbox and button based on current selection
    const allCheckboxes = document.querySelectorAll('tbody input[type="checkbox"]');
    const checkedBoxes = document.querySelectorAll('tbody input[type="checkbox"]:checked');
    
    if (checkedBoxes.length === allCheckboxes.length && allCheckboxes.length > 0) {
        selectAllCheckbox.checked = true;
        selectAllBtn.textContent = 'Deselect All';
    } else {
        selectAllCheckbox.checked = false;
        selectAllBtn.textContent = 'Select All';
    }
    
    updateBulkActions();
}

function contactBusiness(phone, name) {
    const message = `Hi! I noticed ${name} doesn't have a website. I'd love to help you establish an online presence. Can we chat?`;
    const encodedMessage = encodeURIComponent(message);
    
    if (navigator.userAgent.match(/iPhone|iPad|iPod|Android/i)) {
        window.open(`sms:${phone}?body=${encodedMessage}`);
    } else {
        alert(`Call ${phone}\n\nSuggested message:\n${message}`);
    }
}

function filterResults() {
    const filter = document.getElementById('searchFilter').value.toLowerCase();
    const filteredResults = currentResults.filter(business => 
        business.name.toLowerCase().includes(filter) ||
        business.formatted_address.toLowerCase().includes(filter) ||
        business.businessType.toLowerCase().includes(filter)
    );
    displayResults(filteredResults);
}

function sortResults() {
    const sortBy = document.getElementById('sortBy').value;
    const sortedResults = [...currentResults].sort((a, b) => {
        switch(sortBy) {
            case 'distance':
                return a.distance - b.distance;
            case 'name':
                return a.name.localeCompare(b.name);
            case 'rating':
                return (b.rating || 0) - (a.rating || 0);
            case 'priority':
                return b.priority - a.priority;
            default:
                return a.distance - b.distance;
        }
    });
    displayResults(sortedResults);
}

function selectAll() {
    const selectAllBtn = document.querySelector('button[onclick="selectAll()"]');
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');
    
    if (selectAllCheckbox.checked) {
        // Deselect all
        selectAllCheckbox.checked = false;
        selectAllBtn.textContent = 'Select All';
    } else {
        // Select all
        selectAllCheckbox.checked = true;
        selectAllBtn.textContent = 'Deselect All';
    }
    
    toggleSelectAll();
}

function toggleSelectAll() {
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');
    const checkboxes = document.querySelectorAll('tbody input[type="checkbox"]');
    const selectAllBtn = document.querySelector('button[onclick="selectAll()"]');
    
    selectedBusinesses = [];
    checkboxes.forEach((checkbox, index) => {
        checkbox.checked = selectAllCheckbox.checked;
        if (selectAllCheckbox.checked && currentResults[index]) {
            selectedBusinesses.push(currentResults[index]);
            checkbox.closest('tr').classList.add('selected');
        } else {
            checkbox.closest('tr').classList.remove('selected');
        }
    });
    
    // Update button text based on state
    if (selectAllCheckbox.checked) {
        selectAllBtn.textContent = 'Deselect All';
    } else {
        selectAllBtn.textContent = 'Select All';
    }
    
    updateBulkActions();
    
    // Save state when selection changes
    if (currentResults.length > 0) {
        saveSearchState();
    }
}

function updateBulkActions() {
    const selectedInfo = document.getElementById('selectedInfo');
    const selectedCount = document.getElementById('selectedCount');
    const exportBtn = document.getElementById('exportSelectedBtn');
    
    if (selectedBusinesses.length > 0) {
        selectedInfo.style.display = 'block';
        selectedCount.textContent = `${selectedBusinesses.length} selected`;
        exportBtn.disabled = false;
        exportBtn.style.opacity = '1';
    } else {
        selectedInfo.style.display = 'none';
        exportBtn.disabled = true;
        exportBtn.style.opacity = '0.5';
    }
}

function exportSelected() {
    if (selectedBusinesses.length === 0) {
        alert('No businesses selected');
        return;
    }
    
    // Create CSV content for selected businesses
    const headers = ['Name', 'Type', 'Phone', 'Address', 'Distance', 'Rating', 'Estimated Value'];
    const csvContent = [
        headers.join(','),
        ...selectedBusinesses.map(business => [
            `"${business.name}"`,
            `"${business.businessType}"`,
            `"${business.formatted_phone_number}"`,
            `"${business.formatted_address}"`,
            business.distance < 1 ? `${Math.round(business.distance * 1000)}m` : `${business.distance.toFixed(1)}km`,
            business.rating || 'No rating',
            `$${business.estimatedValue.toLocaleString()}`
        ].join(','))
    ].join('\n');
    
    // Download CSV file
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `selected-businesses-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    console.log(`Exported ${selectedBusinesses.length} selected businesses to CSV`);
}

function bulkExport() {
    if (selectedBusinesses.length === 0) {
        alert('No businesses selected');
        return;
    }
    exportToCSV();
}

function exportToCSV() {
    const dataToExport = selectedBusinesses.length > 0 ? selectedBusinesses : currentResults;
    
    if (dataToExport.length === 0) {
        alert('No data to export');
        return;
    }

    const headers = ['Business Name', 'Phone', 'Address', 'Distance', 'Rating', 'Business Type', 'Estimated Value'];
    const csvContent = [
        headers.join(','),
        ...dataToExport.map(business => [
            `"${business.name}"`,
            `"${business.formatted_phone_number}"`,
            `"${business.formatted_address}"`,
            business.distance < 1 ? `${Math.round(business.distance * 1000)}m` : `${business.distance.toFixed(1)}km`,
            business.rating || 'N/A',
            `"${business.businessType}"`,
            business.estimatedValue
        ].join(','))
    ].join('\n');

    downloadFile(csvContent, 'businesses-without-websites.csv', 'text/csv');
}

function exportToJSON() {
    const dataToExport = selectedBusinesses.length > 0 ? selectedBusinesses : currentResults;
    
    if (dataToExport.length === 0) {
        alert('No data to export');
        return;
    }

    const jsonContent = JSON.stringify(dataToExport, null, 2);
    downloadFile(jsonContent, 'businesses-without-websites.json', 'application/json');
}

function downloadFile(content, filename, contentType) {
    const blob = new Blob([content], { type: contentType });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
}

function showResultsMap() {
    if (!resultsMap) {
        resultsMap = new google.maps.Map(document.getElementById('resultsMap'), {
            zoom: 13,
            styles: [
                {
                    featureType: 'poi',
                    elementType: 'labels',
                    stylers: [{ visibility: 'off' }]
                },
                {
                    featureType: 'all',
                    elementType: 'geometry',
                    stylers: [{ saturation: -20 }]
                }
            ]
        });
    }
    
    // Use the filter function to show appropriate businesses
    filterMapView();
}

// Country code mapping for common countries
const countryToPhoneCode = {
    'ireland': '353',
    'uk': '44',
    'united kingdom': '44',
    'usa': '1',
    'united states': '1',
    'canada': '1',
    'australia': '61',
    'germany': '49',
    'france': '33',
    'spain': '34',
    'italy': '39',
    'netherlands': '31',
    'belgium': '32',
    'switzerland': '41',
    'austria': '43',
    'sweden': '46',
    'norway': '47',
    'denmark': '45',
    'finland': '358',
    'poland': '48',
    'czech republic': '420',
    'portugal': '351',
    'india': '91',
    'china': '86',
    'japan': '81',
    'south korea': '82',
    'brazil': '55',
    'mexico': '52',
    'argentina': '54',
    'south africa': '27',
    'egypt': '20',
    'nigeria': '234',
    'kenya': '254',
    'uae': '971',
    'saudi arabia': '966',
    'turkey': '90',
    'russia': '7',
    'ukraine': '380',
    'greece': '30',
    'bulgaria': '359',
    'romania': '40',
    'hungary': '36',
    'croatia': '385',
    'slovenia': '386',
    'slovakia': '421',
    'lithuania': '370',
    'latvia': '371',
    'estonia': '372'
};

function getCountryCodeFromAddress(address) {
    if (!address) return '1'; // Default fallback
    
    // Get the last part of the address (usually the country)
    const addressLower = address.toLowerCase();
    
    // Check if any country name appears in the address
    for (const [country, code] of Object.entries(countryToPhoneCode)) {
        if (addressLower.includes(country)) {
            console.log(`Found country "${country}" in address, using phone code +${code}`);
            return code;
        }
    }
    
    console.log('No country match found in address, using default +1');
    return '1'; // Default fallback
}

function getCountryCodeFromPlaceDetails(place) {
    // Check if place has address_components (from detailed place info)
    if (place.address_components) {
        for (const component of place.address_components) {
            if (component.types.includes('country')) {
                const countryCode = component.short_name.toLowerCase();
                const phoneCode = getPhoneCodeFromCountryCode(countryCode);
                console.log(`Found country component: ${component.long_name} (${countryCode}), using phone code +${phoneCode}`);
                return phoneCode;
            }
        }
    }
    
    // Fallback to address parsing if no address_components
    return getCountryCodeFromAddress(place.formatted_address);
}

function getPhoneCodeFromCountryCode(countryCode) {
    const countryCodeMap = {
        'ie': '353', // Ireland
        'gb': '44',  // United Kingdom
        'us': '1',   // United States
        'ca': '1',   // Canada
        'au': '61',  // Australia
        'de': '49',  // Germany
        'fr': '33',  // France
        'es': '34',  // Spain
        'it': '39',  // Italy
        'nl': '31',  // Netherlands
        'be': '32',  // Belgium
        'ch': '41',  // Switzerland
        'at': '43',  // Austria
        'se': '46',  // Sweden
        'no': '47',  // Norway
        'dk': '45',  // Denmark
        'fi': '358', // Finland
        'pl': '48',  // Poland
        'cz': '420', // Czech Republic
        'pt': '351', // Portugal
        'in': '91',  // India
        'cn': '86',  // China
        'jp': '81',  // Japan
        'kr': '82',  // South Korea
        'br': '55',  // Brazil
        'mx': '52',  // Mexico
        'ar': '54',  // Argentina
        'za': '27',  // South Africa
        'eg': '20',  // Egypt
        'ng': '234', // Nigeria
        'ke': '254', // Kenya
        'ae': '971', // UAE
        'sa': '966', // Saudi Arabia
        'tr': '90',  // Turkey
        'ru': '7',   // Russia
        'ua': '380', // Ukraine
        'gr': '30',  // Greece
        'bg': '359', // Bulgaria
        'ro': '40',  // Romania
        'hu': '36',  // Hungary
        'hr': '385', // Croatia
        'si': '386', // Slovenia
        'sk': '421', // Slovakia
        'lt': '370', // Lithuania
        'lv': '371', // Latvia
        'ee': '372'  // Estonia
    };
    
    return countryCodeMap[countryCode] || '1';
}

function sendWhatsAppByIndex(index) {
    const business = currentResults[index];
    if (!business) {
        console.error('Business not found at index:', index);
        return;
    }
    
    sendWhatsApp(
        business.formatted_phone_number,
        business.name,
        business.businessType || 'Business',
        business // Pass full business object
    );
}

function sendWhatsApp(phoneNumber, businessName, businessType, businessPlace) {
    // Get user's country code as default, then try business location
    let countryCode = getUserCountryCode();
    
    // Try to get more specific country code from business location if available
    const businessCountryCode = getCountryCodeFromPlaceDetails(businessPlace);
    if (businessCountryCode !== '1') { // If we found a specific country code
        countryCode = businessCountryCode;
    }
    
    // Clean and format phone number properly
    let cleanPhone = phoneNumber.replace(/[\s\-\(\)\+]/g, '');
    
    // Add country code if not present
    if (!cleanPhone.startsWith(countryCode) && cleanPhone.startsWith('0')) {
        cleanPhone = countryCode + cleanPhone.substring(1);
    } else if (!cleanPhone.startsWith(countryCode)) {
        cleanPhone = countryCode + cleanPhone;
    }
    
    // Create personalized message using onboarding data
    const message = createPersonalizedMessage(businessName, businessType);

    // Encode message for URL
    const encodedMessage = encodeURIComponent(message);
    
    // Create WhatsApp URL
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
    
    console.log('Using country code:', countryCode);
    console.log('WhatsApp URL:', whatsappUrl);
    
    // Open WhatsApp
    window.open(whatsappUrl, '_blank');
}

function getUserCountryCode() {
    // Get user's country from onboarding data
    if (userOnboardingData.country) {
        return getPhoneCodeFromCountryCode(userOnboardingData.country.toLowerCase());
    }
    return '1'; // Default fallback
}

function createPersonalizedMessage(businessName, businessType) {
    const userName = userOnboardingData.name || 'there';
    const userRole = userOnboardingData.role || 'freelancer';
    
    // Create role-specific introduction
    let roleIntro = '';
    switch(userRole) {
        case 'freelancer':
            roleIntro = 'I\'m a freelance web developer';
            break;
        case 'agency':
            roleIntro = 'I run a web development agency';
            break;
        case 'consultant':
            roleIntro = 'I\'m a digital consultant';
            break;
        case 'developer':
            roleIntro = 'I\'m a web developer';
            break;
        case 'marketer':
            roleIntro = 'I\'m a digital marketing specialist';
            break;
        default:
            roleIntro = 'I help businesses get online';
    }
    
    return `Hi ${businessName}!

My name is ${userName} and ${roleIntro}. I noticed you don't have a website yet.

I help ${businessType.toLowerCase()} businesses get online and attract more customers through professional websites.

Would you be interested in a quick chat about how a website could help grow your business?

Best regards,
${userName}`;
}

window.initMap = initMap;
