// Global variables
let stream = null;
let selectedBackground = '';
let countdownInterval = null;
let currentPhotoIndex = 0;
let capturedPhotos = [];
let selectedTemplate = 'vertical-2';
let photosNeeded = 2;
let activeSticker = null;
let isResizing = false;
let startX, startY, startWidth, startHeight;
let startStickerX, startStickerY;
let selectedFilter = 'normal';
let currentFacingMode = 'user';
let flashOn = false;
let gridOn = false;
let flashElement = null;
let isCountingDown = false;
let currentOverlay = 'none';
let videoDevices = [];
let currentDeviceId = null;

// Template configurations
const templateConfig = {
    'vertical-2': {
        photosNeeded: 2,
        containerClass: 'vertical-2',
        photoClass: 'vertical-photo',
        type: 'vertical'
    },
    'vertical-3': {
        photosNeeded: 3,
        containerClass: 'vertical-3',
        photoClass: 'vertical-photo',
        type: 'vertical'
    },
    'vertical-4': {
        photosNeeded: 4,
        containerClass: 'vertical-4',
        photoClass: 'vertical-photo',
        type: 'vertical'
    },
    'horizontal-2': {
        photosNeeded: 2,
        containerClass: 'horizontal-2',
        photoClass: 'horizontal-photo',
        type: 'horizontal'
    },
    'horizontal-3': {
        photosNeeded: 3,
        containerClass: 'horizontal-3',
        photoClass: 'horizontal-photo',
        type: 'horizontal'
    },
    'horizontal-4': {
        photosNeeded: 4,
        containerClass: 'horizontal-4',
        photoClass: 'horizontal-photo',
        type: 'horizontal'
    }
};

// Overlay configurations
const overlayConfig = {
    'none': {
        name: 'No Overlay',
        url: null
    },
    'overlay/overlay1.png': {
        name: 'Floral Frame',
        url: 'overlay/overlay1.png'
    },
    'overlay/overlay2.png': {
        name: 'Polaroid',
        url: 'overlay/overlay2.png'
    },
    'overlay/overlay3.png': {
        name: 'Vintage',
        url: 'overlay/overlay3.png'
    }
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    flashElement = document.getElementById('flash');
    
    // Setup event listeners
    document.getElementById('customizeBtn').addEventListener('click', goToCustomization);
    
    // Initialize camera selection dropdown
    if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
        getCameraDevices();
    }
});

// Simple screen navigation
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
}

// Tab navigation for template selection
function openTemplateTab(tabId) {
    document.querySelectorAll('#screen3-template .tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('#screen3-template .tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    document.getElementById(tabId).classList.add('active');
    event.currentTarget.classList.add('active');
}

// Tab navigation for customization
function openTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    document.getElementById(tabId).classList.add('active');
    event.currentTarget.classList.add('active');
}

// Select template
function selectTemplate(element, templateType) {
    document.querySelectorAll('.template-option').forEach(option => {
        option.classList.remove('selected');
    });
    element.classList.add('selected');
    selectedTemplate = templateType;
    photosNeeded = templateConfig[templateType].photosNeeded;
    
    // Update the overlay preview in the selected template
    updateTemplateOverlayPreview();
    
    // Update photos count UI if in camera screen
    if (document.getElementById('screen4-camera').classList.contains('active')) {
        updatePhotoCountDisplay();
    }
}

// Select overlay
function selectOverlay(overlayUrl) {
    currentOverlay = overlayUrl;
    
    // Update selected state in UI
    document.querySelectorAll('.overlay-option').forEach(option => {
        option.classList.remove('selected');
    });
    event.currentTarget.classList.add('selected');
    
    // Update the overlay preview in all templates
    updateTemplateOverlayPreview();
}

// Update the overlay preview in template options
function updateTemplateOverlayPreview() {
    const overlayPreviews = document.querySelectorAll('.template-overlay');
    overlayPreviews.forEach(preview => {
        if (currentOverlay === 'none') {
            preview.style.backgroundImage = 'none';
        } else {
            preview.style.backgroundImage = `url('${currentOverlay}')`;
        }
    });
}

