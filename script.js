// Global variables
let stream = null;
let selectedBackground = '';
let countdownInterval = null;
let currentPhotoIndex = 0;
let capturedPhotos = [];
let selectedTemplate = 'vertical-4';
let photosNeeded = 4;
let selectedFilter = 'normal';
let currentFacingMode = 'user';
let flashOn = false;
let gridOn = false;
let mirrorOn = false;
let flashElement = null;
let isCountingDown = false;
let currentOverlay = 'none';
let videoDevices = [];
let currentDeviceId = null;

// Template configurations
const templateConfig = {
    'vertical-4': {
        photosNeeded: 4,
        containerClass: 'vertical-4',
        photoClass: 'vertical-photo'
    },
    'vertical-6': {
        photosNeeded: 6,
        containerClass: 'vertical-6',
        photoClass: 'vertical-photo',
        isGrid: true,
        columns: 2
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

// Sticker system variables
let activeSticker = null;
let isDragging = false;
let isResizing = false;
let startX = 0;
let startY = 0;
let startStickerX = 0;
let startStickerY = 0;
let startStickerLeft = 0;
let startStickerTop = 0;
let startWidth = 0;
let startHeight = 0;

// Initialize flash element reference
document.addEventListener('DOMContentLoaded', () => {
    flashElement = document.getElementById('flash');
    initStickerSystem();
});

// Simple screen navigation
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
}

// Tab navigation for template selection
function openTemplateTab(element, tabId) {
    const tabNav = document.querySelector('#screen3-template .tab-nav');
    const tabButtons = tabNav.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('#screen3-template .tab-content');

    tabContents.forEach(tab => tab.classList.remove('active'));
    tabButtons.forEach(btn => btn.classList.remove('active'));

    const targetTab = document.getElementById(tabId);
    if (targetTab) targetTab.classList.add('active');

    if (element) {
        element.classList.add('active');
    }
}

// Tab navigation for customization
function openTab(element, tabId) {
    const tabNav = document.querySelector('#screen5-preview .tab-nav');
    const tabButtons = tabNav.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('#screen5-preview .tab-content');

    tabContents.forEach(tab => tab.classList.remove('active'));
    tabButtons.forEach(btn => btn.classList.remove('active'));

    const targetTab = document.getElementById(tabId);
    if (targetTab) targetTab.classList.add('active');

    if (element) {
        element.classList.add('active');
    }
}

// Select template
function selectTemplate(element, templateType) {
    const templateOption = element.closest('.template-option');
    if (!templateOption) return;

    document.querySelectorAll('.template-option').forEach(option => {
        option.classList.remove('selected');
    });

    templateOption.classList.add('selected');
    selectedTemplate = templateType;
    photosNeeded = templateConfig[templateType].photosNeeded;
    
    // Update max photos display
    document.getElementById('maxPhotos').textContent = photosNeeded;
    
    // Update the overlay preview in the selected template
    updateTemplateOverlayPreview();
}

// Select overlay
function selectOverlay(element, overlayUrl) {
    currentOverlay = overlayUrl;
    
    const overlayOption = element.closest('.overlay-option');
    if (!overlayOption) return;

    // Update selected state in UI
    document.querySelectorAll('.overlay-option').forEach(option => {
        option.classList.remove('selected');
    });
    overlayOption.classList.add('selected');
    
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
        currentPhotoIndex = 0;
        capturedPhotos = [];

        // Update max photos display based on selected template
        const maxPhotosElement = document.getElementById('maxPhotos');
        maxPhotosElement.textContent = photosNeeded;

        // Reset photo count
        document.getElementById('photosCount').textContent = '0';
        
        // Disable customize button initially
        document.getElementById('customizeBtn').disabled = true;

        // Clear preview sidebar
        document.getElementById('previewSidebar').innerHTML = '';

        // Get list of camera devices
        await getCameraDevices();
        
        // Jika ada kamera yang terdeteksi, gunakan kamera pertama sebagai default
        if (videoDevices.length > 0) {
            currentDeviceId = videoDevices[0].deviceId;
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

// Get list of available camera devices
async function getCameraDevices() {
    try {
        // Ensure camera permission is granted
        await navigator.mediaDevices.getUserMedia({ video: true });

        // Enumerate devices
        const devices = await navigator.mediaDevices.enumerateDevices();
        videoDevices = devices.filter(device => device.kind === 'videoinput');

        // Update camera selection dropdown
        const cameraSelect = document.getElementById('cameraSelect');
        cameraSelect.innerHTML = '<option value="">Select Camera</option>';

        videoDevices.forEach(device => {
            const option = document.createElement('option');
            option.value = device.deviceId;
            option.text = device.label || `Camera ${cameraSelect.length}`;
            cameraSelect.appendChild(option);
        });

        // Add event listener for camera change
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

// Mulai kamera dengan deviceId tertentu
async function startCamera(deviceId) {
    // Hentikan stream yang sedang berjalan
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
    }

    try {
        const constraints = {
            video: {
                deviceId: { exact: deviceId },
                width: { ideal: 1920 },
                height: { ideal: 1080 },
                frameRate: { ideal: 60 }
            },
            audio: false
        };

        stream = await navigator.mediaDevices.getUserMedia(constraints);
        const cameraView = document.getElementById('cameraView');
        cameraView.srcObject = stream;
        
        // Setel ukuran video sesuai dengan aspect ratio
        cameraView.onloadedmetadata = () => {
            cameraView.style.width = '100%';
            cameraView.style.height = 'auto';
        };
    } catch (err) {
        console.error("Error starting camera:", err);
        throw err;
    }
}

// Capture photo from camera
function capturePhoto() {
    if (isCountingDown) return; // Prevent multiple countdowns
    
    // Check if we have reached maximum photos
    if (capturedPhotos.length >= photosNeeded) {
        alert(`Maximum ${photosNeeded} photos allowed for this template.`);
        return;
    }

    isCountingDown = true;
    const captureBtn = document.getElementById('captureBtn');
    captureBtn.disabled = true;

    let seconds = 3;
    const countdownElement = document.getElementById('countdown');
    countdownElement.style.display = 'block';
    countdownElement.textContent = `${seconds}`;

    const countdownInterval = setInterval(() => {
        seconds--;
        countdownElement.textContent = `${seconds}`;

        if (seconds <= 0) {
            clearInterval(countdownInterval);
            countdownElement.style.display = 'none';
            isCountingDown = false;
            captureBtn.disabled = false;

            // Actually capture the photo
            takePhoto();
        }
    }, 1000);
}

// New function to handle the actual photo capture
function takePhoto() {
    if (flashOn) {
        triggerFlash();
    }

    const cameraView = document.getElementById('cameraView');
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    // Set canvas size to match the camera aspect ratio but larger for better quality
    const videoWidth = cameraView.videoWidth;
    const videoHeight = cameraView.videoHeight;
    canvas.width = videoWidth;
    canvas.height = videoHeight;

    // Draw the full video frame
    context.drawImage(cameraView, 0, 0, canvas.width, canvas.height);

    // Apply mirror effect to captured photo if mirror is enabled
    if (mirrorOn) {
        context.save();
        context.scale(-1, 1);
        context.drawImage(canvas, -canvas.width, 0);
        context.restore();
    }

    // Create a 3:4 portrait rectangle crop from the center
    const targetRatio = 3/4;
    let targetWidth, targetHeight;

    if (videoWidth / videoHeight > targetRatio) {
        // Video is wider than 3:4
        targetHeight = videoHeight;
        targetWidth = targetHeight * targetRatio;
    } else {
        // Video is taller than 3:4
        targetWidth = videoWidth;
        targetHeight = targetWidth / targetRatio;
    }

    const offsetX = (videoWidth - targetWidth) / 2;
    const offsetY = (videoHeight - targetHeight) / 2;

    // Create a new canvas for the cropped image
    const croppedCanvas = document.createElement('canvas');
    const croppedContext = croppedCanvas.getContext('2d');
    croppedCanvas.width = targetWidth;
    croppedCanvas.height = targetHeight;

    // Draw the cropped portion
    croppedContext.drawImage(
        canvas,
        offsetX, offsetY, targetWidth, targetHeight, // source rectangle
        0, 0, targetWidth, targetHeight              // destination rectangle
    );

    // Resize to final output size (600x800 for high quality portrait)
    const finalCanvas = document.createElement('canvas');
    const finalContext = finalCanvas.getContext('2d');
    finalCanvas.width = 600;
    finalCanvas.height = 800;

    // Use high-quality image scaling
    finalContext.imageSmoothingQuality = 'high';
    finalContext.drawImage(
        croppedCanvas,
        0, 0, targetWidth, targetHeight,
        0, 0, 600, 800
    );

    const photoDataUrl = finalCanvas.toDataURL('image/png', 1.0); // Highest quality

    // Add photo to array
    capturedPhotos.push(photoDataUrl);
    updateThumbnails();

    // Stop camera and go to preview if we have enough photos
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

// Switch camera using device selection
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

function updateThumbnails() {
    const previewSidebar = document.getElementById('previewSidebar');
    previewSidebar.innerHTML = '';

    capturedPhotos.forEach((photo, index) => {
        const thumbnail = document.createElement('img');
        thumbnail.src = photo;
        thumbnail.className = 'preview-thumbnail';
        thumbnail.title = `Photo ${index + 1}`;
        thumbnail.onclick = () => confirmDeletePhoto(index);
        previewSidebar.appendChild(thumbnail);
    });

    // Update photo count
    document.getElementById('photosCount').textContent = capturedPhotos.length;
    
    // Enable/disable customize button
    const customizeBtn = document.getElementById('customizeBtn');
    customizeBtn.disabled = capturedPhotos.length < photosNeeded;
}

// Create the final photo strip
function createFinalStrip() {
    const stripTemplate = document.getElementById('stripTemplate');

    // Preserve existing stickers
    const existingStickers = Array.from(stripTemplate.querySelectorAll('.sticker'));

    stripTemplate.innerHTML = '';

    // Set template class
    const config = templateConfig[selectedTemplate];
    stripTemplate.className = 'strip-template ' + config.containerClass;

    // Create photo elements
    for (let i = 0; i < capturedPhotos.length; i++) {
        const photoDiv = document.createElement('div');
        photoDiv.className = 'strip-photo ' + config.photoClass;

        const img = document.createElement('img');
        img.src = capturedPhotos[i];
        img.className = `filter-${selectedFilter}`;

        // Ensure image fills the container properly
        img.style.objectFit = 'cover';
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.borderRadius = '4px';

        photoDiv.appendChild(img);
        stripTemplate.appendChild(photoDiv);
    }

    // Re-add preserved stickers
    existingStickers.forEach(sticker => {
        stripTemplate.appendChild(sticker);
    });

    // Update the background
    document.getElementById('capture-container').style.background = selectedBackground;

    // Apply current overlay if exists
    if (currentOverlay && currentOverlay !== 'none') {
        applyOverlay(currentOverlay);
    }
}

// Apply filter to all photos
function applyFilter(element, filterName) {
    selectedFilter = filterName;

    const filterOption = element.closest('.filter-option');
    if (!filterOption) return;

    // Update selected state in UI
    document.querySelectorAll('.filter-option').forEach(option => {
        option.classList.remove('selected');
    });
    filterOption.classList.add('selected');

    // Apply filter to all photos
    const allPhotos = document.querySelectorAll('.strip-photo img');
    allPhotos.forEach(img => {
        img.className = '';
        img.classList.add(`filter-${filterName}`);
    });
}

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

// Sticker Management System
function initStickerSystem() {
    // Add category switching functionality
    const categories = document.querySelectorAll('.sticker-category');
    categories.forEach(category => {
        category.addEventListener('click', function() {
            switchStickerCategory(this.dataset.category);
        });
    });
}

function switchStickerCategory(category) {
    // Update active category button
    document.querySelectorAll('.sticker-category').forEach(cat => {
        cat.classList.remove('active');
    });
    document.querySelector(`[data-category="${category}"]`).classList.add('active');

    // Show corresponding content
    document.querySelectorAll('.sticker-category-content').forEach(content => {
        content.classList.remove('active');
    });
    document.querySelector(`.sticker-category-content[data-category="${category}"]`).classList.add('active');
}

// Add emoji sticker to photo strip
function addEmojiSticker(emoji) {
    const stripTemplate = document.getElementById('stripTemplate');
    const sticker = createStickerElement(emoji, 'emoji');
    stripTemplate.appendChild(sticker);
    setupStickerInteractions(sticker);
}

// Add image sticker to photo strip
function addImageSticker(imageUrl) {
    const stripTemplate = document.getElementById('stripTemplate');
    const sticker = createStickerElement(imageUrl, 'image');
    stripTemplate.appendChild(sticker);
    setupStickerInteractions(sticker);
}

// Create sticker element
function createStickerElement(content, type) {
    const sticker = document.createElement('div');
    sticker.className = 'sticker sticker-' + type;

    // Create content based on type
    if (type === 'emoji') {
        sticker.innerHTML = `
            <div class="sticker-content">${content}</div>
            <div class="sticker-controls">
                <button class="sticker-delete" title="Delete sticker">×</button>
            </div>
            <div class="sticker-resize-handle" title="Resize sticker"></div>
        `;
    } else {
        sticker.innerHTML = `
            <div class="sticker-content">
                <img src="${content}" alt="Sticker" crossorigin="anonymous" onerror="this.style.display='none'; this.parentElement.innerHTML='${getFallbackEmoji(content)}'">
            </div>
            <div class="sticker-controls">
                <button class="sticker-delete" title="Delete sticker">×</button>
            </div>
            <div class="sticker-resize-handle" title="Resize sticker"></div>
        `;
    }

    // Position sticker randomly within the container
    const containerRect = document.getElementById('stripTemplate').getBoundingClientRect();
    const baseSize = type === 'emoji' ? 60 : 80;
    const randomSize = baseSize + Math.random() * 40;

    sticker.style.width = `${randomSize}px`;
    sticker.style.height = type === 'emoji' ? `${randomSize}px` : 'auto';
    sticker.style.left = `${Math.random() * (containerRect.width - randomSize)}px`;
    sticker.style.top = `${Math.random() * (containerRect.height - randomSize)}px`;

    return sticker;
}

// Get fallback emoji for image stickers
function getFallbackEmoji(imageUrl) {
    const fallbacks = {
        'sticker/Sticker.png': '✨',
        'sticker/bear.png': '🧸',
        'sticker/love.png': '💖',
        'sticker/cat.png': '🐱',
        'sticker/unicorn.png': '🦄'
    };
    return fallbacks[imageUrl] || '🎨';
}

// Setup sticker interactions
function setupStickerInteractions(sticker) {
    const deleteBtn = sticker.querySelector('.sticker-delete');
    const resizeHandle = sticker.querySelector('.sticker-resize-handle');

    // Delete functionality
    deleteBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        sticker.remove();
    });

    deleteBtn.addEventListener('touchstart', function(e) {
        e.stopPropagation();
        sticker.remove();
    });

    // Drag functionality - Mouse
    sticker.addEventListener('mousedown', function(e) {
        if (e.target === resizeHandle || e.target === deleteBtn || e.target.closest('.sticker-controls')) return;
        e.preventDefault();
        startDrag(e.clientX, e.clientY, sticker);
    });

    // Drag functionality - Touch
    sticker.addEventListener('touchstart', function(e) {
        if (e.target === resizeHandle || e.target === deleteBtn || e.target.closest('.sticker-controls')) return;
        e.preventDefault();
        const touch = e.touches[0];
        startDrag(touch.clientX, touch.clientY, sticker);
    });

    // Resize functionality - Mouse
    resizeHandle.addEventListener('mousedown', function(e) {
        e.preventDefault();
        e.stopPropagation();
        startResize(e.clientX, e.clientY, sticker);
    });

    // Resize functionality - Touch
    resizeHandle.addEventListener('touchstart', function(e) {
        e.preventDefault();
        e.stopPropagation();
        const touch = e.touches[0];
        startResize(touch.clientX, touch.clientY, sticker);
    });

    // Show controls on hover/touch
    sticker.addEventListener('mouseenter', function() {
        sticker.classList.add('sticker-active');
    });

    sticker.addEventListener('mouseleave', function() {
        if (!isDragging && !isResizing) {
            sticker.classList.remove('sticker-active');
        }
    });

    sticker.addEventListener('touchstart', function() {
        sticker.classList.add('sticker-active');
    });
}

// Start dragging
function startDrag(clientX, clientY, sticker) {
    activeSticker = sticker;
    isDragging = true;
    activeSticker.classList.add('sticker-active');

    // Use current position from styles to avoid jumping
    startStickerX = clientX;
    startStickerY = clientY;
    startStickerLeft = parseFloat(sticker.style.left) || 0;
    startStickerTop = parseFloat(sticker.style.top) || 0;

    // Add global event listeners
    document.addEventListener('mousemove', dragSticker);
    document.addEventListener('mouseup', stopDrag);
    document.addEventListener('touchmove', dragStickerTouch, { passive: false });
    document.addEventListener('touchend', stopDrag);
}

// Start resizing
function startResize(clientX, clientY, sticker) {
    activeSticker = sticker;
    isResizing = true;
    activeSticker.classList.add('sticker-active');

    const rect = sticker.getBoundingClientRect();
    startX = clientX;
    startY = clientY;
    startWidth = rect.width;
    startHeight = rect.height;

    // Add global event listeners
    document.addEventListener('mousemove', resizeSticker);
    document.addEventListener('mouseup', stopResize);
    document.addEventListener('touchmove', resizeStickerTouch, { passive: false });
    document.addEventListener('touchend', stopResize);
}

// Drag sticker - Mouse
function dragSticker(e) {
    if (!activeSticker || !isDragging) return;

    let dx = e.clientX - startStickerX;
    let dy = e.clientY - startStickerY;

    activeSticker.style.left = `${startStickerLeft + dx}px`;
    activeSticker.style.top = `${startStickerTop + dy}px`;
}

// Drag sticker - Touch
function dragStickerTouch(e) {
    if (!activeSticker || !isDragging) return;
    e.preventDefault();

    const touch = e.touches[0];
    let dx = touch.clientX - startStickerX;
    let dy = touch.clientY - startStickerY;

    activeSticker.style.left = `${startStickerLeft + dx}px`;
    activeSticker.style.top = `${startStickerTop + dy}px`;
}

// Resize sticker - Mouse
function resizeSticker(e) {
    if (!activeSticker || !isResizing) return;

    const newWidth = startWidth + (e.clientX - startX);
    const newHeight = startHeight + (e.clientY - startY);

    // Minimum size constraint
    const minSize = 30;
    if (newWidth > minSize && newHeight > minSize) {
        activeSticker.style.width = `${newWidth}px`;
        activeSticker.style.height = `${newHeight}px`;
    }
}

// Resize sticker - Touch
function resizeStickerTouch(e) {
    if (!activeSticker || !isResizing) return;
    e.preventDefault();

    const touch = e.touches[0];
    const newWidth = startWidth + (touch.clientX - startX);
    const newHeight = startHeight + (touch.clientY - startY);

    // Minimum size constraint
    const minSize = 30;
    if (newWidth > minSize && newHeight > minSize) {
        activeSticker.style.width = `${newWidth}px`;
        activeSticker.style.height = `${newHeight}px`;
    }
}

// Stop dragging
function stopDrag() {
    if (activeSticker) {
        activeSticker.classList.remove('sticker-active');
    }
    activeSticker = null;
    isDragging = false;

    // Remove event listeners
    document.removeEventListener('mousemove', dragSticker);
    document.removeEventListener('mouseup', stopDrag);
    document.removeEventListener('touchmove', dragStickerTouch);
    document.removeEventListener('touchend', stopDrag);
}

// Stop resizing
function stopResize() {
    if (activeSticker) {
        activeSticker.classList.remove('sticker-active');
    }
    activeSticker = null;
    isResizing = false;

    // Remove event listeners
    document.removeEventListener('mousemove', resizeSticker);
    document.removeEventListener('mouseup', stopResize);
    document.removeEventListener('touchmove', resizeStickerTouch);
    document.removeEventListener('touchend', stopResize);
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
        selectOverlay(input, e.target.result);
    };
    reader.onerror = function () {
        alert('Error reading file. Please try again.');
    };
    reader.readAsDataURL(file);
}

// Download photo
async function downloadWithHtml2Canvas() {
    const element = document.getElementById("capture-container");
    const downloadBtn = document.getElementById('downloadBtn');
    const spinner = document.getElementById('downloadSpinner');
    const errorMsg = document.getElementById('downloadError');

    // Show loading spinner
    downloadBtn.classList.add('loading');
    errorMsg.style.display = 'none';
    downloadBtn.disabled = true;

    try {
        // 1. Create a high-res clone for capture
        const originalWidth = element.offsetWidth;
        const targetWidth = 800; // Fixed width for consistent high quality
        const scaleFactor = targetWidth / originalWidth;

        const clone = element.cloneNode(true);
        clone.style.width = targetWidth + 'px';
        clone.style.position = 'absolute';
        clone.style.left = '-9999px';
        clone.style.top = '0';
        clone.style.margin = '0';
        clone.style.transform = 'none';
        clone.style.maxWidth = 'none';
        clone.style.visibility = 'visible';
        document.body.appendChild(clone);

        // 2. Adjust styles of the clone for the new width
        const scaleStyles = (el) => {
            const styles = window.getComputedStyle(el);

            // Scale padding, gap, border-radius, font-size, border-width
            const propsToScale = [
                'padding', 'paddingLeft', 'paddingRight', 'paddingTop', 'paddingBottom',
                'gap', 'borderRadius', 'fontSize',
                'marginTop', 'marginBottom', 'marginLeft', 'marginRight',
                'borderWidth', 'borderTopWidth', 'borderBottomWidth', 'borderLeftWidth', 'borderRightWidth',
                'outlineWidth'
            ];
            propsToScale.forEach(prop => {
                const val = styles[prop];
                if (val && val.includes('px')) {
                    const num = parseFloat(val);
                    el.style[prop] = (num * scaleFactor) + 'px';
                }
            });

            // Handle photos specifically - ensure they maintain aspect ratio
            if (el.classList.contains('strip-photo')) {
                const width = parseFloat(styles.width);
                el.style.width = (width * scaleFactor) + 'px';
                el.style.height = (width * scaleFactor * (4/3)) + 'px';
                el.style.aspectRatio = '3/4';
            }

            // Recurse
            Array.from(el.children).forEach(scaleStyles);
        };

        scaleStyles(clone);

        // 2b. Specifically scale stickers and text using accurate bounding boxes
        const originalRect = element.getBoundingClientRect();
        const originalStickers = element.querySelectorAll('.sticker');
        const clonedStickers = clone.querySelectorAll('.sticker');

        originalStickers.forEach((orig, index) => {
            const clonedSticker = clonedStickers[index];
            const rect = orig.getBoundingClientRect();

            const relLeft = rect.left - originalRect.left;
            const relTop = rect.top - originalRect.top;

            clonedSticker.style.left = (relLeft * scaleFactor) + 'px';
            clonedSticker.style.top = (relTop * scaleFactor) + 'px';
            clonedSticker.style.width = (rect.width * scaleFactor) + 'px';
            clonedSticker.style.height = (rect.height * scaleFactor) + 'px';
            clonedSticker.style.transform = 'none';
            clonedSticker.style.margin = '0';
        });

        // 2c. Wait for all images in clone to load BEFORE processing filters
        const images = Array.from(clone.querySelectorAll('img'));
        const bgImages = Array.from(clone.querySelectorAll('[style*="background-image"]'));

        await Promise.all([
            ...images.map(img => {
                if (img.complete && img.naturalWidth !== 0) return Promise.resolve();
                return new Promise(resolve => {
                    img.crossOrigin = "anonymous";
                    img.onload = resolve;
                    img.onerror = resolve;
                });
            }),
            ...bgImages.map(el => {
                const bg = el.style.backgroundImage;
                const url = bg.match(/url\(["']?([^"']+)["']?\)/)?.[1];
                if (!url) return Promise.resolve();
                return new Promise(resolve => {
                    const tempImg = new Image();
                    tempImg.crossOrigin = "anonymous";
                    tempImg.onload = resolve;
                    tempImg.onerror = resolve;
                    tempImg.src = url;
                });
            })
        ]);

        // 3. Process images and apply filters
        const photoImages = clone.querySelectorAll('.strip-photo img');
        for (const img of photoImages) {
            const filterClass = Array.from(img.classList).find(c => c.startsWith('filter-'))?.replace('filter-', '');

            if (filterClass && filterClass !== 'normal') {
                try {
                    const filteredCanvas = await applyFilterToCanvas(img, filterClass);
                    img.src = filteredCanvas.toDataURL('image/png');
                    img.className = '';
                } catch (filterErr) {
                    console.warn("Filter application failed for an image:", filterErr);
                    // Continue without filter rather than failing entirely
                }
            }

            // Use background-image for better object-fit: cover compatibility in html2canvas
            const parent = img.parentElement;
            parent.style.backgroundImage = `url('${img.src}')`;
            parent.style.backgroundSize = 'cover';
            parent.style.backgroundPosition = 'center';
            img.style.opacity = '0';
        }

        // 4. Hide controls and resize handles in the clone
        clone.querySelectorAll('.sticker-controls, .sticker-resize-handle').forEach(el => {
            el.style.display = 'none';
        });

        // Small delay to ensure rendering is complete
        await new Promise(resolve => setTimeout(resolve, 300));

        // 6. Capture
        const canvas = await html2canvas(clone, {
            scale: 2, // Use higher scale for better print quality
            logging: true,
            useCORS: true,
            allowTaint: false,
            backgroundColor: null,
            width: targetWidth,
            height: clone.offsetHeight,
            onclone: (clonedDoc) => {
                // Additional adjustments if needed during capture
                const clonedElement = clonedDoc.querySelector('.strip-preview');
                if (clonedElement) clonedElement.style.visibility = 'visible';
            }
        });

        // 7. Cleanup and download
        document.body.removeChild(clone);

        const link = document.createElement('a');
        link.download = `rey-studio-${Date.now()}.png`;
        link.href = canvas.toDataURL('image/png', 1.0);
        link.click();

    } catch (err) {
        console.error("Error generating image:", err);
        errorMsg.textContent = "Failed to generate image. Please try again.";
        errorMsg.style.display = 'block';
    } finally {
        downloadBtn.classList.remove('loading');
        downloadBtn.disabled = false;
    }
}

async function applyFilterToCanvas(imgElement, filterClass) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    // Set canvas to original image size for best quality
    canvas.width = imgElement.naturalWidth || imgElement.width || 300;
    canvas.height = imgElement.naturalHeight || imgElement.height || 400;

    // Apply CSS filter if available
    if (CSS.supports('filter', 'contrast(1.1)')) {
        ctx.filter = getComputedStyle(imgElement).filter;
        ctx.drawImage(imgElement, 0, 0, canvas.width, canvas.height);
        ctx.filter = 'none';
    } else {
        // Draw original image first for manual filter
        ctx.drawImage(imgElement, 0, 0, canvas.width, canvas.height);
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

        // Other filters...
        default:
            // No changes for normal filter
            break;
    }

    ctx.putImageData(imageData, 0, 0);
}

function applyFrame(element, frameType) {
    const stripPhotos = document.querySelectorAll('.strip-photo');

    // Update selected state in UI
    if (element) {
        document.querySelectorAll('.frame-option').forEach(option => {
            option.classList.remove('selected');
        });
        element.closest('.frame-option').classList.add('selected');
    }

    stripPhotos.forEach(photo => {
        // Reset all frames
        photo.style.border = 'none';
        photo.style.borderBottom = 'none';
        photo.style.boxShadow = 'none';
        photo.style.borderRadius = '4px';
        photo.style.padding = '0';
        photo.style.background = 'transparent';

        switch (frameType) {
            case 'none':
                // Default (no frame)
                break;

            case 'polaroid':
                photo.style.border = '10px solid white';
                photo.style.borderBottom = '30px solid white';
                photo.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
                photo.style.background = 'white';
                break;

            case 'vintage':
                photo.style.border = '5px solid #d4c9a8';
                photo.style.boxShadow = 'inset 0 0 15px rgba(0,0,0,0.1), 0 0 8px rgba(0,0,0,0.2)';
                photo.style.background = '#f0e8d0';
                break;

            case 'instax':
                photo.style.border = '8px solid #f0f0f0';
                photo.style.borderBottom = '15px solid #f0f0f0';
                photo.style.background = '#f8f8f8';
                photo.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                break;

            case 'wood':
                photo.style.border = '10px solid transparent';
                photo.style.padding = '5px';
                photo.style.background = 'linear-gradient(to right, #8B4513, #A0522D) border-box';
                photo.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
                break;

            case 'gold':
                photo.style.border = '8px solid transparent';
                photo.style.padding = '3px';
                photo.style.background = 'linear-gradient(135deg, #FFD700, #D4AF37) border-box';
                photo.style.boxShadow = '0 4px 15px rgba(0,0,0,0.3)';
                break;
        }
    });
}

function toggleFlash() {
    flashOn = !flashOn;
    document.getElementById('flashBtn').innerHTML = `
        <span class="control-icon">⚡</span>
        <span>Flash: ${flashOn ? 'On' : 'Off'}</span>
    `;
}

function toggleGrid() {
    gridOn = !gridOn;
    document.getElementById('gridBtn').innerHTML = `
        <span class="control-icon">⏹️</span>
        <span>Grid: ${gridOn ? 'On' : 'Off'}</span>
    `;
    document.getElementById('cameraGrid').style.display = gridOn ? 'block' : 'none';
}

function toggleMirror() {
    mirrorOn = !mirrorOn;
    const cameraView = document.getElementById('cameraView');
    if (mirrorOn) {
        cameraView.classList.add('mirror');
        cameraView.classList.remove('no-mirror');
    } else {
        cameraView.classList.add('no-mirror');
        cameraView.classList.remove('mirror');
    }
    document.getElementById('mirrorBtn').innerHTML = `
        <span class="control-icon">🪞</span>
        <span>Mirror: ${mirrorOn ? 'On' : 'Off'}</span>
    `;
}

function returnToCamera() {
    // Stop camera if running (if any)
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
    }

    // Show camera screen
    showScreen('screen4-camera');

    // Restart camera with existing photos
    initCameraWithExistingPhotos();
}

