package com.example.photogen.controller;

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
    
    @PostMapping("/improved-detect-face")
    public ResponseEntity<?> detectFace(@RequestBody Map<String, Object> payload) {
        try {
            String imageData = (String) payload.get("image");
            double aspectRatio = payload.containsKey("aspectRatio") ? 
                Double.parseDouble(payload.get("aspectRatio").toString()) : 35.0/45.0;
                
            // Remove data URL prefix if present
            if (imageData.startsWith("data:")) {
                imageData = imageData.substring(imageData.indexOf(",") + 1);
            }
            
            // Decode base64 image
            byte[] imageBytes;
            try {
                imageBytes = Base64.getDecoder().decode(imageData);
            } catch (IllegalArgumentException e) {
                logger.error("Invalid base64 encoding: ", e);
                return ResponseEntity.badRequest().body(Map.of("error", "Invalid image data encoding"));
            }
            
            Mat image = Imgcodecs.imdecode(new MatOfByte(imageBytes), Imgcodecs.IMREAD_COLOR);
            
            if (image.empty()) {
                logger.error("Could not decode image data, returning error");
                return ResponseEntity.badRequest().body(Map.of("error", "Could not read image"));
            }
            
            Map<String, Object> cropData = detectFacesAndEyes(image, aspectRatio);
            
            return ResponseEntity.ok(Map.of("cropData", cropData));
            
        } catch (Exception e) {
            logger.error("Error in face detection: ", e);
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    private Map<String, Object> detectFacesAndEyes(Mat image, double aspectRatio) {
        Mat frameGray = new Mat();
        Imgproc.cvtColor(image, frameGray, Imgproc.COLOR_BGR2GRAY);
        Imgproc.equalizeHist(frameGray, frameGray);

        // Load face, eye and nose classifiers with proper path handling
        // Use URL.getFile() instead of getPath() to handle Windows paths properly
        CascadeClassifier faceCascade = new CascadeClassifier();
        CascadeClassifier eyesCascade = new CascadeClassifier();
        CascadeClassifier noseCascade = new CascadeClassifier();
        
        try {
            // Load classifiers from resources using classpath
            java.io.File faceCascadeFile = org.springframework.core.io.Resource.class.cast(
                new org.springframework.core.io.ClassPathResource("/haarcascade_frontalface_alt.xml")).getFile();
            java.io.File eyesCascadeFile = org.springframework.core.io.Resource.class.cast(
                new org.springframework.core.io.ClassPathResource("/haarcascade_eye_tree_eyeglasses.xml")).getFile();
            java.io.File noseCascadeFile = org.springframework.core.io.Resource.class.cast(
                new org.springframework.core.io.ClassPathResource("/haarcascade_mcs_nose.xml")).getFile();
            
            faceCascade.load(faceCascadeFile.getAbsolutePath());
            eyesCascade.load(eyesCascadeFile.getAbsolutePath());
            noseCascade.load(noseCascadeFile.getAbsolutePath());
        } catch (Exception e) {
            logger.error("Error loading cascade classifiers: ", e);
            
            // Fallback to the old method if the above fails
            String faceCascadePath = getClass().getResource("/haarcascade_frontalface_alt.xml").getPath();
            String eyesCascadePath = getClass().getResource("/haarcascade_eye_tree_eyeglasses.xml").getPath();
            String noseCascadePath = getClass().getResource("/haarcascade_mcs_nose.xml").getPath();
            
            // Fix Windows path issues
            if (faceCascadePath.contains(":") && faceCascadePath.startsWith("/")) {
                faceCascadePath = faceCascadePath.substring(1);
            }
            if (eyesCascadePath.contains(":") && eyesCascadePath.startsWith("/")) {
                eyesCascadePath = eyesCascadePath.substring(1);
            }
            if (noseCascadePath.contains(":") && noseCascadePath.startsWith("/")) {
                noseCascadePath = noseCascadePath.substring(1);
            }
            
            faceCascade = new CascadeClassifier(faceCascadePath);
            eyesCascade = new CascadeClassifier(eyesCascadePath);
            noseCascade = new CascadeClassifier(noseCascadePath);
        }
        
        if (faceCascade.empty() || eyesCascade.empty() || noseCascade.empty()) {
            throw new RuntimeException("Error loading cascade classifiers");
        }

        // Detect faces
        MatOfRect faces = new MatOfRect();
        faceCascade.detectMultiScale(
            frameGray, 
            faces, 
            1.1,  // Scale factor
            3,    // Min neighbors
            0,    // Flags
            new Size(30, 30), // Min size
            new Size()        // Max size
        );

        List<Rect> listOfFaces = faces.toList();
        if (listOfFaces.isEmpty()) {
            throw new RuntimeException("No faces detected");
        }

        // Find the largest face
        Rect largestFace = listOfFaces.get(0);
        for (Rect face : listOfFaces) {
            if (face.area() > largestFace.area()) {
                largestFace = face;
            }
        }

        // For the largest face, detect eyes
        Mat faceROI = frameGray.submat(largestFace);
        MatOfRect eyes = new MatOfRect();
        eyesCascade.detectMultiScale(faceROI, eyes);
        List<Rect> listOfEyes = eyes.toList();
        
        // For the largest face, detect nose with improved parameters for better detection
        MatOfRect noses = new MatOfRect();
        noseCascade.detectMultiScale(
            faceROI, 
            noses,
            1.1,  // Use slightly lower scale factor for better nose detection
            3,    // Min neighbors
            0,    // Flags
            new Size(10, 10), // Smaller min size for nose
            new Size(faceROI.width() / 2, faceROI.height() / 2) // Max size relative to face
        );
        List<Rect> listOfNoses = noses.toList();
        
        // Create a region that encompasses the face, eyes, and nose
        int minX = largestFace.x;
        int minY = largestFace.y;
        int maxX = largestFace.x + largestFace.width;
        int maxY = largestFace.y + largestFace.height;
        
        // Include eyes in the bounding box if detected
        Point eyesMidpoint = null;
        if (listOfEyes.size() >= 2) {
            // Find leftmost and rightmost eyes to ensure we include them all
            int leftmostEyeX = Integer.MAX_VALUE;
            int rightmostEyeX = 0;
            int topmostEyeY = Integer.MAX_VALUE;
            int bottommostEyeY = 0;
            
            double sumX = 0, sumY = 0;
            
            for (Rect eye : listOfEyes) {
                int eyeX = largestFace.x + eye.x;
                int eyeY = largestFace.y + eye.y;
                int eyeRight = eyeX + eye.width;
                int eyeBottom = eyeY + eye.height;
                
                leftmostEyeX = Math.min(leftmostEyeX, eyeX);
                rightmostEyeX = Math.max(rightmostEyeX, eyeRight);
                topmostEyeY = Math.min(topmostEyeY, eyeY);
                bottommostEyeY = Math.max(bottommostEyeY, eyeBottom);
                
                // Calculate center points for midpoint calculation
                sumX += (eyeX + eye.width / 2.0);
                sumY += (eyeY + eye.height / 2.0);
            }
            
            // Update bounding region to include eyes
            minX = Math.min(minX, leftmostEyeX);
            minY = Math.min(minY, topmostEyeY);
            maxX = Math.max(maxX, rightmostEyeX);
            maxY = Math.max(maxY, bottommostEyeY);
            
            // Calculate eyes midpoint (center between all detected eyes)
            eyesMidpoint = new Point(sumX / listOfEyes.size(), sumY / listOfEyes.size());
        }
        
        // Include nose in the bounding box if detected
        Point noseMidpoint = null;
        if (!listOfNoses.isEmpty()) {
            // Find the largest nose (most likely the actual nose)
            Rect largestNose = listOfNoses.get(0);
            for (Rect nose : listOfNoses) {
                if (nose.area() > largestNose.area()) {
                    largestNose = nose;
                }
            }
            
            int noseX = largestFace.x + largestNose.x;
            int noseY = largestFace.y + largestNose.y;
            int noseRight = noseX + largestNose.width;
            int noseBottom = noseY + largestNose.height;
            
            // Update bounding region to include nose
            minX = Math.min(minX, noseX);
            minY = Math.min(minY, noseY);
            maxX = Math.max(maxX, noseRight);
            maxY = Math.max(maxY, noseBottom);
            
            // Calculate nose midpoint
            noseMidpoint = new Point(
                noseX + largestNose.width / 2.0,
                noseY + largestNose.height / 2.0
            );
        } else {
            // If nose detection failed, estimate nose position based on face position
            // Typically the nose is located in the lower half of the upper 2/3 of the face
            noseMidpoint = new Point(
                largestFace.x + largestFace.width / 2.0,
                largestFace.y + (largestFace.height * 0.55)
            );
            logger.info("No nose detected, using estimated nose position");
        }
        
        // Get center of the face
        Point faceCenter = new Point(
            largestFace.x + largestFace.width / 2.0,
            largestFace.y + largestFace.height / 2.0
        );
        
        // Use a weighted approach to determine the anchor point, with increased weight on nose position
        // for better centering
        Point anchorPoint;
        
        if (eyesMidpoint != null) {
            // If we have both eyes and nose (or estimated nose), use a weighted average
            // with more weight on the nose for horizontal centering
            anchorPoint = new Point(
                (eyesMidpoint.x * 0.4) + (noseMidpoint.x * 0.6), // Increase nose weight horizontally
                (eyesMidpoint.y * 0.6) + (noseMidpoint.y * 0.4)  // Keep eyes weight higher for vertical
            );
        } else {
            // If we only have nose or face, use a weighted position between them
            anchorPoint = new Point(
                noseMidpoint.x,  // Use nose for horizontal centering
                (noseMidpoint.y * 0.7) + (faceCenter.y * 0.3)  // Weighted position vertically
            );
        }
        
        // For passport photos, calculate target dimensions
        // Ensure we include the entire face plus some space for hair and chin
        double targetHeight = largestFace.height * 2.2; // Increase multiplier for more margin
        double targetWidth = targetHeight * aspectRatio;
        
        // Position the crop box so that:
        // 1. The eyes are positioned at about 45-50% from the top of the image (standard for passport photos)
        // 2. The nose is always centered horizontally
        double eyePositionRatio = 0.45; // Eyes should be about 45% from the top of the crop box
        
        // Start by centering horizontally on the nose
        double cropCenterX = noseMidpoint.x;
        
        // Determine vertical position based on eyes and nose
        double cropCenterY;
        
        if (eyesMidpoint != null) {
            // Position so eyes are at the correct height
            cropCenterY = eyesMidpoint.y + (targetHeight * (0.5 - eyePositionRatio));
            
            // Ensure we include the nose by adjusting the crop box if needed
            if (cropCenterY + (targetHeight / 2.0) < noseMidpoint.y + (targetHeight * 0.1)) {
                // If nose would be too close to bottom, shift down to include it properly
                cropCenterY = noseMidpoint.y - (targetHeight * 0.35);
            }
        } else {
            // If no eyes detected, position based on nose and face
            cropCenterY = noseMidpoint.y - (targetHeight * 0.3); // Position nose lower in the frame
        }
        
        // Calculate top-left corner from center point
        double left = cropCenterX - (targetWidth / 2.0);
        double top = cropCenterY - (targetHeight / 2.0);
        
        // Ensure the crop box stays within the image boundaries
        if (left < 0) left = 0;
        if (top < 0) top = 0;
        if (left + targetWidth > image.width()) left = image.width() - targetWidth;
        if (top + targetHeight > image.height()) top = image.height() - targetHeight;
        
        // Final boundary check (in case image is smaller than target dimensions)
        if (left < 0) left = 0;
        if (top < 0) top = 0;
        if (left + targetWidth > image.width()) targetWidth = image.width() - left;
        if (top + targetHeight > image.height()) targetHeight = image.height() - top;
        
        // Build result data
        Map<String, Object> cropData = new HashMap<>();
        cropData.put("x", (int)left);
        cropData.put("y", (int)top);
        cropData.put("width", (int)targetWidth);
        cropData.put("height", (int)targetHeight);
        
        // For debugging, add feature points
        Map<String, Object> debugPoints = new HashMap<>();
        debugPoints.put("faceCenter", new double[] {faceCenter.x, faceCenter.y});
        if (eyesMidpoint != null) {
            debugPoints.put("eyesMidpoint", new double[] {eyesMidpoint.x, eyesMidpoint.y});
        }
        debugPoints.put("noseMidpoint", new double[] {noseMidpoint.x, noseMidpoint.y});
        cropData.put("debugPoints", debugPoints);
        
        return cropData;
    }
    
    public void detectAndDisplay(Mat frame, CascadeClassifier faceCascade, CascadeClassifier eyesCascade) {
        Mat frameGray = new Mat();
        Imgproc.cvtColor(frame, frameGray, Imgproc.COLOR_BGR2GRAY);
        Imgproc.equalizeHist(frameGray, frameGray);

        // -- Detect faces
        MatOfRect faces = new MatOfRect();
        faceCascade.detectMultiScale(frameGray, faces);

        List<Rect> listOfFaces = faces.toList();
        for (Rect face : listOfFaces) {
            Point center = new Point(face.x + face.width / 2, face.y + face.height / 2);
            Imgproc.ellipse(frame, center, new Size(face.width / 2, face.height / 2), 0, 0, 360,
                    new Scalar(255, 0, 255));

            Mat faceROI = frameGray.submat(face);

            // -- In each face, detect eyes
            MatOfRect eyes = new MatOfRect();
            eyesCascade.detectMultiScale(faceROI, eyes);

            List<Rect> listOfEyes = eyes.toList();
            for (Rect eye : listOfEyes) {
                Point eyeCenter = new Point(face.x + eye.x + eye.width / 2, face.y + eye.y + eye.height / 2);
                int radius = (int) Math.round((eye.width + eye.height) * 0.25);
                Imgproc.circle(frame, eyeCenter, radius, new Scalar(255, 0, 0), 4);
            }
        }
    }
}