// Initialize camera
async function initCamera() {
    try {
        showScreen('screen4-camera');
        document.getElementById('cameraError').style.display = 'none';
        document.getElementById('cameraView').style.display = 'block';

        // Reset photo capture state
        currentPhotoIndex = capturedPhotos.length;
        photosNeeded = templateConfig[selectedTemplate].photosNeeded;

        // Update UI
        updatePhotoCountDisplay();

        // Get camera devices
        await getCameraDevices();
        
        // Start first camera if available
        if (videoDevices.length > 0) {
            const cameraSelect = document.getElementById('cameraSelect');
            if (!currentDeviceId) {
                currentDeviceId = videoDevices[0].deviceId;
                cameraSelect.value = currentDeviceId;
            }
            await startCamera(currentDeviceId);
        } else {
            throw new Error("No cameras found");
        }
    } catch (err) {
        console.error("Error accessing camera:", err);
        document.getElementById('cameraError').textContent =
            "Could not access the camera. Please make sure you've granted camera permissions and that your camera is working properly.";
        document.getElementById('cameraError').style.display = 'block';
        document.getElementById('captureBtn').disabled = true;
    }
}

// Get camera devices
async function getCameraDevices() {
    try {
        // Get camera permission first
        const tempStream = await navigator.mediaDevices.getUserMedia({ video: true });
        tempStream.getTracks().forEach(track => track.stop());
        
        // Enumerate devices
        const devices = await navigator.mediaDevices.enumerateDevices();
        videoDevices = devices.filter(device => device.kind === 'videoinput');
        
        // Update dropdown
        const cameraSelect = document.getElementById('cameraSelect');
        cameraSelect.innerHTML = '<option value="">📹 Select Camera</option>';
        
        videoDevices.forEach((device, index) => {
            const option = document.createElement('option');
            option.value = device.deviceId;
            option.text = device.label || `Camera ${index + 1}`;
            cameraSelect.appendChild(option);
        });
        
        // Event listener for camera change
        cameraSelect.addEventListener('change', async () => {
            if (cameraSelect.value) {
                currentDeviceId = cameraSelect.value;
                await startCamera(currentDeviceId);
            }
        });
        
    } catch (err) {
        console.error("Error enumerating devices:", err);
        throw err;
    }
}

// Start camera with specific deviceId
async function startCamera(deviceId) {
    // Stop current stream
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
    }

    try {
        const constraints = {
            video: {
                deviceId: deviceId ? { exact: deviceId } : undefined,
                width: { ideal: 1280 },
                height: { ideal: 720 },
                facingMode: currentFacingMode
            },
            audio: false
        };

        stream = await navigator.mediaDevices.getUserMedia(constraints);
        const cameraView = document.getElementById('cameraView');
        cameraView.srcObject = stream;
        
        cameraView.onloadedmetadata = () => {
            cameraView.play();
        };
    } catch (err) {
        console.error("Error starting camera:", err);
        // Fallback to constraints without deviceId
        try {
            const constraints = {
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    facingMode: currentFacingMode
                },
                audio: false
            };
            
            stream = await navigator.mediaDevices.getUserMedia(constraints);
            const cameraView = document.getElementById('cameraView');
            cameraView.srcObject = stream;
            cameraView.onloadedmetadata = () => {
                cameraView.play();
            };
        } catch (fallbackErr) {
            throw fallbackErr;
        }
    }
}

// Capture photo from camera
function capturePhoto() {
    if (isCountingDown || capturedPhotos.length >= photosNeeded) return;
    
    isCountingDown = true;
    const captureBtn = document.getElementById('captureBtn');
    captureBtn.disabled = true;

    let seconds = 3;
    const countdownElement = document.getElementById('countdown');
    countdownElement.style.display = 'block';
    countdownElement.textContent = seconds;
    
    // Update countdown every second
    countdownInterval = setInterval(() => {
        seconds--;
        countdownElement.textContent = seconds;
        
        if (seconds <= 0) {
            clearInterval(countdownInterval);
            countdownElement.style.display = 'none';
            isCountingDown = false;
            captureBtn.disabled = false;
            
            // Capture photo
            takePhoto();
        }
    }, 1000);
}

