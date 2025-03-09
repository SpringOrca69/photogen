package com.example.photogen.controller;

import java.util.ArrayList;
import java.util.Base64;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.opencv.core.Core;
import org.opencv.core.Mat;
import org.opencv.core.MatOfByte;
import org.opencv.core.MatOfRect;
import org.opencv.core.Point;
import org.opencv.core.Rect;
import org.opencv.core.Scalar;
import org.opencv.core.Size;
import org.opencv.imgcodecs.Imgcodecs;
import org.opencv.imgproc.Imgproc;
import org.opencv.objdetect.CascadeClassifier;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auto-crop")
public class AutoCropController {

    private static final Logger logger = LoggerFactory.getLogger(AutoCropController.class);

    static {
        System.loadLibrary(Core.NATIVE_LIBRARY_NAME);
    }

    @PostMapping("/detect-face")
    public ResponseEntity<?> detectAndCenterFace(@RequestBody Map<String, String> payload) {
        try {
            String imageString = payload.get("image");
            if (imageString == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "No image data provided"));
            }

            // Handle data URL format safely
            String[] parts = imageString.split(",");
            String imageData = parts.length > 1 ? parts[1] : parts[0];
            
            byte[] inputImageBytes;
            try {
                inputImageBytes = Base64.getDecoder().decode(imageData);
            } catch (IllegalArgumentException e) {
                logger.error("Base64 decoding failed", e);
                return ResponseEntity.badRequest().body(Map.of("error", "Invalid base64 image data"));
            }
            
            Mat inputImage = Imgcodecs.imdecode(new MatOfByte(inputImageBytes), Imgcodecs.IMREAD_COLOR);
            
            if (inputImage.empty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Could not decode image"));
            }

            // Get face position
            CascadeClassifier faceDetector;
            try {
                String resourcePath = getClass().getResource("/haarcascade_frontalface_default.xml").getPath();
                // Handle Windows path issues
                if (resourcePath.startsWith("/") && System.getProperty("os.name").toLowerCase().contains("win")) {
                    resourcePath = resourcePath.substring(1);
                }
                faceDetector = new CascadeClassifier(resourcePath);
                if (faceDetector.empty()) {
                    logger.error("Failed to load face cascade classifier");
                    return ResponseEntity.internalServerError().body(Map.of("error", "Failed to load face detection model"));
                }
            } catch (Exception e) {
                logger.error("Error loading cascade classifier", e);
                return ResponseEntity.internalServerError().body(Map.of("error", "Failed to initialize face detector: " + e.getMessage()));
            }
            
            // Try multiple detection parameters for better reliability
            MatOfRect faceDetections = new MatOfRect();
            double[] scaleFactors = {1.1, 1.2, 1.3};
            int[] minNeighbors = {5, 4, 3};
            boolean faceFound = false;
            
            for (double scaleFactor : scaleFactors) {
                for (int neighbor : minNeighbors) {
                    if (!faceFound) {
                        faceDetector.detectMultiScale(
                            inputImage, 
                            faceDetections,
                            scaleFactor,
                            neighbor,
                            0,
                            new Size(30, 30),
                            new Size()
                        );
                        
                        if (!faceDetections.empty()) {
                            faceFound = true;
                            logger.info("Face found with scaleFactor={}, minNeighbors={}", scaleFactor, neighbor);
                            break;
                        }
                    }
                }
                if (faceFound) break;
            }
            
            if (!faceFound) {
                // Try with more lenient parameters for difficult cases
                faceDetector.detectMultiScale(
                    inputImage, 
                    faceDetections,
                    1.1,
                    2,
                    0,
                    new Size(20, 20),
                    new Size()
                );
            }
            
            if (faceDetections.empty()) {
                // No face detected, return original image with center coordinates
                logger.info("No faces detected, using center of image");
                Map<String, Object> cropData = new HashMap<>();
                cropData.put("x", inputImage.width() / 4);
                cropData.put("y", inputImage.height() / 4);
                cropData.put("width", inputImage.width() / 2);
                cropData.put("height", inputImage.height() / 2);
                
                Map<String, Object> response = new HashMap<>();
                response.put("cropData", cropData);
                response.put("message", "No face detected, using default center crop");
                
                return ResponseEntity.ok(response);
            }

            // Find largest face
            Rect[] faces = faceDetections.toArray();
            if (faces.length == 0) {
                // Safety check - should not happen as we already checked faceDetections.empty()
                logger.warn("No faces in array despite non-empty MatOfRect");
                Map<String, Object> cropData = new HashMap<>();
                cropData.put("x", inputImage.width() / 4);
                cropData.put("y", inputImage.height() / 4);
                cropData.put("width", inputImage.width() / 2);
                cropData.put("height", inputImage.height() / 2);
                
                Map<String, Object> response = new HashMap<>();
                response.put("cropData", cropData);
                response.put("message", "Face detection issue, using default center crop");
                
                return ResponseEntity.ok(response);
            }
            
