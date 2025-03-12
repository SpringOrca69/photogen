package com.example.photogen.controller;

import java.util.Base64;
import java.util.Map;
import java.util.UUID;
import java.util.HashMap;

import org.opencv.core.Core;
import org.opencv.core.CvType;
import org.opencv.core.Mat;
import org.opencv.core.MatOfByte;
import org.opencv.core.MatOfRect;
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
    public ResponseEntity<?> removeBackground(@RequestBody Map<String, String> payload) {
        try {
            String backgroundColour = payload.getOrDefault("backgroundColour", "#FFFFFF");
            Double aspectRatio = payload.containsKey("aspectRatio") ? 
                Double.parseDouble(payload.get("aspectRatio")) : 35.0/45.0;

            String imageData = payload.get("image").split(",")[1];
            byte[] inputImageBytes = java.util.Base64.getDecoder().decode(imageData);
            Mat inputImage = Imgcodecs.imdecode(new MatOfByte(inputImageBytes), Imgcodecs.IMREAD_COLOR);
            
            Mat customBackground;
            if (payload.get("customBackground") != null) {
                String backgroundData = payload.get("customBackground").split(",")[1];
                byte[] backgroundImageBytes = java.util.Base64.getDecoder().decode(backgroundData);
                customBackground = Imgcodecs.imdecode(new MatOfByte(backgroundImageBytes), Imgcodecs.IMREAD_COLOR);
            } 
            else {
                customBackground = null;
            }

            // Detect face and calculate crop coordinates
            CascadeClassifier faceDetector = new CascadeClassifier(getClass().getResource("/haarcascade_frontalface_default.xml").getPath().substring(1));
            MatOfRect faceDetections = new MatOfRect();
            
            // First try detection with normal settings
            faceDetector.detectMultiScale(inputImage, faceDetections);
            
            // If no face detected, try with more aggressive settings
            if (faceDetections.empty()) {
                faceDetector.detectMultiScale(inputImage, faceDetections, 
                    1.1,  // scale factor (smaller = more detections)
                    3,    // min neighbors (smaller = more detections)
                    0,    // flags
                    new Size(30, 30), // min size
                    new Size());      // max size
            }
            
            if (faceDetections.empty()) {
                throw new IllegalArgumentException("No faces detected");
            }

            // Find the largest face
            Rect faceRect = faceDetections.toArray()[0];
            for (Rect rect : faceDetections.toArray()) {
                if (rect.area() > faceRect.area()) {
                    faceRect = rect;
                }
            }

            // Calculate dimensions based on aspect ratio
            int cropWidth, cropHeight;
            if (aspectRatio != null) {
                // For passport photos, we want enough space above the head
                // and down to include most of the upper body
                double faceHeightToTotalRatio = 0.5; // Face takes about 50% of photo height
                cropHeight = (int)(faceRect.height / faceHeightToTotalRatio);
                cropWidth = (int)(cropHeight * aspectRatio);
                
                // Ensure we don't exceed image dimensions
                cropHeight = Math.min(cropHeight, inputImage.height());
                cropWidth = Math.min(cropWidth, inputImage.width());
            } else {
                // Default to a reasonable size if no aspect ratio provided
                cropWidth = (int)(faceRect.width * 3.0);
                cropHeight = (int)(faceRect.height * 4.0);
            }

            // Calculate the crop box position centered on the face
            // For passport photos, center horizontally but position the face at about 1/3 from the top
            int x = Math.max(0, faceRect.x + faceRect.width/2 - cropWidth/2);
            int y = Math.max(0, faceRect.y + (int)(faceRect.height * 0.4) - cropHeight/3);
            
            // Ensure the crop box doesn't extend beyond the image boundaries
            if (x + cropWidth > inputImage.width()) {
                x = inputImage.width() - cropWidth;
            }
            if (y + cropHeight > inputImage.height()) {
                y = inputImage.height() - cropHeight;
            }
            
            // Ensure x and y are not negative
            x = Math.max(0, x);
            y = Math.max(0, y);

            // Prepare the response with both image data and crop coordinates
            Map<String, Object> response = new HashMap<>();
            response.put("cropData", Map.of(
                "x", x,
                "y", y,
                "width", cropWidth,
                "height", cropHeight
            ));
            
            // If requested, also process the image
            if (Boolean.parseBoolean(payload.getOrDefault("processImage", "false"))) {
                String dataUrl = processUserDrawing(inputImage, customBackground, backgroundColour);
                response.put("processedImageDataUrl", dataUrl);
            }
            
            response.put("message", "Face detected successfully");
            
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Face detection failed: " + e.getMessage()));
        } catch (Exception e) {
            logger.error("Processing failed", e);
            return ResponseEntity.internalServerError().body(Map.of("error", "Processing failed: " + e.getMessage()));
        }
    }

    private String processUserDrawing(Mat drawnImage, Mat customBackground, String backgroundColour) {
        if (drawnImage.empty()) {
            throw new IllegalArgumentException("Empty image");
        }

        if (customBackground != null && customBackground.empty()) {
            throw new IllegalArgumentException("Empty custom background image");
        }

        // Create a new Mat object to store the result depending on whether a custom background is provided
        Mat result;
        if (customBackground != null) {
            Mat resizedBackground = resizeImage(customBackground, drawnImage.width(), drawnImage.height());

            if (resizedBackground.width() != drawnImage.width() || resizedBackground.height() != drawnImage.height()) {
                throw new IllegalArgumentException("Custom background image size does not match original image size");
            }

            result = resizedBackground.clone();
        }
        else {
            result = new Mat(drawnImage.size(), drawnImage.type(), parseColor(backgroundColour));
        }

        CascadeClassifier faceDetector = new CascadeClassifier(getClass().getResource("/haarcascade_frontalface_default.xml").getPath().substring(1));
        MatOfRect faceDetections = new MatOfRect();
        faceDetector.detectMultiScale(drawnImage, faceDetections);
        
        if (faceDetections.empty()) {
            throw new IllegalArgumentException("No faces detected");
        }

        Rect faceRect = faceDetections.toArray()[0];
        for (Rect rect : faceDetections.toArray()) {
            if (rect.area() > faceRect.area()) {
                faceRect = rect;
            }
        }

        Mat faceImage = drawnImage.clone();
        Mat faceImageClone = faceImage.clone();
        
        if (faceRect.height < 0.6 * drawnImage.height()) {
            Rect expandedFaceRect = expandFaceRegion(faceRect, drawnImage.size(), 2.4, 1.3);
            Rect clothesRect = clothesRegion(faceRect, drawnImage.size());
            Mat clothesImage = drawnImage.clone();
            Mat clothesImageClone = clothesImage.clone();
            
            Mat faceForegroundMask = grabCut(faceImage, expandedFaceRect);
            faceImageClone.copyTo(result, faceForegroundMask);
            
            Mat clothesForegroundMask = grabCut(clothesImage, clothesRect);
            clothesImageClone.copyTo(result, clothesForegroundMask);
        } else {
            Rect expandedFaceRect = expandFaceRegion(faceRect, drawnImage.size(), 1.7, 1.2);
            Mat faceForegroundMask = grabCut(faceImage, expandedFaceRect);
            faceImageClone.copyTo(result, faceForegroundMask);
        }

        String uniqueFileName = UUID.randomUUID().toString() + ".jpg";
        String outputPath = "src/main/resources/processed/" + uniqueFileName;
        Imgcodecs.imwrite(outputPath, result);
        logger.info("Image saved at: " + outputPath);

        MatOfByte matOfByte = new MatOfByte();
        Imgcodecs.imencode(".jpg", result, matOfByte);
        byte[] byteArray = matOfByte.toArray();
        String base64Image = Base64.getEncoder().encodeToString(byteArray);

        String dataUrl = "data:image/jpeg;base64," + base64Image;

        return dataUrl;
    }

    private Rect expandFaceRegion(Rect faceRect, Size imageSize, double verticalExpansion, double horizontalExpansion) {
        // Calculate expanded dimensions
        int newWidth = (int) (faceRect.width * horizontalExpansion);
        int newHeight = (int) (faceRect.height * verticalExpansion);
        
        // Center the expanded rectangle on the face (important for centering)
        int newX = Math.max(0, faceRect.x + faceRect.width/2 - newWidth/2);
        int newY = Math.max(0, faceRect.y + faceRect.height/2 - newHeight/2);
        
        // Ensure the crop box doesn't extend beyond image boundaries
        newWidth = Math.min(newWidth, (int)(imageSize.width - newX));
        newHeight = Math.min(newHeight, (int)(imageSize.height - newY));
        
        // Create the expanded rectangle
        return new Rect(newX, newY, newWidth, newHeight);
    }

    private Rect clothesRegion(Rect faceRect, Size imageSize) {
        // Expand both horizontally and vertically
        double horizontalExpansion = 2.7;

        int newWidth = (int) (faceRect.width * horizontalExpansion);
        int newX = Math.max(0, faceRect.x - (newWidth - faceRect.width) / 2);
        newWidth = Math.min(newWidth, (int) (imageSize.width - newX));
        newWidth = Math.max(newWidth, 0);
    
        int newY = faceRect.y + faceRect.height - 20;
        int newHeight = (int) (imageSize.height - newY);
        newHeight = Math.max(newHeight, 0);
    
        return new Rect(newX, newY, newWidth, newHeight);
    }

    private Scalar parseColor(String colorString) {
        if (colorString.startsWith("#")) {
            // Handle hex color code
            String hex = colorString.substring(1); // Remove the #
            int r = Integer.parseInt(hex.substring(0, 2), 16);
            int g = Integer.parseInt(hex.substring(2, 4), 16);
            int b = Integer.parseInt(hex.substring(4, 6), 16);
            return new Scalar(b, g, r); // OpenCV uses BGR order
        } else {
            // Handle comma-separated format
            String[] rgb = colorString.split(",");
            return new Scalar(Double.parseDouble(rgb[2]), Double.parseDouble(rgb[1]), Double.parseDouble(rgb[0]));
        }
    }
    

    private Mat grabCut(Mat image, Rect rect) {
        Mat mask = new Mat(image.size(), CvType.CV_8UC1, new Scalar(Imgproc.GC_BGD));
        Imgproc.rectangle(mask, rect.tl(), rect.br(), new Scalar(Imgproc.GC_PR_FGD), -1);

        Mat imageClone = image.clone();
        Imgproc.rectangle(imageClone, rect.tl(), rect.br(), new Scalar(0, 255, 0), 3);
    
        Mat bgdModel = new Mat();
        Mat fgdModel = new Mat();
        int grabCutIterations = 50;
    
        Imgproc.grabCut(image, mask, rect, bgdModel, fgdModel, grabCutIterations, Imgproc.GC_INIT_WITH_MASK | Imgproc.GC_INIT_WITH_RECT);
    
        Mat foregroundMask = new Mat(mask.size(), CvType.CV_8UC1, new Scalar(0));
        Core.compare(mask, new Scalar(Imgproc.GC_PR_FGD), foregroundMask, Core.CMP_EQ);
    
        Mat fgdMask = new Mat(mask.size(), CvType.CV_8UC1, new Scalar(0));
        Core.compare(mask, new Scalar(Imgproc.GC_FGD), fgdMask, Core.CMP_EQ);
    
        Core.bitwise_or(foregroundMask, fgdMask, foregroundMask);

        int iterations = 2;
        int size = 5;
        for (int i = 0; i < iterations; i++) {
            Mat kernel = Imgproc.getStructuringElement(Imgproc.MORPH_ELLIPSE, new Size(size + i * 2, size + i * 2));
            Imgproc.morphologyEx(foregroundMask, foregroundMask, Imgproc.MORPH_CLOSE, kernel);
        }

        return foregroundMask;
    }

    private Mat resizeImage(Mat image, int width, int height) {
        Mat resizedImage = new Mat();
        Imgproc.resize(image, resizedImage, new Size(width, height), 0, 0, Imgproc.INTER_CUBIC);
        return resizedImage;
    }
}