// Function to handle actual photo capture
function takePhoto() {
    if (flashOn) {
        triggerFlash();
    }

    const cameraView = document.getElementById('cameraView');
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    // Set canvas size to match video
    canvas.width = cameraView.videoWidth;
    canvas.height = cameraView.videoHeight;

    // Draw video frame
    context.drawImage(cameraView, 0, 0, canvas.width, canvas.height);

    // Square crop from center
    const size = Math.min(canvas.width, canvas.height);
    const offsetX = (canvas.width - size) / 2;
    const offsetY = (canvas.height - size) / 2;

    // Create cropped canvas
    const croppedCanvas = document.createElement('canvas');
    const croppedContext = croppedCanvas.getContext('2d');
    croppedCanvas.width = size;
    croppedCanvas.height = size;

    croppedContext.drawImage(
        canvas,
        offsetX, offsetY, size, size,
        0, 0, size, size
    );

    // Resize to 600x600
    const finalCanvas = document.createElement('canvas');
    const finalContext = finalCanvas.getContext('2d');
    finalCanvas.width = 600;
    finalCanvas.height = 600;

    finalContext.imageSmoothingQuality = 'high';
    finalContext.drawImage(
        croppedCanvas,
        0, 0, size, size,
        0, 0, 600, 600
    );

    const photoDataUrl = finalCanvas.toDataURL('image/jpeg', 0.95);

    // Add to photos array
    capturedPhotos.push(photoDataUrl);
    
    // Update UI
    updateThumbnails();
    
    // Update customize button
    document.getElementById('customizeBtn').disabled = 
        capturedPhotos.length < photosNeeded;

    // If enough photos, go to customization
    if (capturedPhotos.length >= photosNeeded) {
        setTimeout(() => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
            createFinalStrip();
            showScreen('screen5-preview');
        }, 500);
    }
}

// Trigger flash animation
function triggerFlash() {
    if (!flashElement) return;

    flashElement.classList.remove('flash-animation');
    // Trigger reflow
    void flashElement.offsetWidth;
    flashElement.classList.add('flash-animation');

    // Remove animation class after animation completes
    setTimeout(() => {
        flashElement.classList.remove('flash-animation');
    }, 300);
}

// Switch camera
async function switchCamera() {
    if (videoDevices.length < 2) {
        alert("Only one camera available");
        return;
    }
    
    const currentIndex = videoDevices.findIndex(device => device.deviceId === currentDeviceId);
    const nextIndex = (currentIndex + 1) % videoDevices.length;
    currentDeviceId = videoDevices[nextIndex].deviceId;
    
    // Update dropdown selection
    document.getElementById('cameraSelect').value = currentDeviceId;
    
    await startCamera(currentDeviceId);
}

// Update photo count display
function updatePhotoCountDisplay() {
    document.getElementById('photosCount').textContent = capturedPhotos.length;
    document.getElementById('maxPhotos').textContent = photosNeeded;
    
    // Update customize button state
    const customizeBtn = document.getElementById('customizeBtn');
    customizeBtn.disabled = capturedPhotos.length < photosNeeded;
    
    // Update capture button state
    const captureBtn = document.getElementById('captureBtn');
    captureBtn.disabled = capturedPhotos.length >= photosNeeded;
}

// Update thumbnails in sidebar
function updateThumbnails() {
    const previewSidebar = document.getElementById('previewSidebar');
    previewSidebar.innerHTML = '';

    capturedPhotos.forEach((photo, index) => {
        const thumbnailWrapper = document.createElement('div');
        thumbnailWrapper.className = 'thumbnail-wrapper';
        thumbnailWrapper.style.position = 'relative';
        
        const thumbnail = document.createElement('img');
        thumbnail.src = photo;
        thumbnail.className = 'preview-thumbnail';
        thumbnail.style.cursor = 'pointer';
        thumbnail.style.width = '100%';
        thumbnail.style.height = '100%';
        thumbnail.style.objectFit = 'cover';
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'remove-thumbnail';
        deleteBtn.innerHTML = '×';
        deleteBtn.style.position = 'absolute';
        deleteBtn.style.top = '5px';
        deleteBtn.style.right = '5px';
        deleteBtn.style.background = 'rgba(255, 107, 107, 0.9)';
        deleteBtn.style.color = 'white';
        deleteBtn.style.border = 'none';
        deleteBtn.style.borderRadius = '50%';
        deleteBtn.style.width = '25px';
        deleteBtn.style.height = '25px';
        deleteBtn.style.cursor = 'pointer';
        deleteBtn.style.display = 'none';
        deleteBtn.style.alignItems = 'center';
        deleteBtn.style.justifyContent = 'center';
        deleteBtn.style.fontSize = '16px';
        deleteBtn.style.fontWeight = 'bold';
        deleteBtn.onclick = (e) => {
            e.stopPropagation();
            deletePhoto(index);
        };
        
        // Show delete button on hover
        thumbnailWrapper.addEventListener('mouseenter', () => {
            deleteBtn.style.display = 'flex';
        });
        
        thumbnailWrapper.addEventListener('mouseleave', () => {
            deleteBtn.style.display = 'none';
        });
        
        thumbnailWrapper.appendChild(thumbnail);
        thumbnailWrapper.appendChild(deleteBtn);
        previewSidebar.appendChild(thumbnailWrapper);
    });
    
    // Update photo count display
    updatePhotoCountDisplay();
}

