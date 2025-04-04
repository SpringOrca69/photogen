package com.example.photogen.controller;

import java.util.Base64;
import java.util.Map;
import java.util.UUID;

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
@RequestMapping("/api/clothes-replacement")
public class ClothesReplacementController {

    private static final Logger logger = LoggerFactory.getLogger(BackgroundRemovalController.class);

    static {
        System.loadLibrary(Core.NATIVE_LIBRARY_NAME);
    }

    @PostMapping("/replace")
    public ResponseEntity<?> replaceClothes(@RequestBody Map<String, String> payload) {
        try {
            if (!payload.containsKey("image") || !payload.containsKey("clothing")) {
                return ResponseEntity.badRequest().body(Map.of("error", "Missing required images in payload"));
            }

            String imageData = payload.get("image");
            String clothingImageData = payload.get("clothing");

            // Validate base64 image format
            if (!imageData.contains(",") || !clothingImageData.contains(",")) {
                return ResponseEntity.badRequest().body(Map.of("error", "Invalid image format"));
            }

            imageData = imageData.split(",")[1];
            clothingImageData = clothingImageData.split(",")[1];

            byte[] inputImageBytes;
            byte[] clothingImageBytes;

            try {
                inputImageBytes = Base64.getDecoder().decode(imageData);
                clothingImageBytes = Base64.getDecoder().decode(clothingImageData);
            } catch (IllegalArgumentException e) {
                logger.error("Base64 decoding failed: " + e.getMessage());
                return ResponseEntity.badRequest().body(Map.of("error", "Invalid base64 image data"));
            }

            Mat inputImage = Imgcodecs.imdecode(new MatOfByte(inputImageBytes), Imgcodecs.IMREAD_COLOR);
            if (inputImage.empty()) {
                logger.error("Failed to decode input image");
                return ResponseEntity.badRequest().body(Map.of("error", "Failed to decode input image"));
            }

            Mat formalImage = Imgcodecs.imdecode(new MatOfByte(clothingImageBytes), Imgcodecs.IMREAD_COLOR);
            if (formalImage.empty()) {
                logger.error("Failed to decode clothing image");
                return ResponseEntity.badRequest().body(Map.of("error", "Failed to decode clothing image"));
            }

            String dataUrl = processUserDrawing(inputImage, formalImage);

            return ResponseEntity.ok(Map.of(
                    "processedImageDataUrl", dataUrl,
                    "message", "Clothes replaced successfully"
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Face detection failed: " + e.getMessage()));
        } catch (Exception e) {
            logger.error("Processing failed: ", e);
            return ResponseEntity.internalServerError().body(Map.of(
                    "error", "Processing failed: " + e.getMessage(),
                    "details", e.getClass().getName()
            ));
        }
    }

    private String processUserDrawing(Mat drawnImage, Mat formalImage) {
        if (drawnImage.empty()) {
            throw new IllegalArgumentException("Empty image");
        }

        // Use the input image as the base for our result
        Mat result = drawnImage.clone();

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
        Mat resizedFormalImage = resizeImage(formalImage, result.width(), result.height());

        if (faceRect.height < 0.6 * drawnImage.height()) {
            Rect expandedFaceRect = expandFaceRegion(faceRect, drawnImage.size(), 2.4, 1.3);
            Rect clothesRect = clothesRegion(faceRect, drawnImage.size());
            Mat clothesImage = drawnImage.clone();

            // Only get the clothes mask
            Mat clothesForegroundMask = grabCut(clothesImage, clothesRect);

            // Remove existing clothes
            Mat backgroundPart = new Mat();
            result.copyTo(backgroundPart, clothesForegroundMask);
            Core.subtract(result, backgroundPart, result);

            // Add formal clothes
            Mat clothesPart = new Mat();
            resizedFormalImage.copyTo(clothesPart, clothesForegroundMask);
            Core.add(result, clothesPart, result);
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
        // Expand both horizontally and vertically
        int newWidth = (int) (faceRect.width * horizontalExpansion);
        int newX = Math.max(0, faceRect.x - (newWidth - faceRect.width) / 2) + 5;
        newWidth = Math.min(newWidth, (int) (imageSize.width - newX)) - 10;

        int newHeight = (int) (faceRect.height * verticalExpansion);
        int newY = Math.max(0, faceRect.y + faceRect.height / 2 - newHeight / 2) + 5;
        newHeight = Math.min(newHeight, (int) (imageSize.height - newY)) - 10;

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
