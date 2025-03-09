package com.example.photogen.controller;

import java.util.ArrayList;
import java.util.Base64;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.opencv.core.Core;
import org.opencv.core.CvType;
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
            
            MatOfRect faceDetections = new MatOfRect();
            
            // Try with initial parameters
            faceDetector.detectMultiScale(
                inputImage, 
                faceDetections,
                1.1,    // Scale factor
                5,      // Min neighbors
                0,      // Flags
                new Size(30, 30),  // Min size
                new Size()         // Max size
            );
            
            // If no faces found, try with more lenient parameters
            if (faceDetections.empty()) {
                faceDetector.detectMultiScale(
                    inputImage, 
                    faceDetections,
                    1.2,    // More lenient scale factor
                    3,      // Fewer min neighbors
                    0,
                    new Size(20, 20),
                    new Size()
                );
            }
            
            if (faceDetections.empty()) {
                // No face detected, return original image with center coordinates
                logger.info("No faces detected, using center of image");
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

            // Find largest face
            Rect[] faces = faceDetections.toArray();
            if (faces.length == 0) {
                // Safety check - should not happen as we already checked faceDetections.empty()
                logger.warn("No faces in array despite non-empty MatOfRect");
                return ResponseEntity.ok(Map.of(
                    "cropData", Map.of(
                        "x", inputImage.width() / 4,
                        "y", inputImage.height() / 4,
                        "width", inputImage.width() / 2,
                        "height", inputImage.height() / 2
                    ),
                    "message", "Face detection issue, using default center crop"
                ));
            }
            
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
                // No face detected even with lenient parameters
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

            // Find largest face
            Rect[] faces = faceDetections.toArray();
            Rect faceRect = faces[0];
            for (Rect rect : faces) {
                if (rect.area() > faceRect.area()) {
                    faceRect = rect;
                }
            }
            
            // Calculate optimal crop area (centered on face)
            int aspectRatio = Integer.parseInt(payload.getOrDefault("aspectRatio", "1"));
            Rect cropRect = calculateOptimalCrop(inputImage.size(), faceRect, aspectRatio);
            
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

    private Rect calculateOptimalCrop(Size imageSize, Rect faceRect, int aspectRatio) {
        // Calculate center of face
        Point faceCenter = new Point(
            faceRect.x + faceRect.width / 2.0,
            faceRect.y + faceRect.height / 2.0
        );
        
        // Calculate crop dimensions based on aspect ratio
        // Make crop area 2x the size of the face to include surrounding context
        int cropSize = (int) Math.max(faceRect.width * 2.5, faceRect.height * 2.5);
        
        int cropWidth, cropHeight;
        if (aspectRatio == 1) { // 1:1 square
            cropWidth = cropHeight = cropSize;
        } else if (aspectRatio == 4) { // 4:3 or 3:4
            boolean isLandscape = imageSize.width > imageSize.height;
            if (isLandscape) {
                cropWidth = (int) (cropSize * (4.0 / 3.0));
                cropHeight = cropSize;
            } else {
                cropWidth = cropSize;
                cropHeight = (int) (cropSize * (4.0 / 3.0));
            }
        } else if (aspectRatio == 16) { // 16:9 or 9:16
            boolean isLandscape = imageSize.width > imageSize.height;
            if (isLandscape) {
                cropWidth = (int) (cropSize * (16.0 / 9.0));
                cropHeight = cropSize;
            } else {
                cropWidth = cropSize;
                cropHeight = (int) (cropSize * (16.0 / 9.0));
            }
        } else { // Free form, use image aspect ratio
            double imgAspect = imageSize.width / imageSize.height;
            if (imgAspect > 1) {
                cropWidth = (int) (cropSize * imgAspect);
                cropHeight = cropSize;
            } else {
                cropWidth = cropSize;
                cropHeight = (int) (cropSize / imgAspect);
            }
        }
        
        // Calculate crop rectangle, ensuring it stays within image bounds
        int cropX = (int) Math.max(0, faceCenter.x - cropWidth / 2);
        int cropY = (int) Math.max(0, faceCenter.y - cropHeight / 2);
        
        // Adjust if the crop goes beyond image bounds
        if (cropX + cropWidth > imageSize.width) {
            cropX = (int) (imageSize.width - cropWidth);
        }
        if (cropY + cropHeight > imageSize.height) {
            cropY = (int) (imageSize.height - cropHeight);
        }
        
        // Final safety check in case of overflows
        cropX = Math.max(0, cropX);
        cropY = Math.max(0, cropY);
        cropWidth = (int) Math.min(cropWidth, imageSize.width - cropX);
        cropHeight = (int) Math.min(cropHeight, imageSize.height - cropY);
        
        return new Rect(cropX, cropY, cropWidth, cropHeight);
    }
}