// Delete specific photo
function deletePhoto(index) {
    if (confirm("Delete this photo?")) {
        capturedPhotos.splice(index, 1);
        updateThumbnails();
    }
}

// Create the final photo strip
function createFinalStrip() {
    const stripTemplate = document.getElementById('stripTemplate');
    stripTemplate.innerHTML = '';

    // Set template class
    const config = templateConfig[selectedTemplate];
    stripTemplate.className = `strip-template ${config.containerClass}`;

    // Adjust container size based on template type
    const container = document.getElementById('capture-container');
    const previewContainer = document.querySelector('.strip-preview');
    
    if (config.type === 'horizontal') {
        container.style.width = 'auto';
        container.style.minWidth = '400px';
        container.style.padding = '2rem 1.5rem';
        previewContainer.style.width = 'auto';
        previewContainer.style.minWidth = '400px';
        previewContainer.style.padding = '2rem 1.5rem';
    } else {
        container.style.width = '220px';
        container.style.minWidth = '';
        container.style.padding = '2rem';
        previewContainer.style.width = '220px';
        previewContainer.style.minWidth = '';
        previewContainer.style.padding = '2rem';
    }

    // Create photo elements
    for (let i = 0; i < Math.min(capturedPhotos.length, config.photosNeeded); i++) {
        const photoDiv = document.createElement('div');
        photoDiv.className = `strip-photo ${config.photoClass}`;

        const img = document.createElement('img');
        img.src = capturedPhotos[i];
        img.className = `filter-${selectedFilter}`;
        img.style.objectFit = 'cover';
        img.style.width = '100%';
        img.style.height = '100%';

        photoDiv.appendChild(img);
        stripTemplate.appendChild(photoDiv);
    }

    // Apply background
    if (selectedBackground.includes('gradient')) {
        container.style.background = selectedBackground;
    } else if (selectedBackground.startsWith('url')) {
        container.style.backgroundImage = selectedBackground;
        container.style.backgroundSize = 'cover';
        container.style.backgroundPosition = 'center';
        container.style.backgroundRepeat = 'no-repeat';
    } else if (selectedBackground) {
        container.style.backgroundColor = selectedBackground;
    } else {
        container.style.background = 'white';
    }

    // Apply overlay
    if (currentOverlay && currentOverlay !== 'none') {
        applyOverlay(currentOverlay);
    }
}

// Apply filter to all photos
function applyFilter(filterName) {
    selectedFilter = filterName;

    // Update selected state in UI
    document.querySelectorAll('.filter-option').forEach(option => {
        option.classList.remove('selected');
    });
    event.currentTarget.classList.add('selected');

    // Apply filter to all photos
    const allPhotos = document.querySelectorAll('.strip-photo img');
    allPhotos.forEach(img => {
        img.className = '';
        img.classList.add(`filter-${filterName}`);
    });
}

// Select background
function selectBackground(element, backgroundValue) {
    // Update selected state in UI
    document.querySelectorAll('.background-option').forEach(option => {
        option.classList.remove('selected');
    });
    element.classList.add('selected');

    // Set the background on the container
    const container = document.getElementById('capture-container');

    // Reset all background properties first
    container.style.backgroundImage = 'none';
    container.style.background = '';
    container.style.backgroundColor = '';

    // Check if it's a gradient or image
    if (backgroundValue.includes('gradient')) {
        container.style.background = backgroundValue;
    }
    else if (backgroundValue.startsWith('url')) {
        container.style.backgroundImage = backgroundValue;
        container.style.backgroundSize = 'cover';
        container.style.backgroundPosition = 'center';
        container.style.backgroundRepeat = 'no-repeat';
    }
    else {
        // Solid color
        container.style.backgroundColor = backgroundValue;
    }

    // Store the selected background
    selectedBackground = backgroundValue;
}

// Function to handle background upload
function uploadBackground(input) {
    const file = input.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.match('image.*')) {
        alert('Please select an image file (JPEG, PNG, etc.)');
        return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
        alert('File is too large. Maximum size is 5MB.');
        return;
    }

    const reader = new FileReader();
    reader.onload = function (e) {
        // Create a new background option with the uploaded image
        const bgUrl = `url('${e.target.result}')`;
        selectBackground(input.closest('.background-option'), bgUrl);

        // Update the selected state
        document.querySelectorAll('.background-option').forEach(option => {
            option.classList.remove('selected');
        });
        input.closest('.background-option').classList.add('selected');
    };
    reader.onerror = function () {
        alert('Error reading file. Please try again.');
    };
    reader.readAsDataURL(file);
}