// Function to initialize camera with existing photos
async function initCameraWithExistingPhotos() {
    try {
        // Access camera
        if (videoDevices.length > 0 && currentDeviceId) {
            await startCamera(currentDeviceId);
        } else {
            await initCamera();
        }

        // Show thumbnails of photos already taken
        const previewSidebar = document.getElementById('previewSidebar');
        previewSidebar.innerHTML = ''; // Clear first

        capturedPhotos.forEach((photo, index) => {
            const thumbnail = document.createElement('img');
            thumbnail.src = photo;
            thumbnail.className = 'preview-thumbnail';
            thumbnail.title = `Photo ${index + 1}`;
            thumbnail.onclick = () => confirmDeletePhoto(index); // Add option to delete specific photo
            previewSidebar.appendChild(thumbnail);
        });

        // Update photo count
        document.getElementById('photosCount').textContent = capturedPhotos.length;

    } catch (err) {
        console.error("Error accessing camera:", err);
        document.getElementById('cameraError').textContent =
            "Could not access the camera. Please try again.";
        document.getElementById('cameraError').style.display = 'block';
        showScreen('screen3-template');
    }
}

// Function to delete specific photo
function confirmDeletePhoto(index) {
    if (confirm("Delete this photo?")) {
        capturedPhotos.splice(index, 1); // Remove photo from array

        // Update thumbnails in sidebar
        const previewSidebar = document.getElementById('previewSidebar');
        previewSidebar.innerHTML = '';

        capturedPhotos.forEach((photo, i) => {
            const thumbnail = document.createElement('img');
            thumbnail.src = photo;
            thumbnail.className = 'preview-thumbnail';
            thumbnail.title = `Photo ${i + 1}`;
            thumbnail.onclick = () => confirmDeletePhoto(i);
            previewSidebar.appendChild(thumbnail);
        });

        // Update photo count
        document.getElementById('photosCount').textContent = capturedPhotos.length;
        
        // Enable/disable customize button
        const customizeBtn = document.getElementById('customizeBtn');
        customizeBtn.disabled = capturedPhotos.length < photosNeeded;
    }
}