            // Find the largest face
            Rect faceRect = faces[0];
            for (Rect rect : faces) {
                if (rect.area() > faceRect.area()) {
                    faceRect = rect;
                }
            }
            
            // Calculate optimal crop area (centered on face)
            int aspectRatio = 1; // Default to square
            try {
                String aspectRatioStr = payload.getOrDefault("aspectRatio", "1");
                aspectRatio = Integer.parseInt(aspectRatioStr);
            } catch (NumberFormatException e) {
                logger.warn("Invalid aspect ratio, defaulting to 1:1");
            }
            
            Rect cropRect = calculateOptimalCrop(inputImage.size(), faceRect, aspectRatio);
            
            logger.info("Face detected at: " + faceRect.toString());
            logger.info("Optimal crop: " + cropRect.toString());

            Map<String, Object> cropData = new HashMap<>();
            cropData.put("x", cropRect.x);
            cropData.put("y", cropRect.y);
            cropData.put("width", cropRect.width);
            cropData.put("height", cropRect.height);
            
            Map<String, Object> response = new HashMap<>();
            response.put("cropData", cropData);
            response.put("message", "Face detected and crop calculated");
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            logger.error("Error detecting face", e);
            return ResponseEntity.internalServerError().body(Map.of("error", "Face detection failed: " + e.getMessage()));
        }
    }

    private Rect calculateOptimalCrop(Size imageSize, Rect faceRect, int aspectRatio) {
        // Create a copy of face rectangle for reference
        Rect originalFaceRect = new Rect(faceRect.x, faceRect.y, faceRect.width, faceRect.height);
        
        // Expand the face rectangle to better cover the whole face
        // Forehead is often not fully detected, so add more padding at the top
        int expandTopPercentage = 50; // 50% more space above the face for forehead
        int expandSidesPercentage = 20; // 20% more space on each side
        int expandBottomPercentage = 30; // 30% more space below the face for chin
        
        int expandedX = Math.max(0, originalFaceRect.x - (originalFaceRect.width * expandSidesPercentage / 100));
        int expandedY = Math.max(0, originalFaceRect.y - (originalFaceRect.height * expandTopPercentage / 100));
        int expandedWidth = Math.min((int)imageSize.width - expandedX, 
                                   originalFaceRect.width * (100 + 2 * expandSidesPercentage) / 100);
        int expandedHeight = Math.min((int)imageSize.height - expandedY,
                                    originalFaceRect.height * (100 + expandTopPercentage + expandBottomPercentage) / 100);
        
        // Update the face rectangle with the expanded one
        Rect expandedFaceRect = new Rect(expandedX, expandedY, expandedWidth, expandedHeight);
        
        // Calculate face center point - ALWAYS center on this point
        Point faceCenter = new Point(
            expandedFaceRect.x + expandedFaceRect.width / 2.0,
            expandedFaceRect.y + expandedFaceRect.height / 2.0
        );
        
        // For passport photos, face should occupy appropriate percentage of image height
        // Standard for passport: face height should be 70-80% of photo height
        double faceHeightPercentage = 0.7; // Reduced from 0.75 to give more padding
        
        // Calculate crop size based on face dimensions with better padding
        double faceSizeFactor;
        if (aspectRatio > 100 || (double)aspectRatio == 35.0/45.0) {  // Passport ratio (35/45)
            // Increased padding for passport photos
            faceSizeFactor = 1.8 / faceHeightPercentage;  // More padding around the face
        } else {
            faceSizeFactor = 4.0;  // Increased from 3.5 to allow more space around the face
        }
        
        // Ensure we have enough space around the face by using the larger dimension
        int cropSize = (int) Math.max(expandedFaceRect.height * faceSizeFactor, 
                                      expandedFaceRect.width * faceSizeFactor * 1.8); // Increased multiplier
        
        // Ensure minimum crop size for faces detected too small
        int minSize = (int) Math.min(imageSize.width, imageSize.height) / 2;
        cropSize = Math.max(cropSize, minSize);
        
        // Calculate dimensions based on aspect ratio
        int cropWidth, cropHeight;
        
        // Handle different aspect ratios
        if (aspectRatio == 1) { // 1:1 square
            cropWidth = cropHeight = cropSize;
        } else if (aspectRatio == 4 || aspectRatio == 43) { // 4:3 or 3:4
            if (aspectRatio == 4) {
                cropWidth = (int) (cropSize * (4.0 / 3.0));
                cropHeight = cropSize;
            } else { // 3:4
                cropWidth = cropSize;
                cropHeight = (int) (cropSize * (4.0 / 3.0));
            }
        } else if (aspectRatio == 16 || aspectRatio == 169) { // 16:9 or 9:16
            if (aspectRatio == 16) {
                cropWidth = (int) (cropSize * (16.0 / 9.0));
                cropHeight = cropSize;
            } else { // 9:16
                cropWidth = cropSize;
                cropHeight = (int) (cropSize * (16.0 / 9.0));
            }
        } else { // Custom aspect ratio (like 35/45 for passport)
            // Parse numerator and denominator if available
            double aspectRatioValue;
            if (aspectRatio > 100) { // Special case for fractional values stored as integers
                aspectRatioValue = aspectRatio / 1000.0;
            } else if (Math.abs((double)aspectRatio - 35.0/45.0) < 0.001) {
                aspectRatioValue = 35.0/45.0;  // Exact passport ratio
            } else {
                aspectRatioValue = (double) aspectRatio;
            }
            
            // For passport photos (aspect ratio 35:45 ≈ 0.778)
            if (Math.abs(aspectRatioValue - 35.0/45.0) < 0.001) {
                cropWidth = (int) (cropSize * aspectRatioValue);
                cropHeight = cropSize;
                
                // For passport photos, position face according to standards
                // Estimate eye position (approximately 40% from top of face)
                double estimatedEyeY = expandedFaceRect.y + expandedFaceRect.height * 0.4;
                
                // Position eyes at 45% of the image height from top (standard for passport photos)
                double eyePositionFactor = 0.45;
                int desiredEyeY = (int)(cropHeight * eyePositionFactor);
                
                // Adjust face center to position eyes at the standard position
                faceCenter = new Point(
                    faceCenter.x,
                    estimatedEyeY + (desiredEyeY - estimatedEyeY)
                );
            } else if (aspectRatioValue < 1) {
                cropWidth = (int) (cropSize * aspectRatioValue);
                cropHeight = cropSize;
            } else {
                cropWidth = cropSize;
                cropHeight = (int) (cropSize / aspectRatioValue);
            }
        }
        
        // ALWAYS center crop rectangle on the face center point
        int cropX = (int) Math.round(faceCenter.x - cropWidth / 2.0);
        int cropY = (int) Math.round(faceCenter.y - cropHeight / 2.0);
        
        // Apply boundary constraints while trying to keep the face centered
        if (cropX < 0) {
            cropX = 0;
        } else if (cropX + cropWidth > imageSize.width) {
            cropX = (int)imageSize.width - cropWidth;
        }
        
        if (cropY < 0) {
            cropY = 0;
        } else if (cropY + cropHeight > imageSize.height) {
            cropY = (int)imageSize.height - cropHeight;
        }
        
        // Make sure the face is always fully contained within the crop
        // If not, adjust the crop position while maintaining aspect ratio
        if (!isRectFullyContained(expandedFaceRect, new Rect(cropX, cropY, cropWidth, cropHeight))) {
            // Adjust X if needed
            if (cropX > expandedFaceRect.x) {
                cropX = Math.max(0, expandedFaceRect.x - (int)(expandedFaceRect.width * 0.2)); // 20% padding
            }
            if (cropX + cropWidth < expandedFaceRect.x + expandedFaceRect.width) {
                int newWidth = (int)(expandedFaceRect.x + expandedFaceRect.width * 1.2) - cropX; // 20% padding
                cropWidth = Math.min(newWidth, (int)imageSize.width - cropX);
            }
            
            // Adjust Y if needed
            if (cropY > expandedFaceRect.y) {
                cropY = Math.max(0, expandedFaceRect.y - (int)(expandedFaceRect.height * 0.2)); // 20% padding
            }
            if (cropY + cropHeight < expandedFaceRect.y + expandedFaceRect.height) {
                int newHeight = (int)(expandedFaceRect.y + expandedFaceRect.height * 1.2) - cropY; // 20% padding
                cropHeight = Math.min(newHeight, (int)imageSize.height - cropY);
            }
        }

        // Final adjustments to ensure we don't exceed image bounds
        cropX = Math.max(0, cropX);
        cropY = Math.max(0, cropY);
        cropWidth = Math.min(cropWidth, (int)imageSize.width - cropX);
        cropHeight = Math.min(cropHeight, (int)imageSize.height - cropY);
        
        return new Rect(cropX, cropY, cropWidth, cropHeight);
    }
    
    // Helper method to check if a point is inside a rectangle
    private boolean isPointInRect(Point p, Rect r) {
        return p.x >= r.x && p.x < (r.x + r.width) && 
               p.y >= r.y && p.y < (r.y + r.height);
    }
    
    // Helper method to check if a rectangle is fully contained within another
    private boolean isRectFullyContained(Rect innerRect, Rect outerRect) {
        return innerRect.x >= outerRect.x &&
               innerRect.y >= outerRect.y &&
               (innerRect.x + innerRect.width) <= (outerRect.x + outerRect.width) &&
               (innerRect.y + innerRect.height) <= (outerRect.y + outerRect.height);
    }

    @PostMapping("/debug-face-detection")
    public ResponseEntity<?> debugFaceDetection(@RequestBody Map<String, String> payload) {
        try {
            String imageData = payload.get("image").split(",")[1];
            byte[] inputImageBytes = Base64.getDecoder().decode(imageData);
            Mat inputImage = Imgcodecs.imdecode(new MatOfByte(inputImageBytes), Imgcodecs.IMREAD_COLOR);
            
            if (inputImage.empty()) {
                throw new IllegalArgumentException("Empty image");
            }
            
            // Try different parameters for face detection
            Map<String, Object> results = new HashMap<>();
            
            // Load classifier
            CascadeClassifier faceDetector = new CascadeClassifier(
                getClass().getResource("/haarcascade_frontalface_default.xml").getPath().substring(1));
            
            // Try different scale factors and min neighbors
            double[] scaleFactors = {1.05, 1.1, 1.2, 1.3};
            int[] minNeighbors = {3, 4, 5, 6};
            
            List<Map<String, Object>> allDetections = new ArrayList<>();
            
            for (double scaleFactor : scaleFactors) {
                for (int minNeighbor : minNeighbors) {
                    MatOfRect faceDetections = new MatOfRect();
                    faceDetector.detectMultiScale(
                        inputImage, 
                        faceDetections, 
                        scaleFactor, 
                        minNeighbor, 
                        0, 
                        new Size(30, 30), 
                        new Size()
                    );
                    
                    Rect[] faces = faceDetections.toArray();
                    
                    Map<String, Object> detectionInfo = new HashMap<>();
                    detectionInfo.put("scaleFactor", scaleFactor);
                    detectionInfo.put("minNeighbors", minNeighbor);
                    detectionInfo.put("facesFound", faces.length);
                    
                    List<Map<String, Integer>> facesList = new ArrayList<>();
                    for (Rect face : faces) {
                        Map<String, Integer> faceMap = new HashMap<>();
                        faceMap.put("x", face.x);
                        faceMap.put("y", face.y);
                        faceMap.put("width", face.width);
                        faceMap.put("height", face.height);
                        facesList.add(faceMap);
                    }
                    detectionInfo.put("faces", facesList);
                    
                    allDetections.add(detectionInfo);
                    
                    // If we found a good face, draw it on a debug image
                    if (faces.length > 0) {
                        Mat debugImage = inputImage.clone();
                        for (Rect face : faces) {
                            Imgproc.rectangle(debugImage, 
                                new Point(face.x, face.y), 
                                new Point(face.x + face.width, face.y + face.height), 
                                new Scalar(0, 255, 0), 3);
                        }
                        
                        // Convert to base64 and add to results if this is our best detection
                        if (detectionInfo.equals(allDetections.stream()
                                .sorted((a, b) -> Integer.compare((int)b.get("facesFound"), (int)a.get("facesFound")))
                                .findFirst()
                                .orElse(null))) {
                            
                            MatOfByte matOfByte = new MatOfByte();
                            Imgcodecs.imencode(".jpg", debugImage, matOfByte);
                            byte[] byteArray = matOfByte.toArray();
                            String base64Image = Base64.getEncoder().encodeToString(byteArray);
                            
                            results.put("bestDetectionImage", "data:image/jpeg;base64," + base64Image);
                        }
                    }
                }
            }
            
            results.put("imageWidth", inputImage.width());
            results.put("imageHeight", inputImage.height());
            results.put("detections", allDetections);
            
            return ResponseEntity.ok(results);
            
        } catch (Exception e) {
            logger.error("Error debugging face detection", e);
            return ResponseEntity.internalServerError().body(Map.of(
                "error", "Face detection debugging failed: " + e.getMessage(),
                "stackTrace", e.getStackTrace()
            ));
        }
    }

    @PostMapping("/improved-detect-face")
    public ResponseEntity<?> improvedDetectFace(@RequestBody Map<String, String> payload) {
        try {
            String imageData = payload.get("image").split(",")[1];
            byte[] inputImageBytes = Base64.getDecoder().decode(imageData);
            Mat inputImage = Imgcodecs.imdecode(new MatOfByte(inputImageBytes), Imgcodecs.IMREAD_COLOR);
            
            if (inputImage.empty()) {
                throw new IllegalArgumentException("Empty image");
            }

            // Try different parameters to improve detection
            CascadeClassifier faceDetector = new CascadeClassifier(
                getClass().getResource("/haarcascade_frontalface_default.xml").getPath().substring(1));
            
            MatOfRect faceDetections = new MatOfRect();
            
            // Use more robust parameters for face detection
            faceDetector.detectMultiScale(
                inputImage, 
                faceDetections, 
                1.1,   // scale factor
                5,     // min neighbors
                0,     // flags
                new Size(30, 30),  // min size
                new Size()         // max size
            );
            
            if (faceDetections.empty()) {
                // Try again with more lenient parameters
                faceDetector.detectMultiScale(
                    inputImage, 
                    faceDetections, 
                    1.2,   // larger scale factor
                    3,     // fewer min neighbors
                    0,     // flags
                    new Size(20, 20),  // smaller min size
                    new Size()         // max size
                );
            }
            
            if (faceDetections.empty()) {
                // Try one more time with even more lenient parameters
                faceDetector.detectMultiScale(
                    inputImage, 
                    faceDetections, 
                    1.1,   // scale factor
                    2,     // min neighbors
                    0,     // flags
                    new Size(15, 15),  // smaller min size
                    new Size()         // max size
                );
                
                if (faceDetections.empty()) {
                    logger.info("No faces detected after multiple attempts, using center of image");
                    return ResponseEntity.ok(Map.of(
                        "cropData", Map.of(
                            "x", inputImage.width() / 4,
                            "y", inputImage.height() / 4,
                            "width", inputImage.width() / 2,
                            "height", inputImage.height() / 2
                        ),
                        "message", "No face detected, using default center crop"
                    ));
                }
            }

            // Find largest face
            Rect[] faces = faceDetections.toArray();
            Rect faceRect = faces[0];
            for (Rect rect : faces) {
                if (rect.area() > faceRect.area()) {
                    faceRect = rect;
                }
            }
            
            // Calculate optimal crop area (centered on face)
            // Use double for aspect ratio instead of int
            double aspectRatio;
            try {
                String aspectRatioStr = payload.getOrDefault("aspectRatio", "1");
                aspectRatio = Double.parseDouble(aspectRatioStr);
            } catch (NumberFormatException e) {
                logger.warn("Invalid aspect ratio format, defaulting to 1:1");
                aspectRatio = 1.0;
            }
            
            // Convert to the expected format for the existing calculateOptimalCrop method
            // We'll pass special values to indicate particular aspect ratios
            int aspectRatioParam;
            if (Math.abs(aspectRatio - 1.0) < 0.001) {
                aspectRatioParam = 1; // square
            } else if (Math.abs(aspectRatio - 4.0/3.0) < 0.001) {
                aspectRatioParam = 4; // 4:3
            } else if (Math.abs(aspectRatio - 3.0/4.0) < 0.001) {
                aspectRatioParam = 43; // 3:4
            } else if (Math.abs(aspectRatio - 16.0/9.0) < 0.001) {
                aspectRatioParam = 16; // 16:9
            } else if (Math.abs(aspectRatio - 9.0/16.0) < 0.001) {
                aspectRatioParam = 169; // 9:16
            } else if (Math.abs(aspectRatio - 35.0/45.0) < 0.001) {
                aspectRatioParam = 778; // Passport ratio stored as integer (35/45 ≈ 0.778)
            } else {
                // For other ratios, just use a large value to indicate custom ratio
                aspectRatioParam = (int)(aspectRatio * 1000); 
            }
            
            Rect cropRect = calculateOptimalCrop(inputImage.size(), faceRect, aspectRatioParam);
            
            logger.info("Face detected at: " + faceRect.toString());
            logger.info("Optimal crop: " + cropRect.toString());

            return ResponseEntity.ok(Map.of(
                "cropData", Map.of(
                    "x", cropRect.x,
                    "y", cropRect.y,
                    "width", cropRect.width,
                    "height", cropRect.height
                ),
                "message", "Face detected and crop calculated"
            ));
        } catch (Exception e) {
            logger.error("Error detecting face", e);
            return ResponseEntity.internalServerError().body(Map.of("error", "Face detection failed: " + e.getMessage()));
        }
    }

}