// Add sticker to photo strip
function addSticker(stickerUrl) {
    const stripTemplate = document.getElementById('stripTemplate');
    const sticker = document.createElement('div');
    sticker.className = 'sticker';
    sticker.innerHTML = `
        <img src="${stickerUrl}" alt="Sticker" style="width:100%;height:100%;object-fit:contain;">
        <div class="sticker-controls">
            <div class="sticker-delete">×</div>
        </div>
        <div class="sticker-resize"></div>
    `;

    // Position sticker randomly within the container
    const containerRect = stripTemplate.getBoundingClientRect();
    const stickerSize = 80 + Math.random() * 40;

    sticker.style.width = `${stickerSize}px`;
    sticker.style.height = `${stickerSize}px`;
    sticker.style.position = 'absolute';
    sticker.style.left = `${Math.random() * (containerRect.width - stickerSize)}px`;
    sticker.style.top = `${Math.random() * (containerRect.height - stickerSize)}px`;
    sticker.style.zIndex = '10';
    sticker.style.cursor = 'move';

    stripTemplate.appendChild(sticker);

    // Add event listeners for the new sticker
    setupStickerInteractions(sticker);
}

// Setup sticker interactions (drag and resize)
function setupStickerInteractions(sticker) {
    const deleteBtn = sticker.querySelector('.sticker-delete');
    const resizeHandle = sticker.querySelector('.sticker-resize');

    // Delete sticker
    deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        sticker.remove();
    });

    // Drag sticker
    sticker.addEventListener('mousedown', (e) => {
        if (e.target === resizeHandle) return;

        activeSticker = sticker;
        const rect = sticker.getBoundingClientRect();
        startStickerX = e.clientX - rect.left;
        startStickerY = e.clientY - rect.top;

        document.addEventListener('mousemove', moveSticker);
        document.addEventListener('mouseup', stopStickerInteraction);
    });

    // Resize sticker
    resizeHandle.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        isResizing = true;
        activeSticker = sticker;
        const rect = sticker.getBoundingClientRect();
        startX = e.clientX;
        startY = e.clientY;
        startWidth = rect.width;
        startHeight = rect.height;

        document.addEventListener('mousemove', resizeSticker);
        document.addEventListener('mouseup', stopStickerInteraction);
    });
}

// Move sticker
function moveSticker(e) {
    if (!activeSticker) return;

    const container = document.getElementById('stripTemplate');
    const containerRect = container.getBoundingClientRect();
    const stickerRect = activeSticker.getBoundingClientRect();

    let newLeft = e.clientX - containerRect.left - startStickerX;
    let newTop = e.clientY - containerRect.top - startStickerY;

    // Constrain to container bounds
    newLeft = Math.max(0, Math.min(newLeft, containerRect.width - stickerRect.width));
    newTop = Math.max(0, Math.min(newTop, containerRect.height - stickerRect.height));

    activeSticker.style.left = `${newLeft}px`;
    activeSticker.style.top = `${newTop}px`;
}

// Resize sticker
function resizeSticker(e) {
    if (!activeSticker || !isResizing) return;

    const width = startWidth + (e.clientX - startX);
    const height = startHeight + (e.clientY - startY);

    // Minimum size constraint
    if (width > 50 && height > 50) {
        activeSticker.style.width = `${width}px`;
        activeSticker.style.height = `${height}px`;
    }
}

// Stop sticker interaction
function stopStickerInteraction() {
    activeSticker = null;
    isResizing = false;
    document.removeEventListener('mousemove', moveSticker);
    document.removeEventListener('mousemove', resizeSticker);
    document.removeEventListener('mouseup', stopStickerInteraction);
}

// Apply overlay template
function applyOverlay(overlayUrl) {
    // Remove existing overlay if any
    const existingOverlay = document.querySelector('.overlay-template');
    if (existingOverlay) {
        existingOverlay.remove();
    }

    // If 'none' is selected, just return
    if (overlayUrl === 'none') {
        currentOverlay = null;
        return;
    }

    // Create new overlay element
    const overlay = document.createElement('div');
    overlay.className = 'overlay-template';
    overlay.style.backgroundImage = `url('${overlayUrl}')`;
    overlay.style.position = 'absolute';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.backgroundSize = 'cover';
    overlay.style.backgroundPosition = 'center';
    overlay.style.pointerEvents = 'none';
    overlay.style.zIndex = '5';

    // Add to the capture container
    const stripTemplate = document.getElementById('stripTemplate');
    stripTemplate.parentNode.insertBefore(overlay, stripTemplate.nextSibling);

    // Update current overlay
    currentOverlay = overlayUrl;
}