function retakeLastPhoto() {
    if (capturedPhotos.length === 0) return;

    // Remove last photo
    capturedPhotos.pop();

    // Remove last thumbnail from sidebar
    const thumbnails = document.querySelectorAll('.preview-thumbnail');
    if (thumbnails.length > 0) {
        thumbnails[thumbnails.length - 1].remove();
    }

    // Update photo count
    document.getElementById('photosCount').textContent = capturedPhotos.length;
    
    // Enable/disable customize button
    const customizeBtn = document.getElementById('customizeBtn');
    customizeBtn.disabled = capturedPhotos.length < photosNeeded;

    // Stop countdown if running
    if (countdownInterval) {
        clearInterval(countdownInterval);
    }
}

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

    // Update photo count display
    document.getElementById('photosCount').textContent = '0';
    document.getElementById('customizeBtn').disabled = true;

    // Hide countdown
    document.getElementById('countdown').style.display = 'none';

    // Restart camera
    initCamera();
}

// Add these functions to the script section
function changeLogo(element, logoUrl) {
    const logoElement = document.querySelector('.photo-footer img');
    logoElement.src = logoUrl;

    // Update selected state
    document.querySelectorAll('.logo-option').forEach(option => {
        option.classList.remove('selected');
    });
    element.closest('.logo-option').classList.add('selected');
}

function uploadLogo(input) {
    const file = input.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
            changeLogo(input, e.target.result);
        };
        reader.readAsDataURL(file);
    }
}

// Function to go to customization
function goToCustomization() {
    if (capturedPhotos.length >= photosNeeded) {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
        createFinalStrip();
        showScreen('screen5-preview');
    } else {
        alert(`Please capture ${photosNeeded - capturedPhotos.length} more photos`);
    }
}

// Clean up when leaving the page
window.addEventListener('beforeunload', () => {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
    }
    if (countdownInterval) {
        clearInterval(countdownInterval);
    }
});

// Tambahkan event listener untuk mendeteksi perubahan perangkat
navigator.mediaDevices.addEventListener('devicechange', async () => {
    await getCameraDevices();
});