// Global variables
let stream = null;
let selectedBackground = '#FFD1D1';
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
let currentOverlay = null;

// Template configurations
const templateConfig = {
    'vertical-2': {
        photosNeeded: 2,
        containerClass: 'vertical-2',
        photoClass: 'vertical-photo'
    },
    'vertical-3': {
        photosNeeded: 3,
        containerClass: 'vertical-3',
        photoClass: 'vertical-photo'
    },
    'vertical-4': {
        photosNeeded: 4,
        containerClass: 'vertical-4',
        photoClass: 'vertical-photo'
    }
};

// Initialize flash element reference
document.addEventListener('DOMContentLoaded', () => {
    flashElement = document.getElementById('flash');
});

// Simple screen navigation
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
}

// Tab navigation
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

        // Access the camera
        stream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: currentFacingMode,
                width: { ideal: 1920 },
                height: { ideal: 1080 }
            },
            audio: false
        });

        const cameraView = document.getElementById('cameraView');
        cameraView.srcObject = stream;
    } catch (err) {
        console.error("Error accessing camera:", err);
        document.getElementById('cameraError').textContent =
            "Could not access the camera. Please make sure you've granted camera permissions and that your camera is working properly.";
        document.getElementById('cameraError').style.display = 'block';
        document.getElementById('captureBtn').disabled = true;
    }
}