// Handle overlay upload
function uploadOverlay(input) {
    const file = input.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.match('image.*')) {
        alert('Please select an image file (JPEG, PNG, etc.)');
        return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
        alert('File is too large. Maximum size is 5MB.');
        return;
    }

    const reader = new FileReader();
    reader.onload = function (e) {
        selectOverlay(e.target.result);

        // Update the selected state
        document.querySelectorAll('.overlay-option').forEach(option => {
            option.classList.remove('selected');
        });
        input.closest('.overlay-option').classList.add('selected');
    };
    reader.onerror = function () {
        alert('Error reading file. Please try again.');
    };
    reader.readAsDataURL(file);
}

// Go to customization screen
function goToCustomization() {
    if (capturedPhotos.length >= photosNeeded) {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
        createFinalStrip();
        showScreen('screen5-preview');
    }
}

// Download photo with html2canvas
async function downloadWithHtml2Canvas() {
    const element = document.getElementById("capture-container");
    const spinner = document.getElementById('downloadSpinner');
    const errorMsg = document.getElementById('downloadError');
    const downloadBtn = document.getElementById('downloadBtn');

    // Show loading spinner
    spinner.style.display = 'block';
    errorMsg.style.display = 'none';
    downloadBtn.disabled = true;

    try {
        // Hide sticker controls during download
        const elementsToHide = document.querySelectorAll('.sticker-controls, .sticker-resize');
        const originalDisplay = [];
        elementsToHide.forEach(el => {
            originalDisplay.push(el.style.display);
            el.style.display = 'none';
        });

        // Process images with filters
        const photoImages = document.querySelectorAll('.strip-photo img');
        const processedData = [];

        for (const img of photoImages) {
            const filterClass = img.className.replace('filter-', '');
            if (filterClass && filterClass !== 'normal') {
                const canvas = await applyFilterToCanvas(img, filterClass);
                processedData.push({
                    imgElement: img,
                    originalSrc: img.src,
                    tempSrc: canvas.toDataURL('image/png', 1.0)
                });
                img.src = canvas.toDataURL('image/png', 1.0);
                img.className = ''; // Remove filter class temporarily
            }
        }

        // Wait for images to load
        await new Promise(resolve => {
            let loadedCount = 0;
            const totalImages = photoImages.length;
            if (totalImages === 0) return resolve();

            photoImages.forEach(img => {
                img.onload = () => {
                    loadedCount++;
                    if (loadedCount === totalImages) resolve();
                };
                // Trigger reload if already cached
                if (img.complete) img.src = img.src;
            });
        });

        // Create a temporary container with higher resolution
        const tempContainer = document.createElement('div');
        tempContainer.style.position = 'absolute';
        tempContainer.style.left = '-9999px';
        tempContainer.style.width = element.offsetWidth + 'px';
        tempContainer.style.height = element.offsetHeight + 'px';
        tempContainer.style.transform = 'scale(2)';
        tempContainer.style.transformOrigin = 'top left';

        // Clone the original element
        const clone = element.cloneNode(true);
        tempContainer.appendChild(clone);
        document.body.appendChild(tempContainer);

        // Use html2canvas with optimized settings
        const canvas = await html2canvas(clone, {
            scale: 2,
            logging: false,
            useCORS: true,
            allowTaint: true,
            backgroundColor: null,
            quality: 1,
            letterRendering: true
        });

        // Remove temporary container
        document.body.removeChild(tempContainer);

        // Restore original images
        processedData.forEach(data => {
            data.imgElement.src = data.originalSrc;
            data.imgElement.className = `filter-${selectedFilter}`;
        });

        // Restore hidden elements
        elementsToHide.forEach((el, i) => {
            el.style.display = originalDisplay[i];
        });

        // Create download link
        const link = document.createElement('a');
        link.download = 'rey-studio-photo-strip.png';
        link.href = canvas.toDataURL('image/png', 1.0);
        link.click();

    } catch (err) {
        console.error("Error generating image:", err);
        errorMsg.textContent = "Failed to generate image. Please try again.";
        errorMsg.style.display = 'block';
    } finally {
        spinner.style.display = 'none';
        downloadBtn.disabled = false;
    }
}

