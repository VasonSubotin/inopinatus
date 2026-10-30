/**
 * Zoom Synchronization System
 * Ensures consistent zoom level across all pages
 */

(function() {
    'use strict';
    
    // Reset scroll position immediately on script load
    if ('scrollRestoration' in history) {
        history.scrollRestoration = 'manual';
    }
    window.scrollTo(0, 0);
    
    // Force viewport scale consistency
    var metaViewport = document.querySelector('meta[name="viewport"]');
    if (metaViewport) {
        metaViewport.setAttribute('content', 'width=device-width, initial-scale=1.0, user-scalable=yes');
    }
    
    // Detect current browser zoom level
    function detectZoomLevel() {
        var zoom = 1;
        
        // Method 1: Using devicePixelRatio
        if (window.devicePixelRatio) {
            zoom = window.devicePixelRatio;
        }
        
        // Method 2: Using outerWidth/innerWidth ratio (more accurate for zoom)
        if (window.outerWidth && window.innerWidth) {
            var ratio = window.outerWidth / window.innerWidth;
            if (ratio > 0.5 && ratio < 2) {
                zoom = Math.round(ratio * 100) / 100;
            }
        }
        
        return zoom;
    }
    
    // Store zoom level
    function storeZoomLevel(zoomLevel) {
        try {
            sessionStorage.setItem('browserZoomLevel', zoomLevel);
            localStorage.setItem('browserZoomLevel', zoomLevel);
        } catch (e) {
            console.warn('Could not store zoom level:', e);
        }
    }
    
    // Get stored zoom level
    function getStoredZoomLevel() {
        try {
            return sessionStorage.getItem('browserZoomLevel') || 
                   localStorage.getItem('browserZoomLevel') || 
                   '1';
        } catch (e) {
            return '1';
        }
    }
    
    // Apply consistent viewport
    function ensureConsistentViewport() {
        var viewport = document.querySelector('meta[name="viewport"]');
        if (viewport) {
            // Use the EXACT same viewport settings on all pages
            var viewportContent = 'width=device-width, initial-scale=1.0, user-scalable=yes';
            viewport.setAttribute('content', viewportContent);
        }
        
        // Ensure html and body have consistent base sizing
        if (document.documentElement) {
            document.documentElement.style.fontSize = '100%';
            document.documentElement.style.width = '100%';
        }
    }
    
    // Prevent layout shift on page load
    function preventLayoutShift() {
        // Scroll to top immediately to prevent jump
        if (window.scrollTo) {
            window.scrollTo(0, 0);
        }
        
        // Add a class to html element to signal zoom is synced
        document.documentElement.classList.add('zoom-synced');
        
        // Ensure body is ready for rendering
        if (document.body) {
            document.body.style.opacity = '1';
        }
        
        // Ensure consistent positioning
        document.documentElement.style.scrollBehavior = 'smooth';
    }
    
    // Show zoom notification if needed
    function showZoomNotification(storedZoom, currentZoom) {
        var notification = document.createElement('div');
        notification.id = 'zoom-notification';
        notification.style.cssText = 
            'position: fixed; top: 80px; right: 20px; background: #000; color: white; ' +
            'padding: 15px 20px; border-radius: 8px; z-index: 10000; ' +
            'font-size: 14px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); ' +
            'animation: slideIn 0.3s ease-out;';
        
        var storedPercent = Math.round(parseFloat(storedZoom) * 100);
        var currentPercent = Math.round(currentZoom * 100);
        
        notification.innerHTML = 
            '<div style="font-weight: bold; margin-bottom: 5px;">Browser Zoom Changed</div>' +
            '<div style="font-size: 12px; opacity: 0.9;">Previous page: ' + storedPercent + '%<br>' +
            'Current page: ' + currentPercent + '%<br>' +
            '<span style="font-size: 11px; opacity: 0.7;">Use Ctrl/Cmd +/- to adjust</span></div>';
        
        document.body.appendChild(notification);
        
        // Add animation keyframe
        if (!document.getElementById('zoom-notification-style')) {
            var style = document.createElement('style');
            style.id = 'zoom-notification-style';
            style.textContent = '@keyframes slideIn { from { transform: translateX(400px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }';
            document.head.appendChild(style);
        }
        
        // Auto-hide after 5 seconds
        setTimeout(function() {
            notification.style.animation = 'slideIn 0.3s ease-out reverse';
            setTimeout(function() {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 5000);
    }
    
    // Apply stored zoom level to current page
    function applyStoredZoom() {
        var storedZoom = getStoredZoomLevel();
        var currentZoom = detectZoomLevel();
        
        // If stored zoom is significantly different from current
        if (storedZoom && Math.abs(parseFloat(storedZoom) - currentZoom) > 0.15) {
            // Wait for body to be available
            if (document.body) {
                showZoomNotification(storedZoom, currentZoom);
            } else {
                window.addEventListener('load', function() {
                    showZoomNotification(storedZoom, currentZoom);
                });
            }
        }
    }
    
    // Main initialization
    function initialize() {
        // Ensure consistent viewport FIRST
        ensureConsistentViewport();
        
        // Detect and store current zoom
        var currentZoom = detectZoomLevel();
        var storedZoom = getStoredZoomLevel();
        
        // ALWAYS store current zoom for next page
        storeZoomLevel(currentZoom);
        
        // Try to apply stored zoom (shows notification if different)
        applyStoredZoom();
        
        // Prevent layout shift
        preventLayoutShift();
        
        // Log zoom information for debugging - ALWAYS show this
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🔍 ZOOM SYNC DEBUG:');
        console.log('   Current Zoom: ' + (currentZoom * 100).toFixed(0) + '%');
        console.log('   Stored Zoom: ' + (parseFloat(storedZoom) * 100).toFixed(0) + '%');
        console.log('   Page: ' + window.location.pathname.split('/').pop());
        console.log('   Browser: ' + navigator.userAgent.split(' ').slice(-1)[0]);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        // Monitor zoom changes in real-time
        var lastZoom = currentZoom;
        window.addEventListener('resize', function() {
            var newZoom = detectZoomLevel();
            if (Math.abs(newZoom - lastZoom) > 0.01) {
                lastZoom = newZoom;
                storeZoomLevel(newZoom);
                console.log('📊 Zoom changed to: ' + (newZoom * 100).toFixed(0) + '%');
            }
        });
        
        // Also monitor on page show (for back/forward navigation)
        window.addEventListener('pageshow', function(event) {
            var pageZoom = detectZoomLevel();
            console.log('📄 Page shown - Zoom: ' + (pageZoom * 100).toFixed(0) + '%');
            if (event.persisted) {
                // Page was loaded from cache
                ensureConsistentViewport();
            }
        });
        
        // Clear sync flag after initialization
        try {
            sessionStorage.removeItem('zoomNeedsSync');
        } catch (e) {}
    }
    
    // Run on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }
    
})();