// Capture photo from camera
function capturePhoto() {
    if (isCountingDown) return; // Prevent multiple countdowns

    isCountingDown = true;
    const captureBtn = document.getElementById('captureBtn');
    captureBtn.disabled = true;

    let seconds = 3;
    const countdownElement = document.getElementById('countdown');
    countdownElement.style.display = 'block';
    countdownElement.textContent = `Capturing in ${seconds}...`;

    const countdownInterval = setInterval(() => {
        seconds--;
        countdownElement.textContent = `Capturing in ${seconds}...`;

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

    // Create a square crop from the center
    const size = Math.min(videoWidth, videoHeight);
    const offsetX = (videoWidth - size) / 2;
    const offsetY = (videoHeight - size) / 2;

    // Create a new canvas for the cropped image
    const croppedCanvas = document.createElement('canvas');
    const croppedContext = croppedCanvas.getContext('2d');
    croppedCanvas.width = size;
    croppedCanvas.height = size;
    
    // Draw the cropped portion
    croppedContext.drawImage(
        canvas,
        offsetX, offsetY, size, size, // source rectangle
        0, 0, size, size              // destination rectangle
    );

    // Resize to final output size (600x600 for high quality)
    const finalCanvas = document.createElement('canvas');
    const finalContext = finalCanvas.getContext('2d');
    finalCanvas.width = 600;
    finalCanvas.height = 600;
    
    // Use high-quality image scaling
    finalContext.imageSmoothingQuality = 'high';
    finalContext.drawImage(
        croppedCanvas,
        0, 0, size, size,
        0, 0, 600, 600
    );

    const photoDataUrl = finalCanvas.toDataURL('image/png', 1.0); // Highest quality

    // Update photos array
    if (currentPhotoIndex < capturedPhotos.length) {
        capturedPhotos[currentPhotoIndex] = photoDataUrl;
    } else {
        capturedPhotos.push(photoDataUrl);
    }

    updateThumbnails();
    currentPhotoIndex++;

    if (currentPhotoIndex >= photosNeeded) {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
        createFinalStrip();
        showScreen('screen5-preview');
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
}

// Create the final photo strip
function createFinalStrip() {
    const stripTemplate = document.getElementById('stripTemplate');
    stripTemplate.innerHTML = '';

    // Set template class
    stripTemplate.className = 'strip-template ' + templateConfig[selectedTemplate].containerClass;

    // Create photo elements
    for (let i = 0; i < capturedPhotos.length; i++) {
        const photoDiv = document.createElement('div');
        photoDiv.className = 'strip-photo ' + templateConfig[selectedTemplate].photoClass;

        const img = document.createElement('img');
        img.src = capturedPhotos[i];
        img.className = `filter-${selectedFilter}`;

        // Ensure image fills the container properly
        img.style.objectFit = 'cover';
        img.style.width = '100%';
        img.style.height = '100%';

        photoDiv.appendChild(img);
        stripTemplate.appendChild(photoDiv);
    }

    // Update the background
    document.getElementById('capture-container').style.background = selectedBackground;
    
    // Apply current overlay if exists
    if (currentOverlay) {
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
    reader.onload = function(e) {
        // Create a new background option with the uploaded image
        const bgUrl = `url('${e.target.result}')`;
        selectBackground(input.closest('.background-option'), bgUrl);
        
        // Update the selected state
        document.querySelectorAll('.background-option').forEach(option => {
            option.classList.remove('selected');
        });
        input.closest('.background-option').classList.add('selected');
    };
    reader.onerror = function() {
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
        <img src="${stickerUrl}" alt="Sticker">
        <div class="sticker-controls">
            <div class="sticker-delete">×</div>
        </div>
        <div class="sticker-resize"></div>
    `;

    // Position sticker randomly within the container
    const containerRect = stripTemplate.getBoundingClientRect();
    const stickerSize = 80 + Math.random() * 40;

    sticker.style.width = `${stickerSize}px`;
    sticker.style.left = `${Math.random() * (containerRect.width - stickerSize)}px`;
    sticker.style.top = `${Math.random() * (containerRect.height - stickerSize)}px`;

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
    
    // Add to the capture container
    const stripTemplate = document.getElementById('stripTemplate');
    stripTemplate.parentNode.insertBefore(overlay, stripTemplate.nextSibling);

    // Update current overlay
    currentOverlay = overlayUrl;

    // Update selected state in UI
    document.querySelectorAll('.overlay-option').forEach(option => {
        option.classList.remove('selected');
    });
    event.currentTarget.classList.add('selected');
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
    reader.onload = function(e) {
        applyOverlay(e.target.result);
        
        // Update the selected state
        document.querySelectorAll('.overlay-option').forEach(option => {
            option.classList.remove('selected');
        });
        input.closest('.overlay-option').classList.add('selected');
    };
    reader.onerror = function() {
        alert('Error reading file. Please try again.');
    };
    reader.readAsDataURL(file);
}

// Download photo
async function downloadWithHtml2Canvas() {
    const element = document.getElementById("capture-container");
    const spinner = document.getElementById('downloadSpinner');
    const errorMsg = document.getElementById('downloadError');
    
    // Show loading spinner
    spinner.style.display = 'block';
    errorMsg.style.display = 'none';
    document.getElementById('downloadBtn').disabled = true;

    try {
        // Hide elements that shouldn't appear in download
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
                    tempSrc: canvas.toDataURL('image/png', 1.0) // Highest quality
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
        tempContainer.style.width = '600px'; // Larger size for better quality
        tempContainer.style.height = 'auto';
        tempContainer.style.transform = 'scale(2)'; // Scale up for higher resolution
        tempContainer.style.transformOrigin = 'top left';
        
        // Clone the original element
        const clone = element.cloneNode(true);
        tempContainer.appendChild(clone);
        document.body.appendChild(tempContainer);

        // Use html2canvas with optimized settings
        const canvas = await html2canvas(clone, {
            scale: 2, // Higher scale for better quality
            logging: false,
            useCORS: true,
            allowTaint: true,
            backgroundColor: null,
            quality: 1, // Highest quality
            letterRendering: true,
            removeContainer: true // Remove temp container after rendering
        });

        // Remove temporary container
        document.body.removeChild(tempContainer);

        // Restore original images
        processedData.forEach(data => {
            data.imgElement.src = data.originalSrc;
            data.imgElement.className = `filter-${data.imgElement.className}`;
        });

        // Restore hidden elements
        elementsToHide.forEach((el, i) => {
            el.style.display = originalDisplay[i];
        });

        // Create download link
        const link = document.createElement('a');
        link.download = 'rey-studio-photo.png';
        link.href = canvas.toDataURL('image/png', 1.0); // Highest quality
        link.click();

    } catch (err) {
        console.error("Error generating image:", err);
        errorMsg.textContent = "Failed to generate image. Please try again.";
        errorMsg.style.display = 'block';
    } finally {
        spinner.style.display = 'none';
        document.getElementById('downloadBtn').disabled = false;
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

        // Other filters...
        default:
            // No changes for normal filter
            break;
    }

    ctx.putImageData(imageData, 0, 0);
}

function applyFrame(frameType) {
    const stripPhotos = document.querySelectorAll('.strip-photo');

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

            case 'neon':
                photo.style.border = '2px solid #00f2fe';
                photo.style.boxShadow = '0 0 10px #00f2fe, inset 0 0 5px #00f2fe';
                photo.style.background = 'black';
                break;

            case 'polaroid-color':
                photo.style.border = '10px solid #ff9a9e';
                photo.style.borderBottom = '30px solid #ff9a9e';
                photo.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
                photo.style.background = '#ff9a9e';
                break;
        }
    });
}

async function switchCamera() {
    try {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }

        currentFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';
        const constraints = {
            video: {
                facingMode: currentFacingMode,
                width: { ideal: 1920 },
                height: { ideal: 1080}
            },
            audio: false
        };

        stream = await navigator.mediaDevices.getUserMedia(constraints);
        document.getElementById('cameraView').srcObject = stream;
    } catch (err) {
        console.error("Error switching camera:", err);
        document.getElementById('cameraError').textContent =
            "Error switching camera. Your device might not have multiple cameras.";
        document.getElementById('cameraError').style.display = 'block';
    }
}

function toggleFlash() {
    flashOn = !flashOn;
    document.getElementById('flashBtn').textContent =
        `Flash: ${flashOn ? 'On' : 'Off'}`;
}

function toggleGrid() {
    gridOn = !gridOn;
    document.getElementById('gridBtn').textContent =
        `Grid: ${gridOn ? 'On' : 'Off'}`;
    document.getElementById('cameraGrid').style.display = gridOn ? 'block' : 'none';
}

function returnToCamera() {
    // Stop camera if running (if any)
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
    }

    // Reset photo index to number of photos already taken
    currentPhotoIndex = capturedPhotos.length;

    // Show camera screen
    showScreen('screen4-camera');

    // Restart camera with existing photos
    initCameraWithExistingPhotos();
}

// Function to initialize camera with existing photos
async function initCameraWithExistingPhotos() {
    try {
        // Access camera
        stream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: currentFacingMode,
                width: { ideal: 1920 },
                height: { ideal: 1080 }
            },
            audio: false
        });

        const cameraView = document.getElementById('cameraView');
        cameraView.srcObject = stream;

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
        currentPhotoIndex = capturedPhotos.length; // Reset index

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

        // If no photos left, start from scratch
        if (capturedPhotos.length === 0) {
            currentPhotoIndex = 0;
        }
    }
}

function retakeLastPhoto() {
    if (capturedPhotos.length === 0) return;

    // Remove last photo
    capturedPhotos.pop();
    currentPhotoIndex--;

    // Remove last thumbnail from sidebar
    const thumbnails = document.querySelectorAll('.preview-thumbnail');
    if (thumbnails.length > 0) {
        thumbnails[thumbnails.length - 1].remove();
    }

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
    currentPhotoIndex = 0;
    capturedPhotos = [];

    // Clear preview sidebar
    document.getElementById('previewSidebar').innerHTML = '';

    // Hide countdown
    document.getElementById('countdown').style.display = 'none';

    // Restart camera
    initCamera();
}

// Add these functions to the script section
function changeLogo(logoUrl) {
    const logoElement = document.querySelector('.photo-footer img');
    logoElement.src = logoUrl;

    // Update selected state
    document.querySelectorAll('.logo-option').forEach(option => {
        option.classList.remove('selected');
    });
    event.currentTarget.classList.add('selected');
}

function uploadLogo(input) {
    const file = input.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
            changeLogo(e.target.result);

            // Update the selected state for the upload option
            document.querySelectorAll('.logo-option').forEach(option => {
                option.classList.remove('selected');
            });
            input.closest('.logo-option').classList.add('selected');
        };
        reader.readAsDataURL(file);
    }
}

function uploadBackground(input) {
    const file = input.files[0];
    if (!file) return;

    // Validasi ukuran file (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
        alert('File terlalu besar. Maksimal 5MB');
        return;
    }

    // Validasi tipe file
    if (!file.type.match('image.*')) {
        alert('Hanya file gambar yang diperbolehkan');
        return;
    }

    const reader = new FileReader();
    reader.onload = function (e) {
        // Set background
        const bgUrl = e.target.result;
        selectedBackground = `url(${bgUrl})`;
        const container = document.getElementById('capture-container');
        container.style.backgroundImage = `url(${bgUrl})`;
        container.style.backgroundSize = 'cover';
        container.style.backgroundPosition = 'center';

        // Update selected state
        document.querySelectorAll('.background-option').forEach(option => {
            option.classList.remove('selected');
        });
        input.closest('.background-option').classList.add('selected');
    };
    reader.onerror = function () {
        alert('Gagal membaca file');
    };
    reader.readAsDataURL(file);
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