async function applyFilterToCanvas(imgElement, filterClass) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    // Set canvas to original image size for best quality
    canvas.width = imgElement.naturalWidth || imgElement.width;
    canvas.height = imgElement.naturalHeight || imgElement.height;

    // Draw original image
    ctx.drawImage(imgElement, 0, 0, canvas.width, canvas.height);

    // Apply CSS filter if available
    if (CSS.supports('filter', 'contrast(1.1)')) {
        ctx.filter = getComputedStyle(imgElement).filter;
        ctx.drawImage(imgElement, 0, 0, canvas.width, canvas.height);
        ctx.filter = 'none';
    } else {
        // Fallback to manual filter application
        applyManualFilter(ctx, canvas, filterClass);
    }

    return canvas;
}

function applyManualFilter(ctx, canvas, filterClass) {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Helper function to preserve brightness
    function adjustWithBrightness(r, g, b, adjustment) {
        const brightness = (r + g + b) / 3;
        return [
            brightness + (r - brightness) * adjustment,
            brightness + (g - brightness) * adjustment,
            brightness + (b - brightness) * adjustment
        ];
    }

    // Apply filter based on class
    switch (filterClass) {
        case 'clarendon':
            for (let i = 0; i < data.length; i += 4) {
                const [r, g, b] = adjustWithBrightness(
                    data[i], data[i + 1], data[i + 2], 1.4
                );
                data[i] = r;
                data[i + 1] = g;
                data[i + 2] = b;
            }
            break;

        case 'gingham':
            for (let i = 0; i < data.length; i += 4) {
                const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
                data[i] = brightness + (data[i] - brightness) * 0.9;
                data[i + 1] = brightness + (data[i + 1] - brightness) * 0.9;
                data[i + 2] = brightness + (data[i + 2] - brightness) * 0.9;

                const r = data[i], g = data[i + 1], b = data[i + 2];
                data[i] = r * 0.9 + g * 0.9 + b * 0.8;
                data[i + 1] = r * 0.9 + g * 1.1 + b * 0.8;
                data[i + 2] = r * 0.8 + g * 0.8 + b * 1.1;
            }
            break;

        case 'moon':
            for (let i = 0; i < data.length; i += 4) {
                const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
                const val = avg < 128 ? avg * 0.7 : 128 + (avg - 128) * 1.5;
                data[i] = data[i + 1] = data[i + 2] = val;
            }
            break;

        case 'lark':
            for (let i = 0; i < data.length; i += 4) {
                const [r, g, b] = adjustWithBrightness(
                    data[i], data[i + 1], data[i + 2], 1.2
                );
                data[i] = Math.min(255, r * 1.1);
                data[i + 1] = Math.min(255, g * 1.1);
                data[i + 2] = Math.min(255, b * 1.1);
            }
            break;

        case 'reyes':
            for (let i = 0; i < data.length; i += 4) {
                const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
                data[i] = brightness + (data[i] - brightness) * 0.85;
                data[i + 1] = brightness + (data[i + 1] - brightness) * 0.85;
                data[i + 2] = brightness + (data[i + 2] - brightness) * 0.85;

                const r = data[i], g = data[i + 1], b = data[i + 2];
                data[i] = r * 0.9 + g * 0.8 + b * 0.7;
                data[i + 1] = r * 0.8 + g * 0.9 + b * 0.7;
                data[i + 2] = r * 0.7 + g * 0.7 + b * 0.9;
            }
            break;

        default:
            // No changes for normal filter
            break;
    }

    ctx.putImageData(imageData, 0, 0);
}

// Apply frame to photos
function applyFrame(frameType) {
    const stripPhotos = document.querySelectorAll('.strip-photo');
    
    // Reset all frames
    stripPhotos.forEach(photo => {
        photo.className = photo.className.replace(/frame-\w+/g, '');
        photo.style.border = 'none';
        photo.style.borderRadius = '4px';
        photo.style.padding = '0';
        photo.style.background = 'transparent';
        photo.style.boxShadow = 'none';
    });
    
    // Apply new frame
    if (frameType !== 'none') {
        stripPhotos.forEach(photo => {
            photo.classList.add(`frame-${frameType}`);
            
            switch (frameType) {
                case 'polaroid':
                    photo.style.border = '15px solid white';
                    photo.style.borderBottom = '40px solid white';
                    photo.style.boxShadow = '0 5px 15px rgba(0,0,0,0.1)';
                    photo.style.background = 'white';
                    break;

                case 'vintage':
                    photo.style.border = '8px solid #d4c9a8';
                    photo.style.boxShadow = 'inset 0 0 10px rgba(0,0,0,0.1), 0 0 10px rgba(0,0,0,0.2)';
                    photo.style.background = '#f0e8d0';
                    break;

                case 'instax':
                    photo.style.border = '10px solid #f0f0f0';
                    photo.style.borderBottom = '25px solid #f0f0f0';
                    photo.style.background = '#f8f8f8';
                    photo.style.boxShadow = '0 3px 10px rgba(0,0,0,0.1)';
                    break;

                case 'wood':
                    photo.style.border = '12px solid transparent';
                    photo.style.padding = '5px';
                    photo.style.background = 'linear-gradient(45deg, #8B4513, #A0522D) border-box';
                    photo.style.boxShadow = '0 5px 15px rgba(0,0,0,0.2)';
                    break;

                case 'gold':
                    photo.style.border = '10px solid transparent';
                    photo.style.padding = '4px';
                    photo.style.background = 'linear-gradient(135deg, #FFD700, #D4AF37) border-box';
                    photo.style.boxShadow = '0 5px 20px rgba(0,0,0,0.3)';
                    break;
            }
        });
    }
}

// Toggle flash
function toggleFlash() {
    flashOn = !flashOn;
    const flashBtn = document.getElementById('flashBtn');
    flashBtn.innerHTML = `<span class="control-icon">⚡</span><span>Flash: ${flashOn ? 'On' : 'Off'}</span>`;
}

// Toggle grid
function toggleGrid() {
    gridOn = !gridOn;
    const gridBtn = document.getElementById('gridBtn');
    gridBtn.innerHTML = `<span class="control-icon">⏹️</span><span>Grid: ${gridOn ? 'On' : 'Off'}</span>`;
    document.getElementById('cameraGrid').style.display = gridOn ? 'block' : 'none';
}

// Return to camera screen
function returnToCamera() {
    // Stop camera if running
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
    }
    
    // Show camera screen
    showScreen('screen4-camera');
    
    // Restart camera
    setTimeout(() => {
        initCamera();
    }, 100);
}

// Retake last photo
function retakeLastPhoto() {
    if (capturedPhotos.length === 0) return;

    // Remove last photo
    capturedPhotos.pop();
    
    // Update UI
    updateThumbnails();
    
    // Stop countdown if running
    if (countdownInterval) {
        clearInterval(countdownInterval);
        document.getElementById('countdown').style.display = 'none';
        isCountingDown = false;
        document.getElementById('captureBtn').disabled = false;
    }
}

// Retake all photos
function retakeAllPhotos() {
    if (!confirm("Are you sure you want to retake all photos? All current photos will be deleted.")) {
        return;
    }

    // Stop camera if running
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
    }

    // Stop countdown if running
    if (countdownInterval) {
        clearInterval(countdownInterval);
    }

    // Reset all photo states
    capturedPhotos = [];
    
    // Clear preview sidebar
    document.getElementById('previewSidebar').innerHTML = '';
    
    // Update UI
    updatePhotoCountDisplay();
    
    // Hide countdown
    document.getElementById('countdown').style.display = 'none';
    isCountingDown = false;
    document.getElementById('captureBtn').disabled = false;
    
    // Restart camera
    initCamera();
}

// Change logo
function changeLogo(logoUrl) {
    const logoElement = document.getElementById('footerLogo');
    if (logoElement) {
        logoElement.src = logoUrl;
    }

    // Update selected state
    document.querySelectorAll('.logo-option').forEach(option => {
        option.classList.remove('selected');
    });
    event.currentTarget.classList.add('selected');
}

// Upload logo
function uploadLogo(input) {
    const file = input.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.match('image.*')) {
        alert('Please select an image file (JPEG, PNG, etc.)');
        return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
        alert('File is too large. Maximum size is 5MB.');
        return;
    }

    const reader = new FileReader();
    reader.onload = function (e) {
        changeLogo(e.target.result);

        // Update the selected state
        document.querySelectorAll('.logo-option').forEach(option => {
            option.classList.remove('selected');
        });
        input.closest('.logo-option').classList.add('selected');
    };
    reader.onerror = function () {
        alert('Error reading file. Please try again.');
    };
    reader.readAsDataURL(file);
}

// Device change listener
navigator.mediaDevices.addEventListener('devicechange', async () => {
    await getCameraDevices();
});

// Clean up when leaving the page
window.addEventListener('beforeunload', () => {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
    }
    if (countdownInterval) {
        clearInterval(countdownInterval);
    }
});